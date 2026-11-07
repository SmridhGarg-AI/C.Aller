import type {SupabaseClient} from '@supabase/supabase-js';
export const allergyOptions=['Milk','Eggs','Peanuts','Tree nuts','Fish','Shellfish','Wheat','Soy','Sesame'] as const;
export type AllergyDraft={selected:string[];custom:string[];noKnown:boolean};
export const allergyDraftKey=(userId:string|null)=>`aller-allergies-v1:${userId||'demo'}`;
export const normalizeAllergy=(name:string)=>name.normalize('NFKC').trim().replace(/\s+/g,' ');
export function customAllergyError(name:string,custom:string[]){const clean=normalizeAllergy(name);if(clean.length<2||clean.length>60||/[\u0000-\u001f<>]/.test(name))return 'Enter 2–60 characters without markup or control characters.';if((allergyOptions as readonly string[]).some(x=>x.toLowerCase()===clean.toLowerCase()))return 'This allergy is already in the grid. Select its card instead.';if(custom.some(x=>normalizeAllergy(x).toLowerCase()===clean.toLowerCase()))return 'You have already added this allergy.';if(custom.length>=20)return 'You can add up to 20 custom allergies.';return '';}
export function validateAllergies(draft:AllergyDraft){if(!draft.selected.every(x=>(allergyOptions as readonly string[]).includes(x)))return 'Choose allergies from the listed cards.';if(draft.noKnown&&(draft.selected.length||draft.custom.length))return 'No known allergies cannot be combined with selected allergies.';if(!draft.noKnown&&!draft.selected.length&&!draft.custom.length)return 'Select an allergy, add your own, or choose No known allergies.';for(let i=0;i<draft.custom.length;i++){const error=customAllergyError(draft.custom[i],draft.custom.slice(0,i));if(error)return error;}return '';}
export function profileAllergies(value:unknown):AllergyDraft{
 const p=(value&&typeof value==='object'?value:{}) as Record<string,unknown>;const items=Array.isArray(p.allergies)?p.allergies.filter((x):x is string=>typeof x==='string'):[];
 const selected=[...new Set(items.filter(x=>(allergyOptions as readonly string[]).includes(x)))];const custom:string[]=[];
 for(const item of items.filter(x=>!(allergyOptions as readonly string[]).includes(x))){if(!customAllergyError(item,custom))custom.push(normalizeAllergy(item));}
 return {selected,custom,noKnown:p.no_known_allergies===true&&!selected.length&&!custom.length};
}
export function parseAllergyDraft(value:unknown):AllergyDraft|null{if(!value||typeof value!=='object')return null;const p=value as Record<string,unknown>;if(!Array.isArray(p.selected)||!Array.isArray(p.custom)||typeof p.noKnown!=='boolean'||![...p.selected,...p.custom].every(x=>typeof x==='string'))return null;return profileAllergies({allergies:[...p.selected,...p.custom],no_known_allergies:p.noKnown});}
export async function finishAllergies(db:SupabaseClient,userId:string,draft:AllergyDraft){
 const invalid=validateAllergies(draft);if(invalid)throw new Error(invalid);
 const {data:{user},error:authError}=await db.auth.getUser();if(authError)throw authError;if(!user||user.id!==userId)throw new Error('Session expired.');
 const {data:profile,error:readError}=await db.from('profiles').select('preferences').eq('id',user.id).maybeSingle();if(readError)throw readError;if(!profile)throw new Error('Profile missing.');const p=profile.preferences||{};const name=p.onboarding_draft?.name??p.name;const age=p.onboarding_draft?.age??p.age;
 if(typeof name!=='string'||name.trim().length<2||typeof age!=='string'||!Array.isArray(p.diet)||!Array.isArray(p.medical))throw new Error('Complete the earlier profile steps first.');
 const {error}=await db.from('profiles').update({full_name:name.trim(),preferences:{...p,name,age,allergies:[...new Set([...draft.selected,...draft.custom.map(normalizeAllergy)])],no_known_allergies:draft.noKnown,onboarding_completed:true,onboarding_draft:{...p.onboarding_draft,step:4}},updated_at:new Date().toISOString()}).eq('id',user.id).select('id').single();if(error)throw error;
}
