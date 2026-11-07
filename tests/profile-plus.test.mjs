import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profilePatch,persistProfilePatch,signOutProfile,initials} from '../src/lib/profile-data.ts';
import {parseEntitlement,paymentProvider} from '../src/lib/entitlements.ts';
import {readFile} from 'node:fs/promises';
test('profile changes preserve unrelated fields and update risk-input allergies',()=>{
 const p={diet:['Vegan'],medical:['Diabetes'],allergies:['Milk'],onboarding_completed:true,emergency_card:{allergies:['Milk'],notes:'approved'}};
 const changed=profilePatch(p,'allergies',{selected:['Wheat'],custom:[],noKnown:false});assert.deepEqual(changed.preferences.allergies,['Wheat']);assert.deepEqual(changed.preferences.diet,['Vegan']);assert.deepEqual(changed.preferences.medical,['Diabetes']);assert.deepEqual(changed.preferences.emergency_card.allergies,[]);assert.equal(p.allergies[0],'Milk');
 const cleared=profilePatch(p,'medical',{selected:[],other:''});assert.deepEqual(cleared.preferences.medical,[]);assert.equal(cleared.preferences.medical_other,undefined);
 assert.throws(()=>profilePatch(p,'medical',{selected:['None','Diabetes'],other:''}));assert.throws(()=>profilePatch(p,'diet',{selected:['Vegan','Pescatarian'],other:'',clarification:''}));
 assert.throws(()=>profilePatch(p,'emergency',{allergies:['Peanuts'],showName:true,contactName:'',contactPhone:'',notes:''}));
 assert.equal(initials('  Alex Smith '),'AS');
});
test('profile persistence is owner-scoped and refuses stale edits',async()=>{
 const calls=[];let patch;const db={from(){const q={select(){return q;},eq(k,v){calls.push([k,v]);return q;},update(value){patch=value;return q;},async maybeSingle(){return patch?{data:{id:'owner'},error:null}:{data:{preferences:{allergies:['Milk'],medical:[]},updated_at:'version'},error:null};}};return q;}};
 await persistProfilePatch(db,'owner','version','personal',{name:'Alex Smith',age:'30–44'});assert.equal(patch.full_name,'Alex Smith');assert.deepEqual(patch.preferences.allergies,['Milk']);assert.ok(calls.some(([k,v])=>k==='id'&&v==='owner'));assert.ok(calls.some(([k,v])=>k==='updated_at'&&v==='version'));
 await assert.rejects(persistProfilePatch(db,'owner','stale','medical',{selected:[],other:''}),/changed/);
});
test('sign out clears local state only after successful auth sign out',async()=>{
 let cleared=false;await signOutProfile({auth:{async signOut(options){assert.equal(options.scope,'local');return {error:null};}}},()=>{cleared=true;});assert.equal(cleared,true);
 cleared=false;await assert.rejects(signOutProfile({auth:{async signOut(){return {error:new Error('offline')};}}},()=>{cleared=true;}),/failed/);assert.equal(cleared,false);
});
test('entitlement data rejects invalid plans and checkout never grants Plus',()=>{
 const free={plan:'free',used:50,remaining:0,allowed:false,resetsAt:'2026-11-01T00:00:00Z'};assert.equal(parseEntitlement(free).allowed,false);assert.equal(parseEntitlement({...free,plan:'plus',remaining:null,allowed:true}).plan,'plus');assert.throws(()=>parseEntitlement({...free,remaining:51}));assert.throws(()=>parseEntitlement({...free,plan:'paid'}));assert.equal(paymentProvider(),null);
});
test('quota migration uses private writes, per-user monthly locks and idempotent barcode-bound events',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261016_entitlements.sql',import.meta.url),'utf8');assert.match(sql,/auth\.uid\(\)/);assert.match(sql,/at time zone 'UTC'/);assert.match(sql,/for update/);assert.match(sql,/used>=50/);assert.match(sql,/previous_code<>scan_barcode/);assert.match(sql,/active_until>clock_timestamp/);assert.doesNotMatch(sql,/for (?:insert|update|all) to authenticated/);
});
