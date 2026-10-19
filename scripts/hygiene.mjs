/** Public allowlist and actual secret-value scan. Never prints matching content. */
import {readFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {root,configuration,SafeError,safeError} from './network.mjs';
const git=args=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});if(r.status!==0)throw new SafeError('GitHygieneCommandFailed');return r.stdout.trim();};
const allowed=p=>/^(?:\.github\/workflows\/check\.yml|\.env\.example|\.gitattributes|\.gitignore|README\.md|LICENSE|package(?:-lock)?\.json|requirements(?:-dev\.txt|\.lock)|gltest\.config\.yaml|contracts\/branch_cover\.py|tests\/(?:__init__\.py|conftest\.py|direct\/(?:__init__\.py|test_branchcover\.py)|fixtures\/odrl-context\.html)|scripts\/[a-z0-9_-]+\.(?:mjs|py)|docs\/(?:[A-Z][A-Z0-9_-]*\.md|evidence\/(?:local|studio-dev)\/[a-z0-9_-]+\.(?:json|txt|png)))$/.test(p);
async function main(){
 if(resolve(git(['rev-parse','--show-toplevel']))!==root)throw new SafeError('WrongProjectGitRoot');
 const tracked=git(['ls-files']).split('\n').filter(Boolean);
 const staged=git(['diff','--cached','--name-only']).split('\n').filter(Boolean);
 const historical=[...new Set(git(['log','--format=','--name-only','--all']).split('\n').filter(Boolean))];
 const paths=[...new Set([...tracked,...staged,...historical])];
 const disallowed=paths.filter(p=>!allowed(p));
 if(disallowed.length){console.log(JSON.stringify({disallowedPaths:disallowed}));throw new SafeError('PublicFileAllowlistFailed');}
 const config=await configuration(),secrets=Object.entries(config).filter(([k,v])=>/PRIVATE_KEY|SECRET|TOKEN|PASSWORD/.test(k)&&v.length>=16).flatMap(([,v])=>[v,v.startsWith('0x')?v.slice(2):v]);
 let scanned=0;
 for(const revision of git(['rev-list','--all']).split('\n').filter(Boolean)){
  for(const p of git(['ls-tree','-r','--name-only',revision]).split('\n').filter(Boolean)){
   const text=git(['show',revision+':'+p]);scanned++;
   if(secrets.some(s=>text.includes(s))||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))throw new SafeError('HistoricalSecretDetected');
  }
 }
 for(const p of tracked){const text=await readFile(resolve(root,p),'utf8');scanned++;if(secrets.some(s=>text.includes(s))||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))throw new SafeError('WorkingTreeSecretDetected');}
 for(const p of ['.env','.venv','.codex']){await access(resolve(root,p));git(['check-ignore',p]);}
 git(['diff','--check']);git(['diff','--cached','--check']);
 console.log(JSON.stringify({at:new Date().toISOString(),command:'node scripts/hygiene.mjs',gitRoot:root,trackedFiles:tracked.length,stagedFiles:staged,historicalPaths:historical.length,scannedBlobs:scanned,publicAllowlistPassed:true,actualSecretScanPassed:true,ignoredLocalFilesPresent:true,status:git(['status','--short'])}));
}
try{await main();}catch(e){console.log(JSON.stringify({hygieneStopped:safeError(e)}));process.exitCode=1;}
