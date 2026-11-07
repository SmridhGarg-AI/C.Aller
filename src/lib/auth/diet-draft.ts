import type { SupabaseClient } from '@supabase/supabase-js';
export const dietOptions=['Vegetarian','Vegan','Pescatarian','Halal','Keto','Gluten free','Low sugar','Other'] as const;
export type DietDraft={selected:string[];other:string;clarification:string};
export const dietDraftKey=(userId:string|null)=>`aller-onboarding-diet-v1:${userId||'demo'}`;
export const clarificationOptions=['These describe different meals or days','I’m transitioning between these diets','Keep both as flexible preferences'] as const;
export function dietConflicts(selected:string[]){return selected.includes('Pescatarian')?['Vegan','Vegetarian'].filter(x=>selected.includes(x)).map(x=>`${x} and Pescatarian`):[];}
export function parseDietDraft(value:unknown):DietDraft|null{
 if(!value||typeof value!=='object')return null;const p=value as Record<string,unknown>;
 if(!Array.isArray(p.selected)||!p.selected.every(x=>typeof x==='string'&&(dietOptions as readonly string[]).includes(x)))return null;
 return {selected:[...new Set(p.selected as string[])],other:typeof p.other==='string'?p.other.slice(0,120):'',clarification:typeof p.clarification==='string'&&(clarificationOptions as readonly string[]).includes(p.clarification)?p.clarification:''};
}
export function profileDietDraft(preferences:unknown):DietDraft{
 const p=(preferences&&typeof preferences==='object'?preferences:{}) as Record<string,unknown>;
 return parseDietDraft({selected:p.diet||[],other:p.diet_other,clarification:p.diet_clarification})||{selected:[],other:'',clarification:''};
}
export function validateDietDraft(draft:DietDraft){
 if(!draft.selected.every(x=>(dietOptions as readonly string[]).includes(x)))return 'Choose preferences from the listed options.';
 if(draft.selected.includes('Other')&&(draft.other.trim().length<2||draft.other.trim().length>120))return 'Describe your other preference in 2–120 characters.';
 if(dietConflicts(draft.selected).length&&!(clarificationOptions as readonly string[]).includes(draft.clarification))return 'Please clarify how your selected diets fit together below.';
 return '';
}
export async function saveDietDraft(db:SupabaseClient,userId:string,draft:DietDraft){
 const validation=validateDietDraft(draft);if(validation)throw new Error(validation);
 const {data:{user},error:authError}=await db.auth.getUser();if(authError)throw authError;if(!user||user.id!==userId)throw new Error('Your session expired. Sign in again.');
 const {data,error:readError}=await db.from('profiles').select('preferences').eq('id',user.id).maybeSingle();if(readError)throw readError;if(!data)throw new Error('Complete your name and age first.');
 const p=data.preferences||{};
 const {error}=await db.from('profiles').update({preferences:{...p,diet:[...new Set(draft.selected)],diet_other:draft.selected.includes('Other')?draft.other.trim():'',diet_clarification:dietConflicts(draft.selected).length?draft.clarification:'',onboarding_draft:{...p.onboarding_draft,step:2}},updated_at:new Date().toISOString()}).eq('id',user.id).select('id').single();
 if(error)throw error;
}
