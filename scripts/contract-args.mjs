/** ABI boundary: human addresses remain strings in sanitized journals. */
import {CalldataAddress} from 'genlayer-js/types';
import {hexToBytes} from 'viem';
export function contractArgs(functionName,args){
 const result=[...args],positions=functionName==='create_book'?[1,2,3]:functionName==='get_credit'?[1]:[];
 for(const index of positions){
  if(result[index] instanceof CalldataAddress)continue;
  if(typeof result[index]!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(result[index]))throw Error('InvalidContractAddressArgument');
  result[index]=new CalldataAddress(hexToBytes(result[index]));
 }
 return result;
}
