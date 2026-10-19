/** Bounded, zero application-value caller-spoof tripwire on our own deployment. */
import {encodeFunctionData} from 'viem';
import {abi} from 'genlayer-js';
import {actors,client,chain,rpc,read,balance,gen,save,verifyNetwork,SafeError,safeError} from './network.mjs';
import {loadJournal,sendJournal} from './journal.mjs';
import {receiptState} from './receipt.mjs';
async function main(){
 const deployment=await loadJournal('deployment.json');const accounts=await actors();const network=await verifyNetwork();
 const target=deployment.address;const before={accounting:JSON.parse(await read(target,'get_accounting')),nativeGEN:gen(await balance(target))};
 if(!process.argv.includes('--execute')){console.log(JSON.stringify({mode:'inspect',...network,target,operation:'Own-contract caller-spoof tripwire; zero application value.',before}));return;}
 const actual=accounts[1],claimed=accounts[0];const fees=await client(actual).estimateTransactionFees();
 if(fees.feeValue<=0n||fees.feeValue>=10n**18n)throw new SafeError('BoundedSmokeFeeRequired');
 const data=abi.transactions.serialize([abi.calldata.encode(abi.calldata.makeCalldataObject('withdraw_credit',['smoke-absent',1])),false]);
 const encoded=encodeFunctionData({abi:chain.consensusMainContract.abi,functionName:'addTransaction',args:[{sender:claimed.address,recipient:target,numOfInitialValidators:BigInt(chain.defaultNumberOfInitialValidators),maxRotations:BigInt(chain.defaultConsensusMaxRotations),validUntil:BigInt(Math.floor(Date.now()/1000)+3600),saltNonce:0n,userValue:0n,feesDistribution:fees.distribution,txCalldata:data,messageAllocations:fees.messageAllocations??[]}]});
 const record=await sendJournal('caller-spoof-smoke.json',{...network,operation:'zero-value caller-spoof tripwire',target,actualSigner:actual.address,claimedSender:claimed.address,valueGEN:'0',feeDepositGEN:gen(fees.feeValue),before},async()=>{
  const nonce=Number(await client(actual).getCurrentNonce({address:actual.address}));
  const signed=await actual.signTransaction({to:chain.consensusMainContract.address,data:encoded,nonce,chainId:61997,type:'legacy',gas:500000n,gasPrice:BigInt(await rpc('eth_gasPrice')),value:fees.feeValue});
  try{return await client(actual).sendRawTransaction({serializedTransaction:signed});}
  catch(error){if(/sender.*(match|signer|mismatch)|signer.*(match|sender|mismatch)/i.test(String(error?.message)))throw new SafeError('SenderMismatchRejected',null,{senderMismatch:true});throw error;}
 });
 let tx=null,evm=null;
 for(let i=0;i<40;i++){
  tx=await rpc('eth_getTransactionByHash',[record.hash]);evm=await rpc('eth_getTransactionReceipt',[record.hash]);
  if(evm?.status==='0x0'||receiptState(tx).status==='FINALIZED'||record.submissionObservation?.markers?.senderMismatch)break;
  await new Promise(r=>setTimeout(r,2000));
 }
 const state=receiptState(tx);const caller=tx?.from_address??tx?.sender;const origin=tx?.origin_address;
 const transportRejected=record.submissionObservation?.markers?.senderMismatch===true||evm?.status==='0x0';
 const identityPreserved=state.status==='FINALIZED'&&[caller,origin].every(x=>typeof x==='string'&&x.toLowerCase()===actual.address.toLowerCase());
 const after={accounting:JSON.parse(await read(target,'get_accounting')),nativeGEN:gen(await balance(target))};
 const unchanged=JSON.stringify(before)===JSON.stringify(after);
 Object.assign(record,{checkedAt:new Date().toISOString(),transportRejected,identityPreserved,unchanged,after,receipt:{evmStatus:evm?.status??null,...state,caller:typeof caller==='string'?caller:null,origin:typeof origin==='string'?origin:null},passed:unchanged&&(transportRejected||identityPreserved)});
 await save('caller-spoof-smoke.json',record);console.log(JSON.stringify(record));if(!record.passed)throw new SafeError('CallerAuthoritySmokeFailed');
}
try{await main();}catch(error){console.log(JSON.stringify({smokeStopped:safeError(error)}));process.exitCode=1;}
