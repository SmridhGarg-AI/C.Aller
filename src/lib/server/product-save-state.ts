import 'server-only';
import {serverSupabase} from '@/lib/supabase/server';
export async function productSaveState(code:string){
 const db=await serverSupabase();if(!db)return {signedIn:false,userId:'',favorite:false,favoriteUnavailable:false};
 try{const {data:{user}}=await db.auth.getUser();if(!user)return {signedIn:false,userId:'',favorite:false,favoriteUnavailable:false};const {data,error}=await db.from('favorites').select('product_code').eq('user_id',user.id).eq('product_code',code).maybeSingle();return {signedIn:true,userId:user.id,favorite:Boolean(data),favoriteUnavailable:Boolean(error)};}catch{return {signedIn:false,userId:'',favorite:false,favoriteUnavailable:true};}
}
