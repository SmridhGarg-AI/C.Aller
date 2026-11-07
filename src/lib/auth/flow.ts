import type { SupabaseClient } from '@supabase/supabase-js';

export function completedOnboarding(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  if (typeof p.onboarding_completed === 'boolean') return p.onboarding_completed;
  return typeof p.name === 'string' && typeof p.age === 'string' &&
    ['diet', 'medical', 'allergies'].every(key => Array.isArray(p[key]));
}
export function validateLogin(email: string, password: string) {
  return {
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Enter a valid email address.' : '',
    password: !password ? 'Enter your password.' : '',
  };
}
export function authMessage(error: {code?: string; message?: string}) {
  switch (error.code) {
    case 'email_not_confirmed': return 'Confirm your email before signing in. Check your inbox and spam folder for the verification link, or request a new email below.';
    case 'invalid_credentials': return 'The email or password is incorrect. Try again, or reset your password. If you joined with Google, use Continue with Google.';
    case 'over_request_rate_limit': case 'over_email_send_rate_limit': return 'Too many attempts. Please wait a few minutes before trying again.';
    default: return 'We couldn’t complete your request. Check your connection and try again.';
  }
}
export function callbackDestination(next: string | null) { return next === '/reset-password' ? '/reset-password' : null; }
export async function postAuthDestination(db: SupabaseClient, userId: string) {
  const {data,error} = await db.from('profiles').select('preferences').eq('id',userId).maybeSingle();
  if(error) {
    if(error.code==='PGRST205' || error.code==='42P01') return '/setup';
    throw error;
  }
  return completedOnboarding(data?.preferences) ? '/home' : '/onboarding/name';
}
