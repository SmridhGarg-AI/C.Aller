import 'server-only';
import {serverSupabase} from '@/lib/supabase/server';
import type {AllergyProfile} from '@/lib/allergen-assessment';
export async function screeningProfile():Promise<{profile:AllergyProfile|null;status:string}>{
 try{const db=await serverSupabase();if(!db)return {profile:null,status:'unconfigured'};const {data:{user},error}=await db.auth.getUser();if(error||!user)return {profile:null,status:'signed-out'};
 const {data,error:readError}=await db.from('profiles').select('preferences').eq('id',user.id).maybeSingle();if(readError)return {profile:null,status:'unavailable'};const p=data?.preferences;if(!p||!Array.isArray(p.allergies)||!p.allergies.every((x:unknown)=>typeof x==='string')||(!p.allergies.length&&p.no_known_allergies!==true))return {profile:null,status:'incomplete'};
 return {profile:{allergies:p.allergies,noKnown:p.no_known_allergies===true},status:'ready'};
 }catch{return {profile:null,status:'unavailable'};}
}
