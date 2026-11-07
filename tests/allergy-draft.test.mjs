import test from 'node:test';
import assert from 'node:assert/strict';
import {customAllergyError,validateAllergies,profileAllergies,parseAllergyDraft,finishAllergies} from '../src/lib/auth/allergy-draft.ts';
import {completedOnboarding} from '../src/lib/auth/flow.ts';
const empty={selected:[],custom:[],noKnown:false};
function db({user={id:'u1'},readError=null,writeError=null,preferences={diet:['Vegan'],medical:['Diabetes'],medical_other:'Private',onboarding_draft:{name:'Alex',age:'18–29',step:3}}}={}){const writes=[];return {writes,auth:{async getUser(){return {data:{user},error:null};}},from(table){assert.equal(table,'profiles');return {select(){return {eq(key,id){assert.equal(key,'id');assert.equal(id,'u1');return {async maybeSingle(){return {data:{preferences},error:readError};}};}};},update(row){writes.push(row);return {eq(key,id){assert.equal(key,'id');assert.equal(id,'u1');return {select(){return {async single(){return {error:writeError};}};}};}};}};}};}
test('empty is not a claim of no allergies; explicit no-known and multiple allergies are valid',()=>{
 assert.ok(validateAllergies(empty));assert.equal(validateAllergies({...empty,noKnown:true}),'');assert.equal(validateAllergies({...empty,selected:['Milk','Eggs']}),'');assert.ok(validateAllergies({...empty,noKnown:true,selected:['Milk']}));assert.ok(validateAllergies({...empty,selected:['Unknown']}));
});
test('custom entries support multiple items and reject duplicates, standard cards, markup and excessive counts',()=>{
 assert.equal(customAllergyError('Mustard',[]),'');assert.equal(customAllergyError('Buckwheat',['Mustard']),'');assert.ok(customAllergyError(' mustard ',['Mustard']));assert.ok(customAllergyError('milk',[]));for(const value of ['', 'a','<script>','a'.repeat(61),'A\nB'])assert.ok(customAllergyError(value,[]));assert.ok(customAllergyError('Mustard',Array.from({length:20},(_,i)=>'Allergen '+i)));
});
test('restores saved standard, custom and explicit no-known selections',()=>{
 assert.deepEqual(profileAllergies({allergies:['Milk','Mustard','Mustard'],no_known_allergies:false}),{selected:['Milk'],custom:['Mustard'],noKnown:false});assert.deepEqual(profileAllergies({allergies:[],no_known_allergies:true}),{...empty,noKnown:true});assert.equal(profileAllergies({allergies:['Milk'],no_known_allergies:true}).noKnown,false);assert.equal(parseAllergyDraft({bad:true}),null);
});
test('Finish writes allergies and explicit completion together, preserving private medical preferences',async()=>{
 const client=db();await finishAllergies(client,'u1',{...empty,selected:['Milk'],custom:[' Mustard ']});const row=client.writes[0];assert.deepEqual(row.preferences.allergies,['Milk','Mustard']);assert.equal(row.preferences.onboarding_completed,true);assert.equal(row.preferences.onboarding_draft.step,4);assert.deepEqual(row.preferences.medical,['Diabetes']);assert.equal(row.preferences.medical_other,'Private');assert.equal(row.full_name,'Alex');assert.equal(row.preferences.age,'18–29');assert.equal(completedOnboarding(row.preferences),true);
});
test('explicit no-known persists with an empty allergen list',async()=>{const client=db();await finishAllergies(client,'u1',{...empty,noKnown:true});assert.deepEqual(client.writes[0].preferences.allergies,[]);assert.equal(client.writes[0].preferences.no_known_allergies,true);});
test('wrong-user, invalid disclosure, incomplete earlier steps and cloud failures cannot complete onboarding',async()=>{
 for(const user of [null,{id:'u2'}]){const client=db({user});await assert.rejects(finishAllergies(client,'u1',{...empty,noKnown:true}));assert.equal(client.writes.length,0);}
 const invalid=db();await assert.rejects(finishAllergies(invalid,'u1',empty));assert.equal(invalid.writes.length,0);
 const incomplete=db({preferences:{}});await assert.rejects(finishAllergies(incomplete,'u1',{...empty,noKnown:true}),/earlier/);assert.equal(incomplete.writes.length,0);
 const offline=db({readError:new Error('offline')});await assert.rejects(finishAllergies(offline,'u1',{...empty,noKnown:true}),/offline/);assert.equal(offline.writes.length,0);
 await assert.rejects(finishAllergies(db({writeError:new Error('RLS denied')}),'u1',{...empty,noKnown:true}),/RLS denied/);
});
test('explicit completion flag overrides legacy shape while legacy completed profiles remain supported',()=>{
 const legacy={name:'Alex',age:'18–29',diet:[],medical:[],allergies:[]};assert.equal(completedOnboarding(legacy),true);assert.equal(completedOnboarding({...legacy,onboarding_completed:false}),false);assert.equal(completedOnboarding({...legacy,onboarding_completed:true}),true);
});
