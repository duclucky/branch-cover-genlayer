import {inspect,safeError} from './network.mjs';
try{console.log(JSON.stringify(await inspect()));}catch(e){console.log(JSON.stringify({stopped:safeError(e)}));process.exitCode=1;}
