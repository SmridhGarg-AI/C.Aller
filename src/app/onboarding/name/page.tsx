import NameSetup from '@/components/name-setup';
import { serverSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { preferencesDraft } from '@/lib/auth/onboarding-draft';
export const dynamic='force-dynamic';
export default async function OnboardingNamePage(){
 const db=await serverSupabase();let userId:string|null=null;let initial={name:'',age:''};let loadError=false;
 if(db){
  const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');userId=user.id;
  const name=user.user_metadata.full_name??user.user_metadata.name;initial.name=typeof name==='string'?name.slice(0,100):'';
  const {data,error}=await db.from('profiles').select('full_name,preferences').eq('id',user.id).maybeSingle();
  loadError=Boolean(error);initial=preferencesDraft(data?.preferences)||{name:data?.full_name||initial.name,age:''};
 }
 return <NameSetup initial={initial} userId={userId} loadError={loadError}/>;
}
