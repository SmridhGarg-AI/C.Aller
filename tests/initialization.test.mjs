import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApplication,InitializationError} from '../src/lib/initialization.ts';
const preferences={name:'Alex',age:'18–29',diet:['Vegan'],medical:['Diabetes'],allergies:['Milk'],onboarding_completed:true};
function db({user={id:'u1'},authError=null,readError=null,profile={id:'u1',full_name:'Alex',preferences},afterRead=()=>{},secondUser=undefined}={}){
 let calls=0;let profileReads=0;return {get calls(){return calls;},get profileReads(){return profileReads;},auth:{async getUser(){calls++;return {data:{user:calls>1&&secondUser!==undefined?secondUser:user},error:authError};}},from(table){assert.equal(table,'profiles');return {select(columns){assert.equal(columns,'id,full_name,preferences');return {eq(key,id){assert.equal(key,'id');assert.equal(id,'u1');return {abortSignal(signal){assert.ok(signal instanceof AbortSignal);return {async maybeSingle(){profileReads++;afterRead();return {data:profile,error:readError};}};}};}};}};}};
}
function run(client,controller=new AbortController()){const stages=[];return {stages,promise:initializeApplication(client,value=>stages.push(value),controller.signal)};}
test('initialization advances real completed steps in order and derives scoped application state',async()=>{
 const client=db();const {promise,stages}=run(client);const state=await promise;assert.deepEqual(stages.map(x=>x.completed),[0,1,2,3]);assert.equal(client.calls,2);assert.equal(client.profileReads,1);assert.equal(state.userId,'u1');assert.equal(state.profile.fullName,'Alex');assert.deepEqual(state.screening,{allergies:['Milk'],noKnownAllergies:false,diet:['Vegan']});assert.equal(state.historyScope,'user:u1');assert.notEqual(state.screening.allergies,preferences.allergies);
});
test('unconfigured and signed-out sessions stop before any profile read',async()=>{
 await assert.rejects(run(null).promise,error=>error instanceof InitializationError&&error.code==='configuration');
 const client=db({user:null});const {promise,stages}=run(client);await assert.rejects(promise,error=>error.code==='session');assert.equal(client.profileReads,0);assert.deepEqual(stages.map(x=>x.completed),[0]);
});
test('network failures do not produce completed progress',async()=>{
 const client=db({readError:new Error('offline')});const {promise,stages}=run(client);await assert.rejects(promise,error=>error.code==='network');assert.deepEqual(stages.map(x=>x.completed),[0,1]);
 await assert.rejects(run(db({user:null,authError:{status:503,name:'AuthRetryableFetchError'}})).promise,error=>error.code==='network');
});
test('missing, incomplete and malformed profiles do not initialize successfully',async()=>{
 await assert.rejects(run(db({profile:null})).promise,error=>error.code==='incomplete');
 await assert.rejects(run(db({profile:{id:'u1',full_name:'Alex',preferences:{...preferences,onboarding_completed:false}}})).promise,error=>error.code==='incomplete');
 for(const profile of [{id:'u2',full_name:'Alex',preferences},{id:'u1',full_name:'',preferences},{id:'u1',full_name:'Alex',preferences:{...preferences,allergies:'Milk'}},{id:'u1',full_name:'Alex',preferences:{...preferences,no_known_allergies:true}}])await assert.rejects(run(db({profile})).promise,error=>error.code==='profile');
});
test('cancellation and account switches cannot hand off a stale profile',async()=>{
 const controller=new AbortController();controller.abort();const before=db();await assert.rejects(run(before,controller).promise);assert.equal(before.calls,0);
 const later=new AbortController();const {promise,stages}=run(db({afterRead:()=>later.abort()}),later);await assert.rejects(promise);assert.equal(stages.some(x=>x.completed===3),false);
 const changed=run(db({secondUser:{id:'u2'}}));await assert.rejects(changed.promise,error=>error.code==='session');assert.equal(changed.stages.some(x=>x.completed===3),false);
});
test('failure can be retried without retaining stale application state',async()=>{
 await assert.rejects(run(db({readError:new Error('offline')})).promise);const retry=run(db());assert.equal((await retry.promise).userId,'u1');assert.equal(retry.stages.at(-1).completed,3);
});
test('explicit no-known allergies initializes without implying a safe product assessment',async()=>{
 const state=await run(db({profile:{id:'u1',full_name:'Alex',preferences:{...preferences,allergies:[],no_known_allergies:true}}})).promise;assert.deepEqual(state.screening.allergies,[]);assert.equal(state.screening.noKnownAllergies,true);assert.equal('safe' in state.screening,false);
});
