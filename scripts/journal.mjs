/** Hash-before-broadcast journaling; retries inspect instead of signing again. */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {keccak256} from 'viem';
import {evidence,save,SafeError,safeError,rpc} from './network.mjs';
import {hash} from './receipt.mjs';
export async function loadJournal(name){try{return JSON.parse(await readFile(resolve(evidence,name),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw new SafeError('JournalReadFailed');}}
export async function sendJournal(name,metadata,submit){
 const existing=await loadJournal(name);if(existing?.hash)return existing;
 if(existing)throw new SafeError('PreparedOperationNeedsInspection');
 const record={...metadata,preparedAt:new Date().toISOString(),status:'PREPARED',hash:null};
 await save(name,record);const originalFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  let body;try{body=JSON.parse(options?.body??'{}');}catch{}
  if(body?.method==='eth_sendRawTransaction'){
   record.hash=keccak256(body.params[0]);record.status='SENDING';await save(name,record);
   const response=await originalFetch(url,options);const envelope=await response.clone().json();
   if(hash(envelope.result)){record.hash=envelope.result;record.status='SUBMITTED';await save(name,record);console.log(JSON.stringify({operation:metadata.operation,stage:'submitted',hash:record.hash}));}
   return response;
  }
  return originalFetch(url,options);
 };
 try{await submit();}catch(error){record.submissionObservation=safeError(error);await save(name,record);if(!record.hash)throw new SafeError('SubmissionStoppedBeforeBroadcast');}
 finally{globalThis.fetch=originalFetch;}
 if(!record.hash)throw new SafeError('MissingSubmittedHash');
 return record;
}
export async function nativeReceipt(txHash){
 for(let i=0;i<20;i++){
  const receipt=await rpc('eth_getTransactionReceipt',[txHash]);
  if(receipt?.status==='0x0')throw new SafeError('NativeEnvelopeReverted');
  if(receipt?.status==='0x1')return receipt;
  await new Promise(resolve=>setTimeout(resolve,3000));
 }
 throw new SafeError('NativeTransferStillPending');
}
