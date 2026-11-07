import type {SupabaseClient} from '@supabase/supabase-js';
import type {SearchProduct} from './search-data';
import type {Assessment} from './allergen-assessment';
import {validScanId} from './scan-result-data.ts';
async function verifiedUser(db:SupabaseClient,expectedUser:string){const {data:{user},error}=await db.auth.getUser();if(error)throw error;if(!user||user.id!==expectedUser)throw new Error('Sign in again before saving.');return user;}
async function historyWrite(db:SupabaseClient,userId:string,product:Record<string,unknown>,scanId?:string){if(scanId&&!validScanId(scanId))throw new Error('Invalid scan identifier.');const row={user_id:userId,product,...(scanId?{id:scanId}:{})};const result=scanId?await db.from('scan_history').upsert(row,{onConflict:'id',ignoreDuplicates:true}):await db.from('scan_history').insert(row);if(result.error)throw result.error;}
export async function productAction(db:SupabaseClient,expectedUser:string,product:SearchProduct,action:'favorite'|'unfavorite'|'history',assessment:Assessment,scanId?:string){
 const user=await verifiedUser(db,expectedUser);
 const snapshot={code:product.code,name:product.name,brand:product.brand,image:product.image,ingredients:product.ingredients,allergens:product.allergens,source:product.source};
 if(action==='favorite'){const {error}=await db.from('favorites').upsert({user_id:user.id,product_code:product.code,product:snapshot},{onConflict:'user_id,product_code'});if(error)throw error;}
 else if(action==='unfavorite'){const {error}=await db.from('favorites').delete().eq('user_id',user.id).eq('product_code',product.code);if(error)throw error;}
 else await historyWrite(db,user.id,{...snapshot,method:scanId?'barcode':'product',risk:assessment.risk,assessment:{label:assessment.label,reasons:assessment.reasons,source:'Aller Matrix screening of Open Food Facts data'},assessed_at:new Date().toISOString()},scanId);
}
export async function saveUnknownScan(db:SupabaseClient,expectedUser:string,code:string,scanId?:string){const user=await verifiedUser(db,expectedUser);await historyWrite(db,user.id,{code,method:'barcode',name:'Unknown product',brand:'',ingredients:'',allergens:'',image:null,risk:'unknown',lookup_status:'not-found',source:'Open Food Facts',assessment:{label:'Unknown',reasons:['Product not found. No ingredient or allergen data is available.']}},scanId);}

