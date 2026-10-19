/** Fresh read-only reconciliation. Prints only explicitly allowed public fields. */
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseUnits} from 'viem';
import {evidence,sourcePath,sha,rpc,client,read,balance,gen,transaction,verifyNetwork,save,SafeError,safeError} from './network.mjs';
import {loadJournal} from './journal.mjs';
import {receiptState} from './receipt.mjs';
import {externalDeliveryProof} from './external-delivery.mjs';
async function main(){
 const network=await verifyNetwork(),deployment=await loadJournal('deployment.json');
 if(!deployment)throw new SafeError('DeploymentRequired');
 const target=deployment.address;
 const code=await client().getContractCode(target),local=await readFile(sourcePath,'utf8');
 const schema=await rpc('gen_getContractSchema',[target]);
 if(code!==local||sha(code)!==deployment.sourceSha256||Object.keys(schema.methods??{}).length!==20)throw new SafeError('FreshCodeSchemaMismatch');
 if(!receiptState(await transaction(deployment.hash)).successful)throw new SafeError('DeployResultNotSuccess');
 const final=await loadJournal('lifecycle-final-state.json');
 if(!final?.fullLifecyclePassed||final.target.toLowerCase()!==target.toLowerCase())throw new SafeError('CompletedLifecycleRequired');
 const books=[];
 for(const previous of final.books){
  const b=JSON.parse(await read(target,'get_book',[previous.id]));
  if(b.phase!=='CLOSED'||b.locked!=='0 GEN'||b.credits!=='0 GEN'||b.received!==b.withdrawn)throw new SafeError('BookNotZeroLiability');
  books.push(b);
 }
 const operations=[],deliveries=[],semantics=[];
 const names=(await readdir(evidence)).sort();
 for(const name of names.filter(x=>/^lifecycle-.+\.json$/.test(x)&&x!=='lifecycle-final-state.json')){
  const record=await loadJournal(name);
  if(!record.verified||!record.hash||record.target.toLowerCase()!==target.toLowerCase())throw new SafeError('OperationJournalIncomplete');
  const tx=await transaction(record.hash),state=receiptState(tx);
  if(state.status!=='FINALIZED'||state.successful!==record.expectedSuccess)throw new SafeError('OperationOutcomeMismatch');
  if((tx.from_address??tx.sender)?.toLowerCase()!==record.actor.toLowerCase())throw new SafeError('RuntimeActorMismatch');
  operations.push({file:name,operation:record.operation,hash:record.hash,expectedSuccess:record.expectedSuccess,...state});
 }
 for(const name of names.filter(x=>/^delivery-.+\.json$/.test(x))){
  const p=await loadJournal(name),message=externalDeliveryProof(await transaction(p.parentHash),p.recipient,p.expectedTransferGEN);
  if(!p.balanceProven||parseUnits(p.contractBeforeGEN,18)-parseUnits(p.contractAfterGEN,18)!==parseUnits(p.expectedTransferGEN,18)||!message.messageValueDelivered)throw new SafeError('DeliveryProofMismatch');
  deliveries.push({file:name,parentHash:p.parentHash,recipient:p.recipient,valueGEN:p.expectedTransferGEN,exactNativeDecrease:true,externalMessageDelivered:true});
 }
 for(const kind of ['expiry','unclear','main','joint']){
  const s=await loadJournal('semantic-'+kind+'.json'),j=await loadJournal('lifecycle-'+kind+'-compile.json');
  if(!s||s.attempt.stage!=='OK')throw new SafeError('SemanticProofMissing');
  const tx=await transaction(j.hash),raw=tx.consensus_data?.leader_receipt;
  const rows=Array.isArray(raw)?raw:raw?[raw]:[];
  const successfulValidators=rows.filter(x=>x.mode==='validator'&&x.vote==='agree'&&x.execution_result==='SUCCESS').length;
  if(!receiptState(tx).successful||successfulValidators<1)throw new SafeError('IndependentValidatorExecutionNotProven');
  const votes={agree:0,disagree:0,idle:0,other:0};
  for(const value of Object.values(tx.consensus_data?.votes??{})){const v=String(value).toLowerCase();votes[Object.hasOwn(votes,v)?v:'other']++;}
  semantics.push({case:kind,hash:j.hash,stage:s.attempt.stage,cells:s.attempt.cells,successfulIndependentValidators:successfulValidators,votes,phaseAfterReview:s.book.phase});
 }
 const accounting=JSON.parse(await read(target,'get_accounting')),native=gen(await balance(target));
 const delivered=deliveries.reduce((sum,d)=>sum+parseUnits(d.valueGEN,18),0n);
 if(books.length!==5||deliveries.length!==7||delivered!==13n*10n**18n||accounting.received!=='13 GEN'||accounting.withdrawn!=='13 GEN'||accounting.locked!=='0 GEN'||accounting.credits!=='0 GEN'||!accounting.invariant||native!=='0')throw new SafeError('GlobalAccountingOrExitCoverageMismatch');
 const record={at:new Date().toISOString(),command:'node scripts/audit.mjs',...network,target,sourceSha256:sha(code),codeMatchesDeployment:true,recognizedMethods:20,deploymentResult:'SUCCESS',books,operations,semantics,deliveries,accounting,nativeContractGEN:native,passed:true};
 await save('lifecycle-audit.json',record);console.log('Result: SUCCESS');console.log(JSON.stringify({auditPassed:true,books:books.length,operations:operations.length,semanticReviews:semantics.length,independentValidatorExecution:true,exactNativeExits:deliveries.length,totalWithdrawnGEN:'13',accounting,nativeContractGEN:native}));
}
try{await main();}catch(e){console.log(JSON.stringify({auditStopped:safeError(e)}));process.exitCode=1;}
