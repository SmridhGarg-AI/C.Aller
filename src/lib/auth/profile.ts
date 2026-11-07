import type { SupabaseClient } from '@supabase/supabase-js';
export type OnboardingPreferences={name:string;age:string;diet:string[];medical:string[];allergies:string[]};
export async function saveOnboardedProfile(db:SupabaseClient,preferences:OnboardingPreferences){
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError)throw authError;
 if(!user)throw new Error('Sign in before saving your profile.');
 const fullName=preferences.name.trim().replace(/\s+/g,' ');
 if(fullName.length<2||fullName.length>100)throw new Error('Enter a name between 2 and 100 characters.');
 const {error}=await db.from('profiles').upsert({id:user.id,full_name:fullName,preferences:{...preferences,name:fullName}});
 if(error)throw error;
}
