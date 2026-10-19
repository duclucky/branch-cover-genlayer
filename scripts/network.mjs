import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {privateKeyToAccount} from 'viem/accounts';
import {formatUnits} from 'viem';
import {createClient} from 'genlayer-js';
import {studioDevnet} from 'genlayer-js/chains';
import {TransactionHashVariant} from 'genlayer-js/types';
import {receiptState,address,hash} from './receipt.mjs';
import {retryRead} from './read-retry.mjs';

export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const RPC='https://studio-next.genlayer.com/api';
export const EXPLORER='https://explorer-studio-dev.genlayer.com';
export const chain={...studioDevnet,rpcUrls:{default:{http:[RPC]}}};
export const evidence=resolve(root,'docs/evidence/studio-dev');
export const sourcePath=resolve(root,'contracts/branch_cover.py');
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const gen=value=>formatUnits(BigInt(value),18);
export class SafeError extends Error{constructor(kind,code,markers={}){super(kind);this.kind=kind;this.code=Number.isInteger(code)?code:null;this.markers=markers;}}

// Vendor diagnostics can contain RPC objects; emit only our explicit projection.
console.warn=()=>{};
console.error=()=>{};
export function safeError(error){
 const text=String(error?.message??'');
 return {kind:error instanceof SafeError?error.kind:['AbortError','TimeoutError'].includes(error?.name)?error.name:'OperationFailed',errorType:typeof error?.name==='string'&&/^[A-Za-z]{1,64}(?:Error|Exception)$/.test(error.name)?error.name:null,rpcCode:error instanceof SafeError?error.code:null,
  markers:{insufficientFunds:/insufficient funds/i.test(text),invalidAddress:/invalid address|Address.*invalid/i.test(text),timeout:/time.*out/i.test(text),nonPayable:/non.payable/i.test(text),...(error instanceof SafeError?error.markers:{})}};
}
export async function rpc(method,params=[]){
 const response=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(55000)});
 if(!response.ok){const error=new SafeError('RpcHttpFailure',response.status),seconds=Number(response.headers.get('retry-after'));if(response.status===429&&Number.isFinite(seconds)&&seconds>0)error.retryAfterSeconds=seconds;throw error;}
 const result=await response.json();
 if(result.error){const text=JSON.stringify(result.error);throw new SafeError('RpcError',result.error.code,{insufficientFunds:/insufficient funds/i.test(text),feeCap:/MaxPriceExceeded|InsufficientFees|FeeValueMustBeNonZero|BudgetTooLow|0xb4132db3|0x8d53e553|0x632be5a1|0x305e533c/i.test(text),abiMismatch:/selector|decode|ABI|function not found/i.test(text)});}
 return result.result;
}
export async function verifyNetwork(){
 const id=Number(BigInt(await rpc('eth_chainId')));
 if(id!==61997)throw new SafeError('WrongChain');
 return {network:'Studio Dev',chainId:id,rpc:RPC,explorer:EXPLORER};
}
export async function configuration(){
 const config={};
 for(const path of [resolve(root,'.env'),resolve(root,'../.env')]){
  try{const parsed=parseEnv(await readFile(path,'utf8'));for(const [key,value]of Object.entries(parsed))if(!config[key]&&value)config[key]=value;}catch(error){if(error.code!=='ENOENT')throw new SafeError('ConfigurationReadFailed');}
 }
 return config;
}
export async function actors(){
 const config=await configuration();
 const names=['STUDIONET_PRIVATE_KEY',config.BRANCHCOVER_BENEFICIARY0_PRIVATE_KEY?'BRANCHCOVER_BENEFICIARY0_PRIVATE_KEY':'STUDIONET_INTEGRATOR_PRIVATE_KEY',config.BRANCHCOVER_BENEFICIARY1_PRIVATE_KEY?'BRANCHCOVER_BENEFICIARY1_PRIVATE_KEY':'STUDIONET_STEWARD_PRIVATE_KEY'];
 const result=names.map(name=>{const value=config[name];if(!value||!/^0x[0-9a-fA-F]{64}$/.test(value))throw new SafeError('AuthorizedRoleConfigurationMissing');return privateKeyToAccount(value);});
 if(new Set(result.map(a=>a.address.toLowerCase())).size!==3)throw new SafeError('DistinctAuthorizedRolesRequired');
 return result;
}
export async function sponsor(){
 const config=await configuration();const key=config.STUDIONET_PRIVATE_KEY;
 if(!key||!/^0x[0-9a-fA-F]{64}$/.test(key))throw new SafeError('AuthorizedSponsorConfigurationMissing');
 return privateKeyToAccount(key);
}
export function client(account){return createClient({chain:{...chain,rpcUrls:{default:{http:[RPC]}}},...account?{account}:{}});}
export async function read(address,functionName,args=[]){return retryRead(()=>client().readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));}
export async function balance(account){return BigInt(await retryRead(()=>rpc('eth_getBalance',[account,'latest'])));}
export async function identity(){
 const source=await readFile(sourcePath,'utf8');
 const revision=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
 return {network:'Studio Dev',chainId:61997,sourceCommit:/^[a-f0-9]{40}$/.test(revision)?revision:null,sourceSha256:sha(source),runner:'5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng',api:'v0.3.0',genvm:'v0.6.0-rc5',sdk:'2.0.0-rc.1'};
}
export async function save(name,data){await mkdir(evidence,{recursive:true});await writeFile(resolve(evidence,name),JSON.stringify(data,null,2)+'\n');}
export async function inspect(){
 const network=await verifyNetwork();const accounts=await actors();const result=[];
 for(let i=0;i<accounts.length;i++)result.push({role:['funder','beneficiary0','beneficiary1'][i],address:accounts[i].address,balanceGEN:gen(await balance(accounts[i].address))});
 let deployment=null;try{deployment=JSON.parse(await readFile(resolve(evidence,'deployment.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw new SafeError('DeploymentIdentityReadFailed');}
 return {at:new Date().toISOString(),...network,identity:await identity(),actors:result,deployment:deployment?{address:address(deployment.address),hash:hash(deployment.hash),status:deployment.status}:null};
}
export async function transaction(txHash){if(!hash(txHash))throw new SafeError('InvalidTransactionHash');return retryRead(()=>rpc('eth_getTransactionByHash',[txHash]));}
export async function wait(txHash,onState=()=>{},limit=120){
 let last='';
 for(let i=0;i<limit;i++){
  const tx=await transaction(txHash);const state=receiptState(tx);
  if(state.status!==last){onState(state);last=state.status;}
  if(state.status==='FINALIZED'){if(!state.successful)throw new SafeError('FinalizedExecutionFailed');return tx;}
  if(['UNDETERMINED','CANCELED','LEADER_TIMEOUT','VALIDATORS_TIMEOUT'].includes(state.status))throw new SafeError('ConsensusNeedsInspection');
  await new Promise(resolve=>setTimeout(resolve,6000));
 }
 throw new SafeError('TransactionStillPending');
}
