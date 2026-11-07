import test from 'node:test';
import assert from 'node:assert/strict';
import { finishAuthCallback, callbackFailure } from '../src/lib/auth/callback.ts';

function client({ exchangeError=null, profileError=null, complete=false }={}) {
  return {
    auth: { async exchangeCodeForSession(code) {
      assert.equal(code,'fresh-code');
      return {data:{user:exchangeError?null:{id:'user-1'}},error:exchangeError};
    } },
    from() { return {select() {return {eq() {return {async maybeSingle() {
      return {data:{preferences:{onboarding_completed:complete}},error:profileError};
    } };} };} };},
  };
}
test('valid OAuth session survives a missing or unavailable profile table',async()=>{
  assert.equal(await finishAuthCallback(client({profileError:new Error('missing table')}),'fresh-code',null),'/onboarding/name');
});
test('OAuth with an unprovisioned database preserves session and opens setup',async()=>{
 assert.equal(await finishAuthCallback(client({profileError:{code:'PGRST205'}}),'fresh-code',null),'/setup');
});
test('callback routes completed and new users correctly',async()=>{
  assert.equal(await finishAuthCallback(client({complete:true}),'fresh-code',null),'/home');
  assert.equal(await finishAuthCallback(client(),'fresh-code',null),'/onboarding/name');
});
test('failed exchanges cannot proceed to onboarding or password recovery',async()=>{
  assert.equal(await finishAuthCallback(client({exchangeError:new Error('invalid verifier')}),'fresh-code','/reset-password'),'/login?error=callback');
});
test('authenticated recovery bypasses profile lookup',async()=>{
  assert.equal(await finishAuthCallback(client({profileError:new Error('offline')}),'fresh-code','/reset-password'),'/reset-password');
});
test('cookie and network failures have distinct actionable destinations',()=>{
 assert.equal(callbackFailure({name:'AuthPKCECodeVerifierMissingError'}),'/login?error=callback_cookie');
 assert.equal(callbackFailure({name:'AuthRetryableFetchError'}),'/login?error=callback_network');
 assert.equal(callbackFailure({status:503}),'/login?error=callback_network');
 assert.equal(callbackFailure({code:'flow_state_expired'}),'/login?error=oauth_flow_state_expired');
});
