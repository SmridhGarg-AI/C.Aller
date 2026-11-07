import DietSetup from '@/components/diet-setup';
import {serverSupabase} from '@/lib/supabase/server';
import {preferencesDraft} from '@/lib/auth/onboarding-draft';
import {profileDietDraft} from '@/lib/auth/diet-draft';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function DietPage(){
 const db=await serverSupabase();let userId:string|null=null;let initial=profileDietDraft(null);let loadError=false;
 if(db){const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');userId=user.id;const {data,error}=await db.from('profiles').select('preferences').eq('id',user.id).maybeSingle();loadError=Boolean(error);if(!error&&!preferencesDraft(data?.preferences))redirect('/onboarding/name');initial=profileDietDraft(data?.preferences);}
 return <DietSetup initial={initial} userId={userId} loadError={loadError}/>;
}
