import type {SupabaseClient} from '@supabase/supabase-js';
import {completedOnboarding} from './auth/flow.ts';
export type InitializationProgress={completed:number;label:string};
export type ApplicationState={userId:string;profile:{fullName:string;preferences:Record<string,unknown>};screening:{allergies:string[];noKnownAllergies:boolean;diet:string[]};historyScope:string};
export class InitializationError extends Error{
 code:'configuration'|'session'|'profile'|'incomplete'|'network'|'timeout';
 constructor(code:InitializationError['code'],message:string){super(message);this.code=code;this.name='InitializationError';}
}
function stringList(value:unknown){return Array.isArray(value)&&value.every(x=>typeof x==='string');}
/** One initialization pipeline; no medical data leaves Supabase or browser memory. */
export async function initializeApplication(db:SupabaseClient|null,progress:(value:InitializationProgress)=>void,signal:AbortSignal):Promise<ApplicationState>{
 if(!db)throw new InitializationError('configuration','Supabase is not configured. Add the project URL and publishable key, then restart the app.');
 signal.throwIfAborted();progress({completed:0,label:'Checking your session…'});
 const {data:{user},error:authError}=await db.auth.getUser();signal.throwIfAborted();
 if(authError||!user){if(!user&&(!authError||authError.name==='AuthSessionMissingError'||authError.status===401||authError.status===403))throw new InitializationError('session','Your session has expired or you are signed out. Sign in to continue.');throw new InitializationError('network','We couldn’t verify your session. Check your connection and try again.');}
 progress({completed:1,label:'Loading your saved profile…'});
 const {data:profile,error}=await db.from('profiles').select('id,full_name,preferences').eq('id',user.id).abortSignal(signal).maybeSingle();signal.throwIfAborted();
 if(error)throw new InitializationError('network','We couldn’t load your profile. Check your connection and try again.');
 if(!profile)throw new InitializationError('incomplete','Your profile hasn’t been set up yet. Complete onboarding to continue.');
 const p=profile.preferences;
 if(!completedOnboarding(p))throw new InitializationError('incomplete','Your profile setup is not complete. Finish onboarding to continue.');
 if(profile.id!==user.id||!p||typeof p!=='object'||!stringList(p.allergies)||!stringList(p.diet)||typeof profile.full_name!=='string'||!profile.full_name.trim()||(p.no_known_allergies===true&&p.allergies.length>0))throw new InitializationError('profile','Your saved profile needs attention. Review your preferences before continuing.');
 progress({completed:2,label:'Preparing your food preferences…'});
 const state:ApplicationState={userId:user.id,profile:{fullName:profile.full_name,preferences:p},screening:{allergies:[...p.allergies],noKnownAllergies:p.no_known_allergies===true,diet:[...p.diet]},historyScope:`user:${user.id}`};
 const {data:{user:current},error:currentError}=await db.auth.getUser();signal.throwIfAborted();if(currentError||current?.id!==user.id)throw new InitializationError('session','Your session changed during setup. Sign in again to continue.');
 signal.throwIfAborted();progress({completed:3,label:'Your profile is ready.'});return state;
}
