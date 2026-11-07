import { redirect } from 'next/navigation';
import AuthScreen from '@/components/auth-screen';
import { serverSupabase } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function ResetPasswordPage(){
 const db=await serverSupabase();
 if(!db)return <AuthScreen mode="reset" initialError="Supabase is not configured. Password recovery is unavailable."/>;
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/login?error=recovery');
 return <AuthScreen mode="reset"/>;
}
