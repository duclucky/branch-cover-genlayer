import {test} from 'node:test';
import assert from 'node:assert/strict';
import {successfulAgreementCount} from './consensus.mjs';
const agree={mode:'validator',vote:'agree',execution_result:'SUCCESS'};
const idle={mode:'validator',vote:'idle',execution_result:'ERROR',genvm_result:{error_code:'CONSENSUS_VALIDATOR_QUORUM_REACHED'}};
test('full validator executions prove agreement even when representative receipt is idle',()=>{
 const tx={consensus_data:{leader_receipt:[{mode:'leader',execution_result:'SUCCESS'},idle],validators:[agree,{...agree},{...agree},{mode:'validator',vote:'disagree',execution_result:'SUCCESS'}]}};
 assert.equal(successfulAgreementCount(tx),3);
});
test('successful status or agreeing labels alone never count as executed agreement',()=>{
 assert.equal(successfulAgreementCount({status:7,execution_result:'SUCCESS'}),0);
 assert.equal(successfulAgreementCount({consensus_data:{validators:[idle,{...agree,execution_result:'ERROR'},{vote:'agree'}]}}),0);
});
