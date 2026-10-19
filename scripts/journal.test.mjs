import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('broadcast journal persists signed transaction hash before network send',async()=>{
 const source=await readFile(new URL('./journal.mjs',import.meta.url),'utf8');
 const hash=source.indexOf('record.hash=keccak256(body.params[0])');
 assert.ok(hash>=0&&source.indexOf('await save(name,record)',hash)<source.indexOf('await originalFetch(url,options)',hash));
 assert.ok(source.includes('if(existing?.hash)return existing'));
 assert.ok(!source.includes('console.log(signed')&&!source.includes('JSON.stringify(error)'));
});
