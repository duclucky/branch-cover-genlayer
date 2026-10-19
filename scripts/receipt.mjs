/** Strict receipt interpretation shared by tooling. Never serialize an RPC object. */
const statuses=new Set(['PENDING','ACTIVATED','PROPOSING','COMMITTING','REVEALING','ACCEPTED','FINALIZED','UNDETERMINED','CANCELED','LEADER_TIMEOUT','VALIDATORS_TIMEOUT']);
const byNumber={1:'PENDING',2:'PROPOSING',3:'COMMITTING',4:'REVEALING',5:'ACCEPTED',6:'UNDETERMINED',7:'FINALIZED',8:'CANCELED',11:'VALIDATORS_TIMEOUT',12:'LEADER_TIMEOUT'};
export const address=x=>typeof x==='string'&&/^0x[0-9a-fA-F]{40}$/.test(x)&&!/^0x0{40}$/i.test(x)?x.toLowerCase():null;
export const hash=x=>typeof x==='string'&&/^0x[0-9a-fA-F]{64}$/.test(x)?x.toLowerCase():null;
export function receiptState(receipt){
 if(!receipt||typeof receipt!=='object')return {status:'UNKNOWN',execution:'UNKNOWN',successful:false};
 const raw=receipt.statusName??receipt.status;
 const status=statuses.has(raw)?raw:byNumber[raw]??'UNKNOWN';
 const leaders=receipt.consensus_data?.leader_receipt;
 const rows=Array.isArray(leaders)?leaders:leaders?[leaders]:[];
 const explicitReturn=receipt.txExecutionResultName==='FINISHED_WITH_RETURN'||(receipt.txExecutionResultName===undefined&&Number(receipt.txExecutionResult)===1);
 const successfulLeader=rows.some(r=>r?.mode==='leader'&&r.execution_result==='SUCCESS');
 const executions=rows.filter(r=>!(explicitReturn&&successfulLeader&&r?.mode==='validator'&&r.vote==='idle'&&(r.controlCode??r.genvm_result?.error_code)==='CONSENSUS_VALIDATOR_QUORUM_REACHED'));
 const candidates=[receipt.execution_result,...executions.map(r=>r?.execution_result)].filter(x=>x!==undefined);
 if(receipt.txExecutionResultName!==undefined)candidates.push(receipt.txExecutionResultName==='FINISHED_WITH_RETURN'?'SUCCESS':'ERROR');
 else if(receipt.txExecutionResult!==undefined)candidates.push(Number(receipt.txExecutionResult)===1?'SUCCESS':'ERROR');
 const execution=candidates.length===0?'UNKNOWN':candidates.every(x=>x==='SUCCESS')?'SUCCESS':'ERROR';
 return {status,execution,successful:status==='FINALIZED'&&execution==='SUCCESS'};
}
export function safeReceipt(receipt){
 const state=receiptState(receipt);
 return {...state,hash:hash(receipt?.hash??receipt?.txId??receipt?.transactionHash),from:address(receipt?.from_address??receipt?.sender??receipt?.from),to:address(receipt?.to_address??receipt?.recipient??receipt?.to)};
}
