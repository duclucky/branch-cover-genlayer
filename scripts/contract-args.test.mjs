import {test} from 'node:test';
import assert from 'node:assert/strict';
import {abi} from 'genlayer-js';
import {CalldataAddress} from 'genlayer-js/types';
import {contractArgs} from './contract-args.mjs';
const a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),o='0x'+'c'.repeat(40);
test('real SDK wire distinguishes Address arguments from ordinary strings',()=>{
 const args=['book',a,b,o,'read','publish',2,2,'read only','publish only','both',200,300];
 const decoded=abi.calldata.decode(abi.calldata.encode(abi.calldata.makeCalldataObject('create_book',contractArgs('create_book',args))));
 for(const index of [1,2,3])assert.ok(decoded.get('args')[index] instanceof CalldataAddress);
 assert.equal(decoded.get('args')[0],'book');assert.equal(decoded.get('args')[4],'read');
 const credit=abi.calldata.decode(abi.calldata.encode(abi.calldata.makeCalldataObject('get_credit',contractArgs('get_credit',['book',a]))));
 assert.ok(credit.get('args')[1] instanceof CalldataAddress);
 assert.deepEqual(args.slice(0,4),['book',a,b,o]);
});
test('bad address input fails before fees/signing and non-address methods are unchanged',()=>{
 assert.throws(()=>contractArgs('get_credit',['book','0x123']));
 assert.deepEqual(contractArgs('choose_branch',['book','B0']),['book','B0']);
});
