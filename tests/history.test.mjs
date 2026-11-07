import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {loadHistoryPage,loadHistoryRecord,deleteHistoryRecord,historyRecord,historyFilters,historyHref,historyBadge} from '../src/lib/history-data.ts';
import {createHistoryDeleteHandler} from '../src/lib/history-delete-handler.ts';
import {productAction} from '../src/lib/product-actions.ts';
const id='80ad57c1-b178-4eb6-98c0-2e6e60eca123';const otherId='80ad57c1-b178-4eb6-98c0-2e6e60eca124';
const row={id,user_id:'u1',created_at:'2026-10-16T10:00:00Z',product:{name:'Synthetic saved check',method:'barcode',risk:'unsafe',ingredients:'wheat flour',assessment:{label:'Not Safe',reasons:['Wheat matched the saved profile.']}}};
function database(rows=[row],failure=false){const operations=[];return {operations,rows,auth:{async getUser(){return {data:{user:{id:'u1'}},error:null};}},from(table){operations.push(['from',table]);let deleting=false;const filters=[];const q={select(...args){operations.push(['select',...args]);return q;},eq(k,v){filters.push([k,v]);operations.push(['eq',k,v]);return q;},or(v){operations.push(['or',v]);return q;},order(k,v){operations.push(['order',k,v]);return q;},delete(){deleting=true;operations.push(['delete']);return q;},async insert(value){rows.push(value);return {error:null};},async upsert(value){if(!rows.some(row=>row.id===value.id))rows.push(value);return {error:null};},async range(start,end){operations.push(['range',start,end]);const visible=rows.filter(r=>filters.every(([k,v])=>r[k]===v));return {data:failure?null:visible.slice(start,end+1),count:visible.length,error:failure?new Error('offline'):null};},async maybeSingle(){const found=rows.find(r=>filters.every(([k,v])=>r[k]===v));if(deleting&&found&&!failure)rows.splice(rows.indexOf(found),1);return {data:failure?null:found||null,error:failure?new Error('offline'):null};}};return q;}};}
test('history reads newest first, pages on the server and scopes both list and details to owner',async()=>{
 const db=database([row,{...row,id:otherId,user_id:'u2'}]);const list=await loadHistoryPage(db,'u1',historyFilters({}));assert.equal(list.records.length,1);assert.equal(list.records[0].id,id);
 assert.ok(db.operations.some(x=>x[0]==='order'&&x[1]==='created_at'&&x[2].ascending===false));assert.ok(db.operations.some(x=>x[0]==='order'&&x[1]==='id'));assert.deepEqual(db.operations.find(x=>x[0]==='range'),['range',0,19]);
 assert.equal(await loadHistoryRecord(db,'u1',otherId),null);assert.equal((await loadHistoryRecord(db,'u1',id)).id,id);
 const next=database();await loadHistoryPage(next,'u1',historyFilters({page:'2'}));assert.deepEqual(next.operations.find(x=>x[0]==='range'),['range',20,39]);
});
test('history preserves snapshots and explicit methods without invented legacy provenance',()=>{
 assert.equal(historyRecord(row).status,'unsafe');assert.equal(historyRecord({...row,product:{name:'old',risk:'safe'}}).method,'unspecified');
 assert.equal(historyRecord({...row,product:{kind:'ingredient-analysis',brand:'Reviewed label photo',risk:'unknown',assessment:{risk:'clear'}}}).method,'image');
 assert.equal(historyRecord({...row,product:{kind:'ingredient-analysis',risk:'unknown',assessment:{risk:'clear'}}}).status,'clear');
 assert.equal(historyBadge('clear').label.includes('Safe'),false);assert.equal(historyRecord(row).assessment.reasons[0],row.product.assessment.reasons[0]);
});
test('real Supabase request retains owner restriction, both JSON filters and pagination',async()=>{
 let url;
 const db=createClient('https://test.supabase.co','public-test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input)=>{url=new URL(String(input));return new Response(JSON.stringify([]),{headers:{'Content-Type':'application/json','Content-Range':'0-0/0'}});}}});
 await loadHistoryPage(db,'u1',historyFilters({method:'image',risk:'clear',page:'2'}));
 assert.equal(url.searchParams.get('user_id'),'eq.u1');assert.equal(url.searchParams.getAll('or').length,2);assert.match(url.searchParams.getAll('or')[0],/method.eq.image/);assert.match(url.searchParams.getAll('or')[1],/assessment->>risk.eq.clear/);assert.equal(url.searchParams.get('offset'),'20');assert.equal(url.searchParams.get('limit'),'20');
});
test('deletion cannot read or remove another user record and is scoped by both keys',async()=>{
 const db=database([row,{...row,id:otherId,user_id:'u2'}]);assert.equal(await deleteHistoryRecord(db,'u1',otherId),false);assert.equal(db.rows.length,2);assert.equal(await deleteHistoryRecord(db,'u1',id),true);assert.equal(db.rows[0].user_id,'u2');assert.equal(await deleteHistoryRecord(db,'u1',id),false);
 assert.ok(db.operations.some(x=>x[0]==='eq'&&x[1]==='user_id'&&x[2]==='u1'));
 await assert.rejects(deleteHistoryRecord(db,'u1','invalid'),/Invalid/);
});
test('history save writes authenticated owner, barcode method and historical assessment',async()=>{
 const db=database([]);const assessment={risk:'unsafe',label:'Not Safe',reasons:['wheat'],evidence:[]};
 await productAction(db,'u1',{code:'123',name:'Fixture only',brand:'Test',image:null,ingredients:'wheat',allergens:'wheat',source:'Test'},'history',assessment);
 assert.equal(db.rows[0].user_id,'u1');assert.equal(db.rows[0].product.method,'product');assert.equal(db.rows[0].product.assessment.label,'Not Safe');await productAction(db,'u1',{code:'123',name:'Fixture only',brand:'Test',image:null,ingredients:'wheat',allergens:'wheat',source:'Test'},'history',assessment,id);assert.equal(db.rows[1].product.method,'barcode');
 await assert.rejects(productAction(db,'u2',{},'history',assessment),/Sign in/);
});
test('delete API authenticates and rejects foreign origins, invalid IDs and database errors',async()=>{
 const req=(origin='http://localhost')=>new Request('http://localhost/api/history/'+id,{method:'DELETE',headers:{origin}});
 const deps={user:async()=>'u1',remove:async(user,record)=>{assert.equal(user,'u1');assert.equal(record,id);return true;}};
 assert.equal((await createHistoryDeleteHandler(deps)(req(),id)).status,200);assert.equal((await createHistoryDeleteHandler(deps)(req('https://foreign.test'),id)).status,403);
 assert.equal((await createHistoryDeleteHandler(deps)(req(),'invalid')).status,400);assert.equal((await createHistoryDeleteHandler({...deps,user:async()=>null})(req(),id)).status,401);
 assert.equal((await createHistoryDeleteHandler({...deps,remove:async()=>false})(req(),id)).status,404);assert.equal((await createHistoryDeleteHandler({...deps,remove:async()=>{throw new Error();}})(req(),id)).status,503);
});
test('read failures remain errors, empty accounts stay empty and filters are allowlisted',async()=>{
 assert.deepEqual((await loadHistoryPage(database([]),'u1',historyFilters({}))).records,[]);await assert.rejects(loadHistoryPage(database([],true),'u1',historyFilters({})),/offline/);
 assert.deepEqual(historyFilters({method:'bad',risk:'safe',page:'-1'}),{method:'all',risk:'all',page:1});assert.equal(historyFilters({method:['image']}).method,'all');assert.equal(historyHref(historyFilters({method:'barcode',risk:'unsafe',page:'2'}),id),'/history?method=barcode&risk=unsafe&page=2&scan='+id);
});

