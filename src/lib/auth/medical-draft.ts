import type {SupabaseClient} from '@supabase/supabase-js';
export const medicalOptions=['Diabetes','High blood pressure','Heart condition','Digestive issues','None','Other'] as const;
export type MedicalDraft={selected:string[];other:string};
export function toggleMedical(draft:MedicalDraft,option:string):MedicalDraft{
 if(!(medicalOptions as readonly string[]).includes(option))return draft;
 if(draft.selected.includes(option))return {...draft,selected:draft.selected.filter(x=>x!==option)};
 return {...draft,selected:option==='None'?['None']:[...draft.selected.filter(x=>x!=='None'),option]};
}
export function validateMedical(draft:MedicalDraft){
 if(!draft.selected.every(x=>(medicalOptions as readonly string[]).includes(x)))return 'Choose from the listed options.';
 if(draft.selected.includes('None')&&draft.selected.length>1)return 'Choose None by itself, or select the conditions that apply.';
 if(draft.selected.includes('Other')&&(draft.other.trim().length>120||/[\u0000-\u001f]/.test(draft.other)))return 'Keep the optional description to 120 characters on one line.';
 return '';
}
export function profileMedical(value:unknown):MedicalDraft{
 const p=(value&&typeof value==='object'?value:{}) as Record<string,unknown>;
 const selected=Array.isArray(p.medical)?[...new Set(p.medical.filter((x):x is string=>typeof x==='string'&&(medicalOptions as readonly string[]).includes(x)))]:[];
 return {selected,other:typeof p.medical_other==='string'?p.medical_other.slice(0,120):''};
}
export async function saveMedical(db:SupabaseClient,userId:string,draft:MedicalDraft,edit=false){
 const invalid=validateMedical(draft);if(invalid)throw new Error(invalid);
 const {data:{user},error:authError}=await db.auth.getUser();if(authError)throw authError;if(!user||user.id!==userId)throw new Error('Session expired.');
 const {data:profile,error:readError}=await db.from('profiles').select('preferences').eq('id',user.id).maybeSingle();if(readError)throw readError;if(!profile)throw new Error('Profile missing.');
 const p=profile.preferences||{};
 const {error}=await db.from('profiles').update({preferences:{...p,medical:[...new Set(draft.selected)],medical_other:draft.selected.includes('Other')?draft.other.trim():'',...(!edit?{onboarding_draft:{...p.onboarding_draft,step:3}}:{})},updated_at:new Date().toISOString()}).eq('id',user.id).select('id').single();if(error)throw error;
}
/** Explicit allowlist for ordinary browser preferences: medical data stays in the private profile. */
export function nonMedicalPreferences(p:{name:string;age:string;diet:string[];allergies:string[];diet_other?:string;diet_clarification?:string}){
 return {name:p.name,age:p.age,diet:p.diet,allergies:p.allergies,diet_other:p.diet_other,diet_clarification:p.diet_clarification};
}
