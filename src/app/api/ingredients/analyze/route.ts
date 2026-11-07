import {serverSupabase} from '@/lib/supabase/server';
import {createIngredientAnalysisHandler} from '@/lib/ingredient-analysis-handler';
export async function POST(request:Request){
 const db=await serverSupabase();
 return createIngredientAnalysisHandler({loadProfile:async()=>{
  if(!db)return null;const {data:{user},error}=await db.auth.getUser();if(error||!user)return null;
  const {data,error:profileError}=await db.from('profiles').select('preferences').eq('id',user.id).maybeSingle();if(profileError)throw profileError;const p=data?.preferences;
  if(!p||!Array.isArray(p.allergies)||!p.allergies.every((a:unknown)=>typeof a==='string'&&a.length<=100)||p.allergies.length>100||(p.allergies.length>0&&p.no_known_allergies===true)||(!p.allergies.length&&p.no_known_allergies!==true))return null;
  return {userId:user.id,profile:{allergies:p.allergies,noKnown:p.no_known_allergies===true}};
 },save:async row=>{if(!db)throw new Error('Not configured');const {error}=await db.from('scan_history').upsert(row,{onConflict:'id',ignoreDuplicates:true});if(error)throw error;}})(request);
}

