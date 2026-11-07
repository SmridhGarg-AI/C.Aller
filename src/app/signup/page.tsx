import { redirect } from 'next/navigation';
import SignupScreen from '@/components/signup-screen';
import { serverSupabase } from '@/lib/supabase/server';
import { postAuthDestination } from '@/lib/auth/flow';
export const dynamic='force-dynamic';
export default async function SignupPage(){
 const db=await serverSupabase();let destination:string|undefined;
 if(db){try{const {data:{user}}=await db.auth.getUser();if(user)destination=await postAuthDestination(db,user.id);}catch{/* Keep signup available with recoverable client errors. */}}
 if(destination)redirect(destination);
 return <SignupScreen/>;
}
