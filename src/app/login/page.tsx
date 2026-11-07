import { redirect } from 'next/navigation';
import AuthScreen from '@/components/auth-screen';
import { serverSupabase } from '@/lib/supabase/server';
import { postAuthDestination } from '@/lib/auth/flow';
export default async function LoginPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const query=await searchParams;
 const db=await serverSupabase();
 let destination:string|undefined;
 let initialError=query.error ? 'The sign-in or recovery link could not be used. It may have expired or been opened in another browser. Please try again.' : '';
 if(query.error==='callback_cookie')initialError='The sign-in browser cookie is missing. Open http://localhost:3000/login in your regular browser, allow cookies for localhost, and start Google sign-in again in the same tab. Do not switch between localhost and 127.0.0.1.';
 if(query.error==='callback_network')initialError='Google authorization finished, but the app could not reach Supabase to create your session. Check your connection and try Google sign-in again.';
 const oauthErrors:Record<string,string>={
  oauth_bad_code_verifier:'Google sign-in verification did not match. Start again using Continue with Google in this tab. (bad_code_verifier)',
  oauth_flow_state_not_found:'Supabase could not find this sign-in attempt. Start a fresh Google sign-in and complete it once. (flow_state_not_found)',
  oauth_flow_state_expired:'This Google sign-in attempt expired. Start again. (flow_state_expired)',
  oauth_access_denied:'Google sign-in was denied. If your Google app is in Testing, add your Google email under Google Auth Platform → Audience → Test users. (access_denied)',
  oauth_unexpected_failure:'Supabase could not complete Google sign-in. Check the Google Client ID and secret in Supabase and inspect Authentication logs. (unexpected_failure)',
  oauth_provider_disabled:'Google sign-in is disabled in Supabase. Enable the Google provider. (provider_disabled)',
  oauth_validation_failed:'Supabase rejected the Google configuration. Check its Google Client ID and Client secret. (validation_failed)',
 };
 if(typeof query.error==='string'&&oauthErrors[query.error])initialError=oauthErrors[query.error];
 if(db){try{const {data:{user},error}=await db.auth.getUser();if(user)destination=await postAuthDestination(db,user.id);else if(error && error.name!=='AuthSessionMissingError' && error.status!==401 && error.status!==403)initialError='We couldn’t check your session. Check your connection and try again.';}catch{initialError='We couldn’t load your profile. Please sign in again to retry.';}}
 if(destination)redirect(destination);
 return <AuthScreen mode="login" initialError={initialError} initialMessage={query.reset==='success'?'Password updated. Sign in with your new password.':''}/>;
}
