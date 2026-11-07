import type {Assessment} from './allergen-assessment';
export const validScanId=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const pendingScanKey=(id:string)=>'aller-pending-scan:'+id;
export const savedScanKey=(userId:string,id:string)=>'aller-saved-scan:'+userId+':'+id;
export function scanPresentation(assessment:Assessment|null){
 switch(assessment?.risk){
 case 'safe':return {outcome:'no-known-conflict',tone:'safe',title:'No known conflicts found in available data',heading:'Why no known conflicts were found',description:'No match was found for your selected allergies in the documented ingredients. Label or cross-contact information may still be missing. This is not a safety guarantee.'};
 case 'caution':return {outcome:'caution',tone:'caution',title:'Caution',heading:'Why caution is needed',description:'Possible traces, cross-contact warnings or ambiguous ingredients need checking against the current package label.'};
 case 'unsafe':return {outcome:'identified-conflict',tone:'unsafe',title:'Not Safe',heading:'Why a conflict was identified',description:'A declared allergen or recognizable ingredient matches your allergy profile. Check the evidence below.'};
 default:return {outcome:'insufficient-data',tone:'unknown',title:'Unknown',heading:'Why this needs verification',description:'There is not enough reliable ingredient or profile information to assess this product. Missing information does not mean no allergens are present.'};
 }
}
export const scanOwnerKey=(id:string)=>'aller-scan-owner:'+id;
export function claimPendingScan(storage:Pick<Storage,'getItem'|'setItem'>,id:string,barcode:string,userId:string){if(!validScanId(id)||storage.getItem(pendingScanKey(id))!==barcode)return false;const owner=storage.getItem(scanOwnerKey(id));if(owner&&owner!==userId)return false;storage.setItem(scanOwnerKey(id),userId);return true;}
export function newScanId(random:Crypto=globalThis.crypto){if(typeof random?.randomUUID==='function')return random.randomUUID();if(!random?.getRandomValues)throw new Error('Secure random IDs are unavailable. Open the app over HTTPS or localhost.');const bytes=random.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=Array.from(bytes,x=>x.toString(16).padStart(2,'0'));return hex.slice(0,4).join('')+'-'+hex.slice(4,6).join('')+'-'+hex.slice(6,8).join('')+'-'+hex.slice(8,10).join('')+'-'+hex.slice(10).join('');}
