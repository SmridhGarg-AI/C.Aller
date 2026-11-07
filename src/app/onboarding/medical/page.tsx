import MedicalSetup from '@/components/medical-setup';
import {serverSupabase} from '@/lib/supabase/server';
import {preferencesDraft,parseNameDraft} from '@/lib/auth/onboarding-draft';
import {profileMedical} from '@/lib/auth/medical-draft';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function MedicalPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const edit=(await searchParams).edit==='1';const db=await serverSupabase();let userId:string|null=null;let initial=profileMedical(null);let loadError=false;
 if(db){const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');userId=user.id;const {data,error}=await db.from('profiles').select('preferences').eq('id',user.id).maybeSingle();loadError=Boolean(error);
 if(!error&&!edit){if(!preferencesDraft(data?.preferences)&&!parseNameDraft(data?.preferences))redirect('/onboarding/name');if(!Array.isArray(data?.preferences?.diet))redirect('/onboarding/diet');}
 initial=profileMedical(data?.preferences);}
 return <MedicalSetup initial={initial} userId={userId} loadError={loadError} edit={edit}/>;
}
