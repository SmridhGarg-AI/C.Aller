import type {SupabaseClient} from '@supabase/supabase-js';
import {normalizeScan,type SavedScan} from './home-data.ts';
export type HistoryMethod='all'|'barcode'|'ingredients'|'image'|'product'|'unspecified';
export type HistoryRisk='all'|'unsafe'|'caution'|'clear'|'unknown';
export type HistoryFilters={method:HistoryMethod;risk:HistoryRisk;page:number};
export type HistoryRecord=SavedScan&{method:Exclude<HistoryMethod,'all'>;status:Exclude<HistoryRisk,'all'>;assessment:{label:string;reasons:string[];source:string;findings:{ingredient:string;tag:string;sourceText:string}[]};assessedAt:string|null};
export const HISTORY_PAGE_SIZE=20;
export function historyFilters(query:Record<string,unknown>):HistoryFilters{return {method:typeof query.method==='string'&&['barcode','ingredients','image','product','unspecified'].includes(String(query.method))?query.method as HistoryMethod:'all',risk:typeof query.risk==='string'&&['unsafe','caution','clear','unknown'].includes(String(query.risk))?query.risk as HistoryRisk:'all',page:typeof query.page==='string'&&/^\d{1,5}$/.test(query.page)?Math.max(1,Math.min(10000,Number(query.page))):1};}
export function historyHref(filters:HistoryFilters,scan=''){const params=new URLSearchParams();if(filters.method!=='all')params.set('method',filters.method);if(filters.risk!=='all')params.set('risk',filters.risk);if(filters.page>1)params.set('page',String(filters.page));if(scan)params.set('scan',scan);return '/history'+(params.size?'?'+params.toString():'');}
export function historyId(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
const text=(v:unknown,max=10000)=>typeof v==='string'?v.slice(0,max):'';
export function historyRecord(row:Record<string,unknown>):HistoryRecord|null{
 const base=normalizeScan(row);if(!base)return null;const p=row.product as Record<string,unknown>;const a=p.assessment&&typeof p.assessment==='object'?p.assessment as Record<string,unknown>:{};
 const method=['barcode','ingredients','image','product'].includes(String(p.method))?p.method as HistoryRecord['method']:p.kind==='ingredient-analysis'?(p.brand==='Reviewed label photo'?'image':'ingredients'):'unspecified';
 const status=base.product.risk==='unsafe'?'unsafe':base.product.risk==='caution'?'caution':a.risk==='clear'||base.product.risk==='safe'?'clear':'unknown';
 const label={unsafe:'Not Safe',caution:'Caution',clear:'No known conflict in saved data',unknown:'Unknown'}[status];
 const findings=Array.isArray(a.findings)?a.findings.slice(0,200).filter(v=>v&&typeof v==='object').map(v=>({ingredient:text(v.ingredient,1000),tag:text(v.tag,100),sourceText:text(v.sourceText,2000)})):[];
 const reasons=[...(Array.isArray(a.reasons)?a.reasons.filter((v):v is string=>typeof v==='string').slice(0,20):[]),...(typeof a.summary==='string'?[a.summary]:[])].map(v=>v.slice(0,2000));
 return {...base,method,status,assessment:{label,reasons,source:text(a.source||p.source,300),findings},assessedAt:typeof p.assessed_at==='string'&&Number.isFinite(Date.parse(p.assessed_at))?p.assessed_at:null};
}
type HistoryFilterQuery={or:(filter:string)=>HistoryFilterQuery;eq:(key:string,value:string)=>HistoryFilterQuery};
export function applyHistoryFilters(query:HistoryFilterQuery,filters:HistoryFilters):HistoryFilterQuery{
 if(filters.method==='ingredients')query=query.or('product->>method.eq.ingredients,and(product->>method.is.null,product->>kind.eq.ingredient-analysis,or(product->>brand.neq.Reviewed label photo,product->>brand.is.null))');
 else if(filters.method==='image')query=query.or('product->>method.eq.image,and(product->>method.is.null,product->>kind.eq.ingredient-analysis,product->>brand.eq.Reviewed label photo)');
 else if(filters.method==='unspecified')query=query.or('and(product->>method.is.null,or(product->>kind.is.null,product->>kind.neq.ingredient-analysis))');
 else if(filters.method!=='all')query=query.eq('product->>method',filters.method);
 if(filters.risk==='clear')query=query.or('product->>risk.eq.safe,and(product->assessment->>risk.eq.clear,or(product->>risk.is.null,product->>risk.not.in.(safe,caution,unsafe)))');
 else if(filters.risk==='unknown')query=query.or('and(or(product->>risk.is.null,product->>risk.not.in.(safe,caution,unsafe)),or(product->assessment->>risk.is.null,product->assessment->>risk.neq.clear))');
 else if(filters.risk!=='all')query=query.eq('product->>risk',filters.risk);
 return query;
}
export async function loadHistoryPage(db:SupabaseClient,userId:string,filters:HistoryFilters){
 const start=(filters.page-1)*HISTORY_PAGE_SIZE;
 const base=db.from('scan_history').select('id,product,created_at',{count:'exact'}).eq('user_id',userId);
 const query=applyHistoryFilters(base as unknown as HistoryFilterQuery,filters) as unknown as typeof base;
 const {data,error,count}=await query.order('created_at',{ascending:false}).order('id',{ascending:false}).range(start,start+HISTORY_PAGE_SIZE-1);
 if(error)throw error;return {records:(data||[]).map(historyRecord).filter((v):v is HistoryRecord=>v!==null),total:count||0};
}
export async function loadHistoryRecord(db:SupabaseClient,userId:string,id:string){if(!historyId(id))return null;const {data,error}=await db.from('scan_history').select('id,product,created_at').eq('user_id',userId).eq('id',id).maybeSingle();if(error)throw error;return data?historyRecord(data):null;}
export async function deleteHistoryRecord(db:SupabaseClient,userId:string,id:string){if(!historyId(id))throw new Error('Invalid record ID.');const {data,error}=await db.from('scan_history').delete().eq('user_id',userId).eq('id',id).select('id').maybeSingle();if(error)throw error;return !!data;}
export function historyBadge(status:HistoryRecord['status']){return {unsafe:{label:'Not Safe',tone:'red'},caution:{label:'Caution',tone:'yellow'},clear:{label:'No known conflict',tone:'green'},unknown:{label:'Unknown',tone:'gray'}}[status];}
export const historyMethodLabels={barcode:'Barcode scan',ingredients:'Ingredient analysis',image:'Image-assisted label',product:'Product lookup',unspecified:'Method not recorded'};



