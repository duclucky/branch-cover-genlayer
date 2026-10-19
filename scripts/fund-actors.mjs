/** Exactly the two owner-approved 1 GEN transfers. Hash before broadcast. */
import {parseUnits} from 'viem';
import {actors,balance,gen,client,verifyNetwork,save,SafeError,safeError,rpc} from './network.mjs';
import {sendJournal,loadJournal,nativeReceipt} from './journal.mjs';
const GEN=10n**18n;
async function main(){
 const network=await verifyNetwork(),accounts=await actors(),source=accounts[0];
 if(!process.argv.includes('--execute')){console.log(JSON.stringify({mode:'inspect',network,roles:accounts.map(a=>a.address),fundingGEN:'1 per beneficiary, 2 total'}));return;}
 for(let i=1;i<=2;i++){
  const recipient=accounts[i],name='funding-beneficiary'+(i-1)+'.json';
  let record=await loadJournal(name);
  if(record&&(record.to.toLowerCase()!==recipient.address.toLowerCase()||record.valueGEN!=='1'))throw new SafeError('FundingJournalIdentityMismatch');
  if(record?.status==='CONFIRMED_NATIVE'){console.log(JSON.stringify({recovered:true,hash:record.hash,to:recipient.address,valueGEN:'1'}));continue;}
  if(!record){
   const sourceBalance=await balance(source.address),recipientBalance=await balance(recipient.address);
   if(sourceBalance<5n*GEN||recipientBalance!==0n)throw new SafeError('FundingPreflightNeedsInspection');
   record=await sendJournal(name,{...network,operation:'fund beneficiary'+(i-1),from:source.address,to:recipient.address,valueGEN:'1',before:{sourceGEN:gen(sourceBalance),recipientGEN:gen(recipientBalance)}},()=>client(source).transfer({to:recipient.address,value:GEN}));
  }
  const receipt=await nativeReceipt(record.hash),tx=await rpc('eth_getTransactionByHash',[record.hash]);
  if(receipt.from?.toLowerCase()!==source.address.toLowerCase()||receipt.to?.toLowerCase()!==recipient.address.toLowerCase()||BigInt(tx.value)!==GEN)throw new SafeError('FundingReceiptIdentityMismatch');
  let sourceAfter,recipientAfter,proved=false;
  for(let poll=0;poll<20;poll++){
   sourceAfter=await balance(source.address);recipientAfter=await balance(recipient.address);
   proved=recipientAfter===parseUnits(record.before.recipientGEN,18)+GEN&&sourceAfter<=parseUnits(record.before.sourceGEN,18)-GEN;
   if(proved)break;
   await new Promise(r=>setTimeout(r,1000));
  }
  if(!proved)throw new SafeError('FundingBalanceProofFailed');
  Object.assign(record,{status:'CONFIRMED_NATIVE',confirmedObservedAt:new Date().toISOString(),after:{sourceGEN:gen(sourceAfter),recipientGEN:gen(recipientAfter)},recipientIncreaseGEN:'1',receipt:{status:receipt.status,transactionHash:receipt.transactionHash,blockNumber:receipt.blockNumber,from:receipt.from,to:receipt.to}});
  await save(name,record);console.log(JSON.stringify(record));
 }
}
try{await main();}catch(e){console.log(JSON.stringify({fundingStopped:safeError(e)}));process.exitCode=1;}
