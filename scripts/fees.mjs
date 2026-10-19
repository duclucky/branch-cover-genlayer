/** Current prices and representative GenVM measurements; never supplies verdicts. */
import {readFile} from 'node:fs/promises';
import {abi,createFeesDistribution} from 'genlayer-js';
import {sourcePath,rpc,client,SafeError} from './network.mjs';
import {retryRead} from './read-retry.mjs';
import {contractArgs} from './contract-args.mjs';
export function rpcFees(quote){return JSON.parse(JSON.stringify({distribution:quote.distribution,messageAllocations:quote.messageAllocations??[],feeValue:quote.feeValue},(_key,value)=>typeof value==='bigint'?value.toString():value));}
async function measureDeployment(account){
 const baseline=await client(account).estimateTransactionFees();
 const code=await readFile(sourcePath,'utf8');
 const data=abi.transactions.serialize([code,abi.calldata.encode(abi.calldata.makeCalldataObject(undefined,[])),false]);
 const estimate=await rpc('sim_estimateTransactionFees',[{type:'deploy',from:account.address,to:'0x0000000000000000000000000000000000000000',data,fees:rpcFees(baseline)}]);
 const preset=estimate?.recommendedPreset;
 if(!preset?.distribution||!preset.feeValue)throw new SafeError('MeasuredDeploymentFeeQuoteRequired');
 const feeValue=BigInt(preset.feeValue);
 if(feeValue<=0n||feeValue>=10n**18n)throw new SafeError('DeploymentFeeQuoteOutsideBound');
 return {distribution:createFeesDistribution(preset.distribution),feeValue,messageAllocations:preset.messageAllocations??[]};
}
async function measureWrite(account,address,functionName,args,value=0n){
 const baseline=await client(account).estimateTransactionFees();
 const data=abi.transactions.serialize([abi.calldata.encode(abi.calldata.makeCalldataObject(functionName,contractArgs(functionName,args))),false]);
 // Studio's unsigned write simulation omits its clock unless explicitly supplied.
 // This affects fee simulation only; no sim_config is sent with signed writes.
 const estimate=await rpc('sim_estimateTransactionFees',[{type:'write',from:account.address,to:address,data,value:'0x'+value.toString(16),fees:rpcFees(baseline),sim_config:{genvm_datetime:new Date().toISOString()}}]);
 const preset=estimate?.recommendedPreset;
 if(!preset?.distribution||!preset.feeValue)throw new SafeError('FundedFeeQuoteRequired');
 const feeValue=BigInt(preset.feeValue);
 if(feeValue<=0n||feeValue>=10n**18n)throw new SafeError('WriteFeeQuoteOutsideBound');
 return {distribution:createFeesDistribution(preset.distribution),feeValue,messageAllocations:preset.messageAllocations??[]};
}
export async function quoteDeploy(account){return retryRead(()=>measureDeployment(account));}
export async function quoteWrite(account,address,functionName,args,value=0n){return retryRead(()=>measureWrite(account,address,functionName,args,value));}
