import test from 'node:test';
import assert from 'node:assert/strict';
import {ageOptions,draftKey,parseNameDraft,preferencesDraft,saveNameDraft,validateNameDraft} from '../src/lib/auth/onboarding-draft.ts';
import {completedOnboarding} from '../src/lib/auth/flow.ts';
const draft={name:' Ana María ',age:'30–44'};
function db({user={id:'u1'},authError=null,readError=null,writeError=null,preferences={diet:['Vegan']}}={}){
 const writes=[];
 return {writes,auth:{async getUser(){return {data:{user},error:authError};}},from(table){assert.equal(table,'profiles');return {select(){return {eq(key,id){assert.equal(key,'id');assert.equal(id,'u1');return {async maybeSingle(){return {data:{preferences},error:readError};}};}};},async upsert(row){writes.push(row);return {error:writeError};}};}};
}
test('requires a name and a listed age range, accepting explicit age privacy choice',()=>{
 assert.deepEqual(validateNameDraft(draft),{name:'',age:''});
 for(const age of ['', '1998-04-01','27','invalid'])assert.ok(validateNameDraft({...draft,age}).age);
 for(const name of ['', '1', '<script>'])assert.ok(validateNameDraft({...draft,name}).name);
 assert.equal(validateNameDraft({...draft,age:'Prefer not to say'}).age,'');
 assert.equal(ageOptions.some(age=>age.includes('birth')),false);
});
test('scopes persisted drafts by user, separately from demo',()=>{
 assert.notEqual(draftKey('u1'),draftKey('u2'));assert.notEqual(draftKey(null),draftKey('u1'));
});
test('restores valid stored values and discards malformed drafts and invalid ages',()=>{
 for(const value of [null,{},'bad',{name:3,age:'18–29'}])assert.equal(parseNameDraft(value),null);
 assert.deepEqual(parseNameDraft(draft),draft);assert.equal(parseNameDraft({...draft,age:'birthdate'}).age,'');
 assert.deepEqual(preferencesDraft({onboarding_draft:draft}),draft);
});
test('saves verified user name and age draft while preserving existing preferences',async()=>{
 const client=db();await saveNameDraft(client,'u1',draft);
 assert.equal(client.writes.length,1);const row=client.writes[0];assert.equal(row.id,'u1');assert.equal(row.full_name,'Ana María');assert.deepEqual(row.preferences.diet,['Vegan']);assert.deepEqual(row.preferences.onboarding_draft,{name:'Ana María',age:draft.age,step:1});assert.ok(row.updated_at);
 assert.equal(completedOnboarding(row.preferences),false);
});
test('does not overwrite a profile when the read fails',async()=>{
 const client=db({readError:new Error('offline')});await assert.rejects(saveNameDraft(client,'u1',draft),/offline/);assert.equal(client.writes.length,0);
});
test('expired or different-user sessions cannot write the draft',async()=>{
 for(const user of [null,{id:'u2'}]){const client=db({user});await assert.rejects(saveNameDraft(client,'u1',draft),/session expired/);assert.equal(client.writes.length,0);}
});
test('rejects invalid drafts and propagates write failure for retry',async()=>{
 const client=db();await assert.rejects(saveNameDraft(client,'u1',{name:'',age:''}),/Check/);assert.equal(client.writes.length,0);
 await assert.rejects(saveNameDraft(db({writeError:new Error('save failed')}),'u1',draft),/save failed/);
});
