import {serverSupabase} from '@/lib/supabase/server';
import {createChatHandler} from '@/lib/chat-handler';
export const runtime='nodejs';
export async function POST(request:Request){
 let database:ReturnType<typeof serverSupabase>|undefined;
 const connection=()=>database??=serverSupabase();
 return createChatHandler({apiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,fetch,
 user:async()=>{const db=await connection();if(!db)return null;const {data,error}=await db.auth.getUser();return error?null:data.user?.id||null;},
 preferences:async id=>{const db=await connection();if(!db)throw new Error();const {data,error}=await db.from('profiles').select('preferences').eq('id',id).maybeSingle();if(error)throw error;return data?.preferences;},
 rateLimit:async()=>{const db=await connection();if(!db)throw new Error();const {data,error}=await db.rpc('consume_chat_quota');if(error||typeof data?.allowed!=='boolean'||typeof data?.retryAfter!=='number')throw new Error('Chat rate limit is not configured');return data;}
 })(request);
}
