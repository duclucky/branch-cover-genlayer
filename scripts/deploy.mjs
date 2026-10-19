/** Resumable deployment; a saved hash is reconciled before any further signing. */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,sourcePath,identity,actors,client,rpc,read,balance,gen,save,wait,verifyNetwork,SafeError,safeError,EXPLORER} from './network.mjs';
import {address,safeReceipt} from './receipt.mjs';
import {quoteDeploy} from './fees.mjs';
import {loadJournal,sendJournal} from './journal.mjs';
async function main(){
 const network=await verifyNetwork(),id=await identity();
 const existing=await loadJournal('deployment.json');
 if(existing){
  if(existing.sourceSha256!==id.sourceSha256||existing.chainId!==network.chainId)throw new SafeError('ActiveDeploymentIdentityMismatch');
  console.log(JSON.stringify({recovered:true,address:existing.address,hash:existing.hash,accounting:JSON.parse(await read(existing.address,'get_accounting'))}));return;
 }
 if(!process.argv.includes('--execute')){console.log(JSON.stringify({mode:'inspect',network,identity:id}));return;}
 const actor=(await actors())[0];
 const diff=spawnSync('git',['diff','HEAD','--','contracts/branch_cover.py'],{cwd:root,encoding:'utf8'});
 if(!id.sourceCommit||diff.status!==0||diff.stdout.trim())throw new SafeError('CommittedUnchangedSourceRequired');
 const smoke=await loadJournal('runtime-probe.json');
 const check=JSON.parse(await readFile(resolve(root,'.codex/last-check.json'),'utf8'));
 if(!smoke?.passed||smoke.identity.sourceSha256!==id.sourceSha256||check.exitCode!==0||check.sourceSha256!==id.sourceSha256)throw new SafeError('CurrentExactSourceChecksRequired');
 let attempt=await loadJournal('deployment-attempt.json');
 if(attempt&&attempt.sourceSha256!==id.sourceSha256)throw new SafeError('PreviousAttemptNeedsReconciliation');
 if(!attempt){
  const fees=await quoteDeploy(actor),code=await readFile(sourcePath,'utf8');
  attempt=await sendJournal('deployment-attempt.json',{...id,operation:'deploy',actor:actor.address,valueGEN:'0',feeDepositGEN:gen(fees.feeValue)},()=>client(actor).deployContract({code,args:[],fees}));
 }
 const tx=await wait(attempt.hash,state=>console.log(JSON.stringify({hash:attempt.hash,...state})));
 let target;
 for(const candidate of [tx.contract_address,tx.contractAddress,tx.data?.contract_address,tx.to_address,tx.recipient,tx.to]){
  if(!address(candidate)||candidate.toLowerCase()===actor.address.toLowerCase())continue;
  try{const schema=await rpc('gen_getContractSchema',[candidate]);if(schema?.methods?.get_accounting){target=candidate;break;}}catch{}
 }
 if(!target)throw new SafeError('DeploymentAddressUnproven');
 const schema=await rpc('gen_getContractSchema',[target]);
 const code=await client().getContractCode(target);
 if(code!==await readFile(sourcePath,'utf8')||Object.keys(schema.methods??{}).length!==20)throw new SafeError('DeployedCodeOrSchemaMismatch');
 const accounting=JSON.parse(await read(target,'get_accounting'));
 if(!accounting.invariant||['received','locked','credits','withdrawn'].some(k=>accounting[k]!=='0 GEN')||await balance(target)!==0n)throw new SafeError('DeploymentAccountingNotEmpty');
 const deployment={...attempt,address:target,status:'FINALIZED',executionResult:'SUCCESS',finalizedObservedAt:new Date().toISOString(),explorer:EXPLORER+'/address/'+target,transactionExplorer:EXPLORER+'/transactions/'+attempt.hash,methods:Object.keys(schema.methods).sort(),accounting,nativeBalanceGEN:'0',receipt:safeReceipt(tx)};
 await save('deployment.json',deployment);await save('deployment-attempt.json',{...attempt,status:'FINALIZED'});
 console.log(JSON.stringify(deployment));
}
try{await main();}catch(e){console.log(JSON.stringify({deployStopped:safeError(e)}));process.exitCode=1;}
