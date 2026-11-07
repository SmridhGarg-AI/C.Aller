import test from 'node:test';
import assert from 'node:assert/strict';
import { completedOnboarding, validateLogin, authMessage, callbackDestination, postAuthDestination } from '../src/lib/auth/flow.ts';
const preferences={name:'',age:'',diet:[],medical:[],allergies:[]};
function database(result){return {from(table){assert.equal(table,'profiles');return {select(columns){assert.equal(columns,'preferences');return {eq(column,userId){assert.equal(column,'id');assert.equal(userId,'user-123');return {async maybeSingle(){return result;}};}};}};}};}
test('reject missing and incomplete onboarding, accept the existing Finish payload',()=>{
 for(const value of [null,undefined,{},[],{name:'Alex'}, {...preferences,allergies:'Milk'}])assert.equal(completedOnboarding(value),false);
 assert.equal(completedOnboarding(preferences),true);
});
test('login validates email and missing password without imposing new signup rules on existing passwords',()=>{
 assert.ok(validateLogin('bad address','password').email);
 assert.ok(validateLogin('a@example.com','').password);
 assert.deepEqual(validateLogin('  a@example.com  ','short'),{email:'',password:''});
});
test('profile routing only considers the authenticated user record',async()=>{
 assert.equal(await postAuthDestination(database({data:null,error:null}),'user-123'),'/onboarding/name');
 assert.equal(await postAuthDestination(database({data:{preferences:{}},error:null}),'user-123'),'/onboarding/name');
 assert.equal(await postAuthDestination(database({data:{preferences},error:null}),'user-123'),'/home');
});
test('profile failures do not silently bypass onboarding',async()=>{
 await assert.rejects(postAuthDestination(database({data:null,error:new Error('network failure')}),'user-123'),/network failure/);
});
test('missing database tables route signed-in users to setup instead of suggesting another login',async()=>{
 for(const code of ['PGRST205','42P01'])assert.equal(await postAuthDestination(database({data:null,error:{code}}),'user-123'),'/setup');
});
test('callback permits only the local recovery destination',()=>{
 assert.equal(callbackDestination('/reset-password'),'/reset-password');
 for(const next of [null,'https://attacker.example','//attacker.example','/home','/reset-password?next=evil'])assert.equal(callbackDestination(next),null);
});
test('errors guide unverified users and avoid leaking account existence',()=>{
 assert.match(authMessage({code:'email_not_confirmed'}),/Confirm your email/);
 assert.match(authMessage({code:'invalid_credentials'}),/email or password is incorrect/);
 assert.match(authMessage({code:'over_request_rate_limit'}),/wait/);
 assert.equal(authMessage({message:'private backend detail'}).includes('private backend'),false);
});
