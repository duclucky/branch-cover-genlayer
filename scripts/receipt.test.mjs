import {test} from 'node:test';
import assert from 'node:assert/strict';
import {receiptState,safeReceipt} from './receipt.mjs';
import {externalDeliveryProof} from './external-delivery.mjs';
test('raw Studio success requires finalized successful execution',()=>{
 assert.equal(receiptState({status:7,consensus_data:{leader_receipt:{mode:'leader',execution_result:'SUCCESS'}}}).successful,true);
 for(const tx of [{status:7},{status:7,execution_result:'ERROR'},{status:5,execution_result:'SUCCESS'},null])assert.equal(receiptState(tx).successful,false);
});
test('normalized RC success and failed idle quorum distinguish actual failures',()=>{
 assert.equal(receiptState({statusName:'FINALIZED',txExecutionResultName:'FINISHED_WITH_RETURN'}).successful,true);
 assert.equal(receiptState({statusName:'FINALIZED',txExecutionResult:1}).successful,true);
 assert.equal(receiptState({statusName:'FINALIZED',txExecutionResultName:'FAILED'}).successful,false);
 const base={status:7,txExecutionResultName:'FINISHED_WITH_RETURN',consensus_data:{leader_receipt:[{mode:'leader',execution_result:'SUCCESS'},{mode:'validator',vote:'idle',execution_result:'ERROR',controlCode:'CONSENSUS_VALIDATOR_QUORUM_REACHED'}]}};
 assert.equal(receiptState(base).successful,true);
 base.consensus_data.leader_receipt[1].controlCode='ACTUAL_FAILURE';assert.equal(receiptState(base).successful,false);
});
test('safe projection never contains validator config or arbitrary diagnostics',()=>{
 const safe=safeReceipt({status:7,execution_result:'SUCCESS',node_config:{secret:'not-public'},stderr:'private',consensus_data:{validator_config:'private'}});
 assert.deepEqual(Object.keys(safe).sort(),['status','execution','successful','hash','from','to'].sort());
 assert.equal(JSON.stringify(safe).includes('private'),false);
});
test('external message proof rejects parent-only finality and wrong value/recipient',()=>{
 const account='0x'+'a'.repeat(40),id='0x'+'1'.repeat(64);
 const tx={status:7,execution_result:'SUCCESS',messages:[{messageType:0,recipient:account,value:'2000000000000000000',onAcceptance:false}],data:{fee_accounting:{external_message_events:[{recipient:account,executionRecorded:true}],message_value_effects:{[id]:{phase:'finalized',include:true,value:'2000000000000000000'}},message_effect_delivered:{[id]:true}}}};
 assert.equal(externalDeliveryProof(tx,account,'2').messageValueDelivered,true);
 assert.throws(()=>externalDeliveryProof({...tx,data:{}},account,'2'));
 assert.throws(()=>externalDeliveryProof(tx,account,'1'));
 assert.throws(()=>externalDeliveryProof(tx,'0x'+'b'.repeat(40),'2'));
});
