/** External EVM execution receipt, distinct from parent IC finality. */
import {parseUnits} from 'viem';
import {receiptState} from './receipt.mjs';
export function externalDeliveryProof(tx,recipient,valueGEN){
 const fail=()=>{throw Error('ExternalDeliveryNotProven');};
 if(!receiptState(tx).successful||!/^0x[0-9a-fA-F]{40}$/.test(recipient))fail();
 const amount=parseUnits(valueGEN,18),account=recipient.toLowerCase();
 const messages=tx.messages??[];
 if(messages.length!==1)fail();
 const message=messages[0];
 if(Number(message.messageType)!==0||message.recipient?.toLowerCase()!==account||BigInt(message.value)!==amount||message.onAcceptance!==false)fail();
 const fees=tx.data?.fee_accounting;
 const events=(fees?.external_message_events??[]).filter(x=>x.recipient?.toLowerCase()===account&&x.executionRecorded===true);
 const effects=Object.entries(fees?.message_value_effects??{}).filter(([id,x])=>x.phase==='finalized'&&x.include===true&&BigInt(x.value)===amount&&fees?.message_effect_delivered?.[id]===true);
 if(events.length!==1||effects.length!==1||!/^0x[0-9a-fA-F]{64}$/.test(effects[0][0]))fail();
 return {kind:'parent-attached external EVM execution receipt',recipient,valueGEN,executionRecorded:true,messageValueDelivered:true,effectId:effects[0][0],separateChildHashAvailable:false};
}
