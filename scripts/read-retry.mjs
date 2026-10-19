/** Only wrap read-only work; never retry signing or broadcasting here. */
const rateLimited=error=>{
 const seen=new Set();
 for(let cause=error;cause&&typeof cause==='object'&&!seen.has(cause);cause=cause.cause){
  seen.add(cause);if([-32029,-32005,-32006,429].includes(cause.code)||cause.status===429)return true;
 }
 return false;
};
const delayFor=(error,fallback)=>{
 const seen=new Set();
 for(let cause=error;cause&&typeof cause==='object'&&!seen.has(cause);cause=cause.cause){
  seen.add(cause);const seconds=cause.retryAfterSeconds??cause.data?.retry_after_seconds;
  if(Number.isFinite(seconds)&&seconds>0)return Math.min(60000,Math.max(1000,Math.ceil(seconds*1000)));
 }
 return fallback;
};
export async function retryRead(read,{pause=n=>new Promise(resolve=>setTimeout(resolve,n))}={}){
 for(let attempt=0;;attempt++){
  try{return await read();}catch(error){if(attempt>=3||!rateLimited(error))throw error;await pause(delayFor(error,10000*(attempt+1)));}
 }
}
