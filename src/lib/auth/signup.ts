import type { SupabaseClient } from '@supabase/supabase-js';
export function normalizeName(name:string){return name.trim().replace(/\s+/g,' ');}
export function validateSignup(name:string,email:string,password:string){
 const clean=normalizeName(name);
 return {
  name:clean.length<2||clean.length>100||!/^\p{L}[\p{L}\p{M}\s.'’\-]*$/u.test(clean)?'Enter your name using 2–100 characters (letters, spaces, apostrophes or hyphens).':'',
  email:!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())||email.trim().length>254?'Enter a valid email address.':'',
  password:password.length<10||password.length>128||!/[\p{L}]/u.test(password)||!/[\p{N}\p{P}\p{S}]/u.test(password)?'Use 10–128 characters, including a letter and a number or symbol.':'',
 };
}
export function signupMessage(error:{code?:string}){
 switch(error.code){
 case 'user_already_exists':case 'email_exists':return 'Unable to create this account. Try signing in or resetting your password.';
 case 'weak_password':return 'Choose a stronger password. Avoid common or compromised passwords.';
 case 'email_address_invalid':return 'This email address could not be used. Please check it and try again.';
 case 'over_email_send_rate_limit':case 'over_request_rate_limit':return 'Too many requests. Wait a few minutes before trying again.';
 case 'signup_disabled':return 'New account registration is currently unavailable.';
 default:return 'We couldn’t create your account. Check your connection and try again.';
 }
}
/** Only auth metadata is written here; the profile is written when onboarding finishes. */
export async function createAccount(db:SupabaseClient,name:string,email:string,password:string,origin:string){
 const validation=validateSignup(name,email,password);
 if(Object.values(validation).some(Boolean))throw new Error('Invalid signup fields');
 return db.auth.signUp({email:email.trim(),password,options:{data:{full_name:normalizeName(name)},emailRedirectTo:origin+'/auth/callback'}});
}
