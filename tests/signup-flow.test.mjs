import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSignup, normalizeName, createAccount, signupMessage } from '../src/lib/auth/signup.ts';
import { saveOnboardedProfile } from '../src/lib/auth/profile.ts';
const password='Example-password-42';
const preferences={name:'  Ana   María  ',age:'18–29',diet:[],medical:[],allergies:['Milk']};
test('accept Unicode names and normalize spaces without requiring multiple names',()=>{
 for(const name of ['Smridh','Ana María',"O’Connor",'李明','Jean-Luc'])assert.equal(validateSignup(name,'test@example.com',password).name,'');
 assert.equal(normalizeName(' Ana   María '),'Ana María');
 for(const name of ['', ' A ', '1234','<script>'])assert.ok(validateSignup(name,'test@example.com',password).name);
});
test('validate email and reject weak or oversized passwords',()=>{
 assert.ok(validateSignup('Alex','invalid',password).email);
 for(const weak of ['', 'short1', 'justletterslong', '12345678901', 'a'.repeat(129)+'1'])assert.ok(validateSignup('Alex','test@example.com',weak).password);
 assert.deepEqual(validateSignup('Alex',' test@example.com ',password),{name:'',email:'',password:''});
});
test('signup carries name metadata and preserves a confirmation-required response without profile writes',async()=>{
 let calls=0;
 const response={data:{user:{id:'u1'},session:null},error:null};
 const db={auth:{async signUp(payload){calls++;assert.deepEqual(payload,{email:'test@example.com',password,options:{data:{full_name:'Ana María'},emailRedirectTo:'https://app.example/auth/callback'}});return response;}}};
 assert.equal(await createAccount(db,' Ana  María ',' test@example.com ',password,'https://app.example'),response);
 assert.equal(calls,1);
});
test('active-session signup response and API errors are returned to caller',async()=>{
 for(const response of [{data:{session:{user:{id:'u1'}}},error:null},{data:{session:null},error:{code:'weak_password'}}]){
  assert.equal(await createAccount({auth:{async signUp(){return response;}}},'Alex','test@example.com',password,'https://app.example'),response);
 }
});
test('invalid input never reaches Supabase',async()=>{
 await assert.rejects(createAccount({auth:{signUp(){assert.fail('Should not call signup');}}},'','invalid','short','https://app.example'),/Invalid signup/);
});
test('profile is saved under the verified user id after onboarding, with no password field',async()=>{
 let saved;
 const db={auth:{async getUser(){return {data:{user:{id:'verified-user'}},error:null};}},from(table){assert.equal(table,'profiles');return {async upsert(row){saved=row;return {error:null};}};}};
 await saveOnboardedProfile(db,preferences);
 assert.deepEqual(saved,{id:'verified-user',full_name:'Ana María',preferences:{...preferences,name:'Ana María'}});
 assert.equal(JSON.stringify(saved).includes('password'),false);
});
test('unauthenticated and failed-auth onboarding never write a profile',async()=>{
 for(const result of [{data:{user:null},error:null},{data:{user:null},error:new Error('expired')}]){
  await assert.rejects(saveOnboardedProfile({auth:{async getUser(){return result;}},from(){assert.fail('Must not write');}},preferences));
 }
});
test('profile write failures remain failures, enabling retry rather than navigation',async()=>{
 await assert.rejects(saveOnboardedProfile({auth:{async getUser(){return {data:{user:{id:'u1'}},error:null};}},from(){return {async upsert(){return {error:new Error('write failed')};}};}},preferences),/write failed/);
});
test('safe signup errors guide user without exposing backend details',()=>{
 assert.match(signupMessage({code:'weak_password'}),/stronger/);
 assert.match(signupMessage({code:'email_exists'}),/signing in/);
 assert.match(signupMessage({code:'over_email_send_rate_limit'}),/Wait/);
 assert.match(signupMessage({code:'unknown'}),/connection/);
});
