import test from 'node:test';
import assert from 'node:assert/strict';
import {dietConflicts,parseDietDraft,validateDietDraft,saveDietDraft,profileDietDraft,dietDraftKey,clarificationOptions} from '../src/lib/auth/diet-draft.ts';
const empty={selected:[],other:'',clarification:''};
function db({user={id:'u1'},readError=null,writeError=null,profile={preferences:{onboarding_draft:{name:'Alex',age:'18–29',step:1},medical:['Existing']}}}={}){
 const writes=[];
 return {writes,auth:{async getUser(){return {data:{user},error:null};}},from(table){assert.equal(table,'profiles');return {select(){return {eq(column,id){assert.equal(column,'id');assert.equal(id,'u1');return {async maybeSingle(){return {data:profile,error:readError};}};}};},update(row){writes.push(row);return {eq(column,id){assert.equal(column,'id');assert.equal(id,'u1');return {select(){return {async single(){return {data:writeError?null:{id:'u1'},error:writeError};}};}};}};}};}};
}
test('supports no restrictions and compatible multiple selections',()=>{
 for(const selected of [[],['Vegan','Halal'],['Vegan','Vegetarian'],['Keto','Vegetarian']])assert.equal(validateDietDraft({...empty,selected}),'');
});
test('asks for clarification only for genuinely different fish preferences',()=>{
 assert.deepEqual(dietConflicts(['Vegan','Pescatarian']),['Vegan and Pescatarian']);
 assert.equal(dietConflicts(['Vegetarian','Pescatarian']).length,1);
 const selected=['Vegan','Pescatarian'];assert.match(validateDietDraft({...empty,selected}),/clarify/);
 assert.equal(validateDietDraft({...empty,selected,clarification:clarificationOptions[0]}),'');
 assert.deepEqual(selected,['Vegan','Pescatarian']);
});
test('Other requires text only when selected and rejects unsupported options',()=>{
 assert.match(validateDietDraft({...empty,selected:['Other']}),/Describe/);
 assert.equal(validateDietDraft({...empty,selected:['Other'],other:'Mediterranean'}),'');
 assert.equal(validateDietDraft({...empty,other:'unfinished text'}),'');
 assert.match(validateDietDraft({...empty,selected:['Unknown']}),/listed/);
});
test('restores typed drafts, deduplicates, scopes accounts and rejects malformed data',()=>{
 assert.deepEqual(parseDietDraft({...empty,selected:['Vegan','Vegan']}),{...empty,selected:['Vegan']});
 for(const value of [null,{},'bad',{selected:['Unknown']}])assert.equal(parseDietDraft(value),null);
 assert.notEqual(dietDraftKey('u1'),dietDraftKey('u2'));assert.notEqual(dietDraftKey(null),dietDraftKey('u1'));
 assert.deepEqual(profileDietDraft({diet:['Other'],diet_other:'Mediterranean'}),{...empty,selected:['Other'],other:'Mediterranean'});
});
test('saves selections and clarification under verified user while preserving name and medical data',async()=>{
 const client=db();const draft={selected:['Vegan','Pescatarian','Other'],other:' Mediterranean ',clarification:clarificationOptions[1]};await saveDietDraft(client,'u1',draft);
 const row=client.writes[0];assert.deepEqual(row.preferences.diet,draft.selected);assert.equal(row.preferences.diet_other,'Mediterranean');assert.equal(row.preferences.diet_clarification,draft.clarification);assert.deepEqual(row.preferences.medical,['Existing']);assert.deepEqual(row.preferences.onboarding_draft,{name:'Alex',age:'18–29',step:2});assert.ok(row.updated_at);
});
test('deselected Other and resolved conflicts are cleared in cloud save',async()=>{
 const client=db();await saveDietDraft(client,'u1',{selected:['Halal'],other:'Stale',clarification:clarificationOptions[0]});assert.equal(client.writes[0].preferences.diet_other,'');assert.equal(client.writes[0].preferences.diet_clarification,'');
});
test('signed out or changed user cannot update preferences',async()=>{
 for(const user of [null,{id:'u2'}]){const client=db({user});await assert.rejects(saveDietDraft(client,'u1',empty),/session expired/);assert.equal(client.writes.length,0);}
});
test('read failures and missing profiles do not write; RLS/write failures propagate for retry',async()=>{
 const client=db({readError:new Error('offline')});await assert.rejects(saveDietDraft(client,'u1',empty),/offline/);assert.equal(client.writes.length,0);
 const missing=db({profile:null});await assert.rejects(saveDietDraft(missing,'u1',empty),/name and age/);assert.equal(missing.writes.length,0);
 await assert.rejects(saveDietDraft(db({writeError:new Error('RLS denied')}),'u1',empty),/RLS denied/);
});
