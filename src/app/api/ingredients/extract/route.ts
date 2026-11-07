import {serverSupabase} from '@/lib/supabase/server';
import {createIngredientExtractionHandler} from '@/lib/ingredient-extraction';
export const runtime='nodejs';
export async function POST(request:Request){
 return createIngredientExtractionHandler({apiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,fetch,getUserId:async()=>{const db=await serverSupabase();if(!db)return null;const {data,error}=await db.auth.getUser();return error?null:data.user?.id||null;}})(request);
}
