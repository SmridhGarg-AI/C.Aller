import type { SupabaseClient } from '@supabase/supabase-js';
export const ageOptions=['Under 18','18–29','30–44','45–59','60+','Prefer not to say'] as const;
export type NameDraft={name:string;age:string};
export const draftKey=(userId:string|null)=>`aller-onboarding-v1:${userId||'demo'}`;
export function validateNameDraft(draft:NameDraft){return {name:!/^\p{L}[\p{L}\p{M}\s.'’\-]{1,99}$/u.test(draft.name.trim())?'Enter a valid name (2–100 characters).':'',age:!(ageOptions as readonly string[]).includes(draft.age)?'Select your age range, or choose Prefer not to say.':''};}
export function parseNameDraft(value:unknown):NameDraft|null {if(!value||typeof value!=='object')return null;const p=value as Record<string,unknown>;return typeof p.name==='string'&&typeof p.age==='string'?{name:p.name.slice(0,100),age:(ageOptions as readonly string[]).includes(p.age)?p.age:''}:null;}
export function preferencesDraft(value:unknown){return value&&typeof value==='object'?parseNameDraft((value as Record<string,unknown>).onboarding_draft):null;}
export async function saveNameDraft(db:SupabaseClient,userId:string,draft:NameDraft){
 if(Object.values(validateNameDraft(draft)).some(Boolean))throw new Error('Check your name and age range.');
 const {data:{user},error:authError}=await db.auth.getUser();if(authError)throw authError;if(!user||user.id!==userId)throw new Error('Your session expired. Sign in again to save your profile.');
 const {data:profile,error:readError}=await db.from('profiles').select('preferences').eq('id',user.id).maybeSingle();if(readError)throw readError;
 const name=draft.name.trim().replace(/\s+/g,' ');
 const {error}=await db.from('profiles').upsert({id:user.id,full_name:name,preferences:{...(profile?.preferences||{}),onboarding_draft:{name,age:draft.age,step:1}},updated_at:new Date().toISOString()});if(error)throw error;
}
