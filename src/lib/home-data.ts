import type {SupabaseClient} from '@supabase/supabase-js';
export type SavedProduct={code:string;name:string;brand:string;ingredients:string;allergens:string;image:string|null;risk:'safe'|'caution'|'unsafe'|'unknown';assessmentLabel?:string;assessmentSummary?:string};
export type SavedScan={id:string;createdAt:string;product:SavedProduct};
export type ScanResult={scans:SavedScan[];error:boolean};
export function safeProductImage(value:unknown):string|null{if(typeof value!=='string')return null;try{const url=new URL(value);return url.protocol==='https:'&&(/(^|\.)openfoodfacts\.org$/.test(url.hostname)||/(^|\.)openfoodfacts\.net$/.test(url.hostname))?url.href:null;}catch{return null;}}
export function normalizeScan(row:Record<string,unknown>):SavedScan|null{
 if(typeof row.id!=='string'||typeof row.created_at!=='string'||!Number.isFinite(Date.parse(row.created_at))||!row.product||typeof row.product!=='object')return null;
 const p=row.product as Record<string,unknown>;const text=(key:string,fallback='')=>typeof p[key]==='string'?p[key] as string:fallback;
 const risk=String(p.risk||'').toLowerCase();
 const assessment=p.assessment as Record<string,unknown>|undefined;
 const ingredientAssessment=p.kind==='ingredient-analysis'&&assessment?.method==='deterministic-v1'&&['Not Safe','Caution','No known conflict found in provided text'].includes(String(assessment.label))&&typeof assessment.summary==='string'?{assessmentLabel:String(assessment.label),assessmentSummary:assessment.summary.slice(0,1000)}:{};
 return {id:row.id,createdAt:row.created_at,product:{...ingredientAssessment,code:text('code'),name:text('name',text('product_name','Unnamed product')).trim()||'Unnamed product',brand:text('brand',text('brands')),ingredients:text('ingredients','Ingredients unavailable'),allergens:text('allergens'),image:safeProductImage(p.image||p.image_front_small_url||p.image_front_url),risk:['safe','caution','unsafe'].includes(risk)?risk as SavedProduct['risk']:'unknown'}};
}
export async function loadScanHistory(db:SupabaseClient,userId:string,limit=3):Promise<ScanResult>{
 try{const {data,error}=await db.from('scan_history').select('id,product,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(Math.max(1,Math.min(limit,100)));if(error)throw error;return {scans:(data||[]).map(normalizeScan).filter((x:SavedScan|null):x is SavedScan=>x!==null),error:false};}catch{return {scans:[],error:true};}
}
export async function loadHome(db:SupabaseClient,userId:string){
 const [profile,history]=await Promise.allSettled([db.from('profiles').select('full_name').eq('id',userId).maybeSingle(),loadScanHistory(db,userId)]);
 return {name:profile.status==='fulfilled'&&!profile.value.error&&typeof profile.value.data?.full_name==='string'?profile.value.data.full_name:'',profileError:profile.status==='rejected'||Boolean(profile.value.error),...(history.status==='fulfilled'?history.value:{scans:[],error:true})};
}
export function searchDestination(query:string){return '/search?query='+encodeURIComponent(query.trim().slice(0,100));}
export function riskPresentation(risk:SavedProduct['risk']){return {safe:{label:'No flags',tone:'safe'},caution:{label:'Caution',tone:'caution'},unsafe:{label:'Potential conflict',tone:'unsafe'},unknown:{label:'Not assessed',tone:'unknown'}}[risk];}
export function scanTimestamp(value:string,now=Date.now()){
 const ms=Date.parse(value);if(!Number.isFinite(ms))return 'Date unavailable';const minutes=Math.floor(Math.max(0,now-ms)/60000);
 if(minutes<1)return 'Just now';if(minutes<60)return `${minutes} min ago`;const hours=Math.floor(minutes/60);if(hours<24)return `${hours} ${hours===1?'hour':'hours'} ago`;const days=Math.floor(hours/24);if(days<7)return `${days} ${days===1?'day':'days'} ago`;return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(ms));
}
export async function saveProductScan(db:SupabaseClient,product:Omit<SavedProduct,'risk'|'image'>&{image?:string|null}){
 const {data:{user},error:authError}=await db.auth.getUser();if(authError)throw authError;if(!user)throw new Error('Sign in to save scans to your history.');
 const {error}=await db.from('scan_history').insert({user_id:user.id,product:{...product,image:safeProductImage(product.image),risk:'unknown'}});if(error)throw error;
}

