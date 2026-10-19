/** Five independent books, real finality, recovery, exact native exits. */
import {parseUnits} from 'viem';
import {actors,client,read,balance,gen,save,verifyNetwork,identity,transaction,SafeError,safeError,EXPLORER} from './network.mjs';
import {receiptState,safeReceipt} from './receipt.mjs';
import {loadJournal,sendJournal} from './journal.mjs';
import {quoteWrite} from './fees.mjs';
import {externalDeliveryProof} from './external-delivery.mjs';
import {contractArgs} from './contract-args.mjs';
const GEN=10n**18n;
const triggers=['The selected branch requires reading records from the private internal archive.','The selected branch requires publishing a report outside the workspace.'];
const branches=['Read records from the private internal archive only. Do not publish any report outside the workspace.','Publish an already-prepared report outside the workspace. Do not read any records from the private internal archive.','Read records from the private internal archive and publish a report based on those records outside the workspace.'];
const base=['TRIGGERED','NOT_TRIGGERED','TRIGGERED','NOT_TRIGGERED','TRIGGERED','TRIGGERED'];
const ids={main:'archive-pruned-v1',joint:'archive-joint-v1',expiry:'archive-no-choice-v1',partial:'archive-partial-v1',unclear:'archive-unclear-v1'};
const sleep=n=>new Promise(r=>setTimeout(r,n));
async function main(){
 const network=await verifyNetwork(),deployment=await loadJournal('deployment.json');
 if(deployment?.status!=='FINALIZED'||deployment.executionResult!=='SUCCESS')throw new SafeError('SuccessfulFinalizedDeploymentRequired');
 const target=deployment.address,accounts=await actors(),sourceIdentity=await identity();
 if(deployment.sourceSha256!==sourceIdentity.sourceSha256)throw new SafeError('DeploymentSourceMismatch');
 const book=id=>read(target,'get_book',[id]).then(JSON.parse);
 const accounting=()=>read(target,'get_accounting').then(JSON.parse);
 async function snapshot(id,absent=false,recipient){
  return {observedAt:new Date().toISOString(),book:absent?null:await book(id),accounting:await accounting(),nativeContractGEN:gen(await balance(target)),...recipient?{recipient:recipient.address,recipientBalanceGEN:gen(await balance(recipient.address)),ownCredit:await read(target,'get_credit',[id,recipient.address])}:{}};
 }
 if(!process.argv.includes('--execute')){console.log(JSON.stringify({mode:'inspect',network,target,ids,accounting:await accounting()}));return;}
 const smoke=await loadJournal('caller-spoof-smoke.json');
 if(!smoke?.passed||smoke.target?.toLowerCase()!==target.toLowerCase())throw new SafeError('BoundedAuthoritySmokeRequired');
 async function outcome(hash){
  let last='';
  for(let i=0;i<180;i++){
   const tx=await transaction(hash),state=receiptState(tx);
   if(state.status!==last){console.log(JSON.stringify({hash,...state}));last=state.status;}
   if(state.status==='FINALIZED')return tx;
   if(['UNDETERMINED','CANCELED','LEADER_TIMEOUT','VALIDATORS_TIMEOUT'].includes(state.status))throw new SafeError('ConsensusRequiresInspection');
   await sleep(6000);
  }
  throw new SafeError('TransactionStillPending');
 }
 async function write(key,actor,functionName,args,value=0n,success=true){
  const name='lifecycle-'+key+'.json',id=args[0],recipient=functionName==='withdraw_credit'?actor:undefined;
  let record=await loadJournal(name);
  if(record&&(record.target?.toLowerCase()!==target.toLowerCase()||record.actor?.toLowerCase()!==actor.address.toLowerCase()||record.operation!==functionName||JSON.stringify(record.args)!==JSON.stringify(args)||record.valueGEN!==gen(value)))throw new SafeError('JournalIdentityMismatch');
  if(record?.verified){console.log(JSON.stringify({recovered:true,operation:functionName,hash:record.hash}));return record;}
  if(!record){
   console.log(JSON.stringify({preparing:key,step:'canonical snapshot'}));
   const before=await snapshot(id,functionName==='create_book',recipient);
   console.log(JSON.stringify({preparing:key,step:'bounded fee quote'}));
   const fees=success?await quoteWrite(actor,target,functionName,args,value):await client(actor).estimateTransactionFees();
   if(fees.feeValue<=0n||fees.feeValue>=GEN)throw new SafeError('DemoFeeOutsideBound');
   record=await sendJournal(name,{...network,identity:sourceIdentity,target,operation:functionName,actor:actor.address,args,valueGEN:gen(value),feeDepositGEN:gen(fees.feeValue),expectedSuccess:success,before},()=>client(actor).writeContract({address:target,functionName,args:contractArgs(functionName,args),value,fees}));
  }
  const tx=await outcome(record.hash),state=receiptState(tx);
  const native=await import('./journal.mjs');await native.nativeReceipt(record.hash);
  if(state.successful!==success||(!success&&state.execution!=='ERROR'))throw new SafeError('UnexpectedExecutionOutcome');
  record.after=await snapshot(id,false,recipient);record.receipt=safeReceipt(tx);
  if(!success&&JSON.stringify([record.before.book,record.before.accounting,record.before.nativeContractGEN])!==JSON.stringify([record.after.book,record.after.accounting,record.after.nativeContractGEN]))throw new SafeError('RejectedWriteChangedCanonicalState');
  Object.assign(record,{status:'FINALIZED',executionResult:state.execution,finalizedObservedAt:new Date().toISOString(),explorer:EXPLORER+'/transactions/'+record.hash,verified:true});
  await save(name,record);console.log(JSON.stringify({operation:functionName,hash:record.hash,status:state.status,execution:state.execution,phase:record.after.book.phase,accounting:record.after.accounting}));return record;
 }
 async function create(kind,face,reviewSeconds,choiceSeconds){
  const key=kind+'-create',old=await loadJournal('lifecycle-'+key+'.json');
  const now=Math.floor(Date.now()/1000),id=ids[kind];
  const selectedBranches=kind==='unclear'?['Carry out all mandatory archive operations from specification ABSENT-SPEC. It may require or prohibit reading archive records. Do not publish any report outside the workspace.',branches[1],branches[2]]:branches;
  const args=old?.args??[id,accounts[1].address,accounts[2].address,accounts[0].address,...triggers,face,face,...selectedBranches,now+reviewSeconds,now+choiceSeconds];
  await write(key,accounts[0],'create_book',args,kind==='partial'?GEN:2n*GEN);return book(id);
 }
 async function ratify(kind){
  const b=await book(ids[kind]);
  for(let i=1;i<=2;i++)await write(kind+'-ratify'+i,accounts[i],'ratify',[b.id,b.definition_digest]);
 }
 async function compile(kind,unclear=false){
  const id=ids[kind];await write(kind+'-compile',accounts[0],'compile_book',[id]);
  const prior=await loadJournal('semantic-'+kind+'.json');
  if(prior){
   const current=await book(id);
   if(prior.book.id!==id||prior.book.definition_digest!==current.definition_digest)throw new SafeError('SavedSemanticIdentityMismatch');
   return;
  }
  const b=await book(id),attempt=JSON.parse(await read(target,'get_attempt',[id,b.attempts]));
  const observation={checkedAt:new Date().toISOString(),book:b,attempt,margin:JSON.parse(await read(target,'get_margin',[id]))};
  if(unclear){if(b.phase!=='RETRYABLE'||attempt.stage!=='OK'||attempt.cells[0].class!=='UNCLEAR'||b.credits!=='0 GEN')throw new SafeError('UnclearMeaningDidNotPreserveReserve');}
  else{
   const matrix=JSON.parse(await read(target,'get_matrix',[id]));
   if(b.phase!=='COMPILED'||JSON.stringify(matrix.cells.map(c=>c.class))!==JSON.stringify(base))throw new SafeError('CompiledMeaningNeedsInspection');
   observation.matrix=matrix;
  }
  await save('semantic-'+kind+'.json',observation);
 }
 async function withdraw(key,actor,id,amount){
  const record=await write(key,actor,'withdraw_credit',[id,amount]),proofName='delivery-'+key+'.json';
  const old=await loadJournal(proofName);
  if(old){if(old.parentHash!==record.hash||!old.balanceProven||!old.externalReceipt?.messageValueDelivered)throw new SafeError('SavedDeliveryNeedsInspection');return;}
  const expected=parseUnits(record.before.nativeContractGEN,18)-BigInt(amount)*GEN;
  for(let i=0;i<40&&await balance(target)!==expected;i++)await sleep(3000);
  const after=await snapshot(id,false,actor),parent=await transaction(record.hash);
  const increase=parseUnits(after.recipientBalanceGEN,18)-parseUnits(record.before.recipientBalanceGEN,18);
  const proof={parentHash:record.hash,recipient:actor.address,expectedTransferGEN:String(amount),contractBeforeGEN:record.before.nativeContractGEN,contractAfterGEN:after.nativeContractGEN,recipientBeforeGEN:record.before.recipientBalanceGEN,recipientAfterGEN:after.recipientBalanceGEN,recipientNetIncreaseGEN:gen(increase),feeDepositGEN:record.feeDepositGEN,creditAfter:after.ownCredit,checkedAt:new Date().toISOString(),externalReceipt:externalDeliveryProof(parent,actor.address,String(amount)),note:'Recipient net increase includes own fee charges/refunds; exact delivered value and recipient are independently proven by the external EVM execution receipt.'};
  proof.balanceProven=parseUnits(proof.contractBeforeGEN,18)-parseUnits(proof.contractAfterGEN,18)===BigInt(amount)*GEN&&increase>=BigInt(amount)*GEN-parseUnits(record.feeDepositGEN,18);
  await save(proofName,proof);if(!proof.balanceProven)throw new SafeError('ExactNativeDeliveryNotProven');
  console.log(JSON.stringify({delivery:key,parentHash:record.hash,contractDecreaseGEN:String(amount),recipient:actor.address,balanceProven:true}));
 }
 async function timeout(kind){
  let b=await book(ids[kind]);
  const deadline=b.phase==='COMPILED'?b.choice_deadline:b.review_deadline;
  while(Date.now()<deadline*1000){const remaining=deadline*1000-Date.now();console.log(JSON.stringify({waitingFor:kind+' expiry',seconds:Math.ceil(remaining/1000)}));await sleep(Math.min(30000,remaining));}
  await write(kind+'-recover',accounts[1],'recover',[b.id]);
  for(let n=0;n<2;n++){
   const credit=await read(target,'get_credit',[b.id,accounts[0].address]);
   if(credit==='0 GEN')break;
   const amount=Math.min(2,Number(credit.split(' ')[0]));await withdraw(kind+'-refund'+n,accounts[0],b.id,amount);
  }
  await write(kind+'-close',accounts[0],'close_book',[b.id]);
 }
 const mode=process.argv.find(a=>a.startsWith('--case='))?.slice(7)??'all';
 if(mode==='all'||mode==='recovery-prepare'){
  await create('expiry',1,300,600);await ratify('expiry');await compile('expiry');
  await create('partial',2,90,180);
  await create('unclear',1,300,600);await ratify('unclear');await compile('unclear',true);
 }
 if(mode==='all'||mode==='main'){
  const b=await create('main',2,1800,3600);await write('main-topup',accounts[0],'top_up',[b.id],2n*GEN);await ratify('main');await compile('main');
  await write('main-prune',accounts[0],'prune_branches',[b.id,3]);
  await withdraw('main-surplus',accounts[0],b.id,2);
  await write('main-regrowth-rejected',accounts[0],'prune_branches',[b.id,7],0n,false);
  await write('main-choice',accounts[0],'choose_branch',[b.id,'B0']);
  await write('main-duplicate-choice-rejected',accounts[0],'choose_branch',[b.id,'B0'],0n,false);
  await withdraw('main-payee',accounts[1],b.id,2);
  await write('main-close',accounts[0],'close_book',[b.id]);
 }
 if(mode==='all'||mode==='joint'){
  const b=await create('joint',2,1800,3600);await write('joint-topup',accounts[0],'top_up',[b.id],2n*GEN);await ratify('joint');await compile('joint');
  await write('joint-choice',accounts[0],'choose_branch',[b.id,'B2']);
  await withdraw('joint-payee0',accounts[1],b.id,2);await withdraw('joint-payee1',accounts[2],b.id,2);
  await write('joint-close',accounts[0],'close_book',[b.id]);
 }
 if(mode==='all'||mode==='recovery-finish')for(const kind of ['partial','unclear','expiry'])await timeout(kind);
 if(!['all','main','joint','recovery-prepare','recovery-finish'].includes(mode))throw new SafeError('UnknownDemoCase');
 const books=[];for(const id of Object.values(ids)){try{books.push(await book(id));}catch{if(mode==='all')throw new SafeError('ExpectedBookMissing');}}
 const final={...network,target,checkedAt:new Date().toISOString(),books,accounting:await accounting(),nativeContractGEN:gen(await balance(target))};
 if(mode==='all'||mode==='recovery-finish'){
  if(books.length!==5||books.some(b=>b.phase!=='CLOSED')||final.accounting.locked!=='0 GEN'||final.accounting.credits!=='0 GEN'||!final.accounting.invariant||final.nativeContractGEN!=='0')throw new SafeError('FinalZeroLiabilityRequired');
  final.fullLifecyclePassed=true;
 }
 await save('lifecycle-final-state.json',final);console.log(JSON.stringify(final));
}
try{await main();}catch(e){console.log(JSON.stringify({lifecycleStopped:safeError(e)}));process.exitCode=1;}
