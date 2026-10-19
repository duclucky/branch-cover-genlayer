import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const windows=process.platform==='win32';
const python=windows?'.venv/Scripts/python.exe':'.venv/bin/python';
if(!existsSync(python))throw Error('Project Python 3.12 virtual environment required');
for(const file of readdirSync('scripts').filter(x=>x.endsWith('.mjs'))){
 const r=spawnSync(process.execPath,['--check','scripts/'+file],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status??1);
}
const tests=readdirSync('scripts').filter(x=>x.endsWith('.test.mjs')).map(x=>'scripts/'+x);
const steps=[[python,['scripts/genvm_lint_rc.py','check','contracts/branch_cover.py']],
 [windows?'.venv/Scripts/gltest.exe':'.venv/bin/gltest',['tests/']]];
if(tests.length)steps.push([process.execPath,['--test',...tests]]);
for(const [command,args] of steps){
 const r=spawnSync(command,args,{stdio:'inherit',env:{...process.env,PYTHONUTF8:'1'},windowsHide:true});
 if(r.error)throw r.error;
 if(r.status!==0)process.exit(r.status??1);
}
mkdirSync('.codex',{recursive:true});
const proof={at:new Date().toISOString(),command:'npm run check',exitCode:0,sourceSha256:createHash('sha256').update(readFileSync('contracts/branch_cover.py')).digest('hex')};
writeFileSync('.codex/last-check.json',JSON.stringify(proof,null,2)+'\n');
console.log('BRANCHCOVER_CHECK_PASS: recognized contract + gltest safety/semantic/metadata tests + script tests.');
