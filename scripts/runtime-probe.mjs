/** Unsigned schema and constructor; never loads keys or broadcasts. */
import {readFile} from 'node:fs/promises';
import {abi} from 'genlayer-js';
import {toHex} from 'viem';
import {sourcePath,rpc,save,identity,verifyNetwork,safeError} from './network.mjs';
const record={at:new Date().toISOString(),command:'node scripts/runtime-probe.mjs',scope:'Unsigned exact-source schema/constructor only; not finality or semantic consensus.',network:await verifyNetwork(),identity:await identity(),checks:[]};
try{
 const code=await readFile(sourcePath,'utf8');
 const schema=await rpc('gen_getContractSchemaForCode',[toHex(code)]);
 const methods=Object.keys(schema?.methods??{}).sort();
 record.checks.push({kind:'schema',methods,passed:!!schema?.ctor&&methods.length===20});
 const data=abi.transactions.serialize([code,abi.calldata.encode(abi.calldata.makeCalldataObject(undefined,[])),false]);
 const receipt=await rpc('sim_call',[{type:'deploy',from:'0x0000000000000000000000000000000000000001',to:'0x0000000000000000000000000000000000000000',data}]);
 record.checks.push({kind:'constructor',executionResult:['SUCCESS','ERROR'].includes(receipt?.execution_result)?receipt.execution_result:'UNKNOWN',passed:receipt?.execution_result==='SUCCESS'});
}catch(e){record.checks.push({kind:'runtime',passed:false,error:safeError(e)});}
record.passed=record.checks.length===2&&record.checks.every(x=>x.passed);
await save('runtime-probe.json',record);console.log(JSON.stringify(record));process.exitCode=record.passed?0:1;
