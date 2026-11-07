import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toggleMedical,validateMedical,profileMedical,saveMedical,nonMedicalPreferences} from '../src/lib/auth/medical-draft.ts';
const empty={selected:[],other:''};
function db({user={id:'u1'},readError=null,writeError=null}={}){const writes=[];return {writes,auth:{async getUser(){return {data:{user},error:null};}},from(table){assert.equal(table,'profiles');return {select(){return {eq(key,id){assert.equal(key,'id');assert.equal(id,'u1');return {async maybeSingle(){return {data:{preferences:{diet:['Vegan'],allergies:['Milk'],onboarding_draft:{name:'Alex',age:'18–29',step:2}}},error:readError};}};}};},update(row){writes.push(row);return {eq(key,id){assert.equal(key,'id');assert.equal(id,'u1');return {select(){return {async single(){return {error:writeError};}};}};}};}};}};}
test('all fields optional including Other text; invalid contradictory payloads rejected',()=>{
 assert.equal(validateMedical(empty),'');assert.equal(validateMedical({selected:['Other'],other:''}),'');assert.equal(validateMedical({selected:['None'],other:''}),'');
 assert.ok(validateMedical({selected:['None','Diabetes'],other:''}));assert.ok(validateMedical({selected:['Unknown'],other:''}));assert.ok(validateMedical({selected:['Other'],other:'a'.repeat(121)}));
});
test('None is exclusive in both directions and can be deselected to decline disclosure',()=>{
 const multiple=toggleMedical(toggleMedical(empty,'Diabetes'),'Digestive issues');assert.deepEqual(multiple.selected,['Diabetes','Digestive issues']);
 const none=toggleMedical(multiple,'None');assert.deepEqual(none.selected,['None']);assert.deepEqual(toggleMedical(none,'Heart condition').selected,['Heart condition']);assert.deepEqual(toggleMedical(none,'None').selected,[]);
});
test('restores optional medical data without accepting arbitrary conditions',()=>{
 assert.deepEqual(profileMedical(null),empty);assert.deepEqual(profileMedical({medical:['Diabetes','Diabetes','Unknown'],medical_other:'Test'}),{selected:['Diabetes'],other:'Test'});
});
test('authenticated save preserves unrelated fields and empty disclosure remains distinct from None',async()=>{
 const client=db();await saveMedical(client,'u1',empty);assert.deepEqual(client.writes[0].preferences.medical,[]);assert.deepEqual(client.writes[0].preferences.diet,['Vegan']);assert.deepEqual(client.writes[0].preferences.allergies,['Milk']);assert.equal(client.writes[0].preferences.onboarding_draft.step,3);
});
test('profile edits preserve onboarding status and allow clearing custom text',async()=>{
 const client=db();await saveMedical(client,'u1',{selected:['None'],other:'stale'},true);assert.equal(client.writes[0].preferences.medical_other,'');assert.equal(client.writes[0].preferences.onboarding_draft.step,2);
});
test('custom text is saved only if Other remains selected',async()=>{
 const client=db();await saveMedical(client,'u1',{selected:['Other'],other:' Custom condition '});assert.equal(client.writes[0].preferences.medical_other,'Custom condition');
});
test('expired or wrong-user sessions never write; read and RLS failures remain retryable errors',async()=>{
 for(const user of [null,{id:'u2'}]){const client=db({user});await assert.rejects(saveMedical(client,'u1',empty));assert.equal(client.writes.length,0);}
 const offline=db({readError:new Error('offline')});await assert.rejects(saveMedical(offline,'u1',empty),/offline/);assert.equal(offline.writes.length,0);await assert.rejects(saveMedical(db({writeError:new Error('denied')}),'u1',empty),/denied/);
});
test('medical data never enters browser preference allowlist or automatic AI prompt',()=>{
 const stored=nonMedicalPreferences({name:'Alex',age:'18–29',diet:[],allergies:[],medical:['Diabetes'],medical_other:'private',unexpected:'private'});assert.equal('medical' in stored,false);assert.equal('medical_other' in stored,false);assert.equal('unexpected' in stored,false);
 const source=readFileSync(new URL('../src/components/app.tsx',import.meta.url),'utf8');assert.equal(source.includes('JSON.stringify(readPrefs())'),false);assert.ok(source.includes('JSON.stringify(nonMedicalPreferences(prefs))'));
});
