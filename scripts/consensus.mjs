/** Count completed independent agreeing executions, never idle/format-only rows. */
export function successfulAgreementCount(tx){
 const rows=tx?.consensus_data?.validators;
 if(!Array.isArray(rows))return 0;
 return rows.filter(x=>x?.mode==='validator'&&x.vote==='agree'&&x.execution_result==='SUCCESS').length;
}
