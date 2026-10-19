/** Explicit owner authorization required. Never prints key material. */
import {appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {root,configuration,actors,save,safeError,SafeError} from './network.mjs';
async function main(){
 if(!process.argv.includes('--execute'))throw new SafeError('ExplicitCreateActorsExecutionRequired');
 const ignored=spawnSync('git',['check-ignore','--quiet','.env'],{cwd:root});
 if(ignored.status!==0)throw new SafeError('IgnoredProjectEnvRequired');
 const config=await configuration();const additions=[];
 for(const name of ['BRANCHCOVER_BENEFICIARY0_PRIVATE_KEY','BRANCHCOVER_BENEFICIARY1_PRIVATE_KEY']){
  if(!config[name])additions.push(name+'='+generatePrivateKey());
  else if(!/^0x[0-9a-fA-F]{64}$/.test(config[name]))throw new SafeError('ExistingRoleKeyMalformed');
 }
 if(additions.length)await appendFile(resolve(root,'.env'),'\n'+additions.join('\n')+'\n',{encoding:'utf8',mode:0o600});
 const accounts=await actors();
 const record={at:new Date().toISOString(),authorization:'Owner approved two demo EOAs and 1 GEN funding per EOA in this task.',projectEnvIgnored:true,createdRoles:additions.length,roles:accounts.map((a,i)=>({role:['funder','beneficiary0','beneficiary1'][i],address:a.address})),secretsLogged:false};
 await save('authorized-demo-roles.json',record);console.log(JSON.stringify(record));
}
try{await main();}catch(e){console.log(JSON.stringify({stopped:safeError(e)}));process.exitCode=1;}
