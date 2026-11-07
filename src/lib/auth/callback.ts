import type { SupabaseClient } from '@supabase/supabase-js';
import { callbackDestination, postAuthDestination } from './flow.ts';

export function callbackFailure(error: unknown) {
  const failure = error as {code?: string; name?: string; status?: number};
  if (failure?.code === 'pkce_code_verifier_not_found' || failure?.name === 'AuthPKCECodeVerifierMissingError') return '/login?error=callback_cookie';
  if (failure?.name === 'AuthRetryableFetchError' || failure?.name === 'TypeError' || (failure?.status ?? 0) >= 500) return '/login?error=callback_network';
  const known=['bad_code_verifier','flow_state_not_found','flow_state_expired','access_denied','unexpected_failure','provider_disabled','validation_failed'];
  if(failure?.code&&known.includes(failure.code))return '/login?error=oauth_'+failure.code;
  return '/login?error=callback';
}

export async function finishAuthCallback(db: SupabaseClient, code: string, next: string | null, flowId?: string) {
  try {
    const { data, error } = await db.auth.exchangeCodeForSession(code, flowId ? {flowId} : undefined);
    if (error) return callbackFailure(error);
    if (!data.user) return '/login?error=callback';
    const recovery = callbackDestination(next);
    if (recovery) return recovery;
    try {
      return await postAuthDestination(db, data.user.id);
    } catch {
      // The session is valid. Onboarding displays a profile-load error and retry.
      return '/onboarding/name';
    }
  } catch (error) {
    return callbackFailure(error);
  }
}
