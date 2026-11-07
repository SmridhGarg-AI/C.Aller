import AllergySetup from '@/components/allergy-setup';
import {serverSupabase} from '@/lib/supabase/server';
import {preferencesDraft,parseNameDraft} from '@/lib/auth/onboarding-draft';
import {profileAllergies} from '@/lib/auth/allergy-draft';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function AllergiesPage(){
 const db=await serverSupabase();let userId:string|null=null;let initial=profileAllergies(null);let loadError=false;
 if(db){const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');userId=user.id;const {data,error}=await db.from('profiles').select('preferences').eq('id',user.id).maybeSingle();loadError=Boolean(error);if(!error){const p=data?.preferences;if(!preferencesDraft(p)&&!parseNameDraft(p))redirect('/onboarding/name');if(!Array.isArray(p?.medical))redirect('/onboarding/medical');}initial=profileAllergies(data?.preferences);}
 return <AllergySetup initial={initial} userId={userId} loadError={loadError}/>;
}
