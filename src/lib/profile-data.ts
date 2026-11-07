import type {SupabaseClient} from '@supabase/supabase-js';
import {validateNameDraft} from './auth/onboarding-draft.ts';
import {validateDietDraft} from './auth/diet-draft.ts';
import {validateMedical} from './auth/medical-draft.ts';
import {validateAllergies,normalizeAllergy} from './auth/allergy-draft.ts';
export type ProfileData={id:string;name:string;email:string;preferences:Record<string,unknown>;version:string};
export type ProfileSection='personal'|'diet'|'allergies'|'medical'|'emergency'|'language';
export function initials(name:string){return name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>Array.from(x)[0]).join('').toUpperCase();}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const string=(v:unknown,max=120)=>{if(typeof v!=='string'||v.length>max||/[\u0000-\u001f<>]/.test(v))throw new Error('Enter valid text without markup or control characters.');return v.trim();};
const list=(v:unknown)=>{if(!Array.isArray(v)||v.length>30||!v.every(x=>typeof x==='string'&&x.length<=120))throw new Error('Invalid selections.');return [...new Set(v as string[])];};
export function profilePatch(current:Record<string,unknown>,section:unknown,input:unknown){
 const p={...current};const v=object(input);let fullName:string|undefined;
 if(section==='personal'){const name=string(v.name,100),age=string(v.age,40);const errors=validateNameDraft({name,age});if(errors.name||errors.age)throw new Error(errors.name||errors.age);fullName=name.replace(/\s+/g,' ');p.name=fullName;p.age=age;p.onboarding_draft={...object(p.onboarding_draft),name:fullName,age};}
 else if(section==='diet'){const draft={selected:list(v.selected),other:string(v.other),clarification:string(v.clarification)};const error=validateDietDraft(draft);if(error)throw new Error(error);p.diet=draft.selected;p.diet_other=draft.selected.includes('Other')?draft.other:'';p.diet_clarification=draft.clarification;}
 else if(section==='medical'){const draft={selected:list(v.selected),other:string(v.other)};const error=validateMedical(draft);if(error)throw new Error(error);p.medical=draft.selected;if(draft.selected.includes('Other')&&draft.other)p.medical_other=draft.other;else delete p.medical_other;}
 else if(section==='allergies'){if(typeof v.noKnown!=='boolean')throw new Error('Confirm your allergy selections.');const draft={selected:list(v.selected),custom:list(v.custom),noKnown:v.noKnown};const error=validateAllergies(draft);if(error)throw new Error(error);p.allergies=[...draft.selected,...draft.custom.map(normalizeAllergy)];p.no_known_allergies=draft.noKnown;const card=object(p.emergency_card);p.emergency_card={...card,allergies:Array.isArray(card.allergies)?card.allergies.filter(x=>(p.allergies as string[]).includes(String(x))):[]};}
 else if(section==='emergency'){const allergies=list(v.allergies);const saved=Array.isArray(p.allergies)?p.allergies:[];if(allergies.some(a=>!saved.includes(a)))throw new Error('Choose emergency-card allergies from your saved profile.');if(typeof v.showName!=='boolean')throw new Error('Choose whether to display your name.');const contactName=string(v.contactName,100),contactPhone=string(v.contactPhone,40),notes=string(v.notes,500);if(contactPhone&&!/^\+?[\d\s().-]{5,40}$/.test(contactPhone))throw new Error('Enter a valid emergency contact phone number.');p.emergency_card={allergies,showName:v.showName,contactName,contactPhone,notes};}
 else if(section==='language'){if(!['en','hi','es'].includes(String(v.language)))throw new Error('Choose a supported language.');p.language=v.language;}
 else throw new Error('Unknown profile section.');
 return {preferences:p,...(fullName?{full_name:fullName}:{})};
}
export async function persistProfilePatch(db:SupabaseClient,userId:string,version:string,section:unknown,input:unknown){
 const {data,error}=await db.from('profiles').select('preferences,updated_at').eq('id',userId).maybeSingle();if(error)throw error;if(!data)throw new Error('Complete onboarding before editing your profile.');if(data.updated_at!==version)throw new Error('Your profile changed in another tab. Reload your profile and try again.');
 const patch=profilePatch(object(data.preferences),section,input);const updated=await db.from('profiles').update({...patch,updated_at:new Date().toISOString()}).eq('id',userId).eq('updated_at',version).select('id').maybeSingle();if(updated.error)throw updated.error;if(!updated.data)throw new Error('Your profile changed while saving. Reload and try again.');
}
export async function signOutProfile(db:{auth:{signOut:(options:{scope:'local'})=>Promise<{error:unknown}>}},clear:()=>void){const {error}=await db.auth.signOut({scope:'local'});if(error)throw new Error('Sign out failed. Check your connection and try again.');clear();}
