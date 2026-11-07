import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeScan,safeProductImage,loadHome,loadScanHistory,searchDestination,scanTimestamp,riskPresentation,saveProductScan} from '../src/lib/home-data.ts';
const row={id:'scan1',created_at:'2026-10-16T08:00:00Z',product:{code:'1234567890123',name:'Test food',brand:'Test',ingredients:'Potato',allergens:'',image:'https://images.openfoodfacts.org/test.jpg',risk:'caution'}};
function database({profile={full_name:'Alex Smith'},profileError=null,scanError=null,profileReject=false,scans=[row],user={id:'u1'},insertError=null}={}){
 const operations=[];return {operations,auth:{async getUser(){return {data:{user},error:null};}},from(table){operations.push(['from',table]);return {select(columns){operations.push(['select',columns]);return {eq(key,id){operations.push(['eq',key,id]);if(table==='profiles')return {async maybeSingle(){if(profileReject)throw new Error('network');return {data:profile,error:profileError};}};return {order(column,options){operations.push(['order',column,options]);return {async limit(count){operations.push(['limit',count]);return {data:scans,error:scanError};}};}};}};},async insert(payload){operations.push(['insert',payload]);return {error:insertError};}};}};
}
test('loads the signed-in name and newest three scans with explicit user filters',async()=>{
 const client=database();const result=await loadHome(client,'u1');assert.equal(result.name,'Alex Smith');assert.equal(result.scans.length,1);assert.equal(result.profileError,false);assert.equal(result.error,false);assert.ok(client.operations.some(x=>x[0]==='eq'&&x[1]==='user_id'&&x[2]==='u1'));assert.ok(client.operations.some(x=>x[0]==='eq'&&x[1]==='id'&&x[2]==='u1'));assert.ok(client.operations.some(x=>x[0]==='order'&&x[1]==='created_at'&&x[2].ascending===false));assert.ok(client.operations.some(x=>x[0]==='limit'&&x[1]===3));
});
test('independent data errors preserve working data and empty accounts remain empty',async()=>{
 const profileFailure=await loadHome(database({profileReject:true}),'u1');assert.equal(profileFailure.profileError,true);assert.equal(profileFailure.scans.length,1);
 const historyFailure=await loadHome(database({scanError:new Error('offline')}),'u1');assert.equal(historyFailure.name,'Alex Smith');assert.equal(historyFailure.error,true);
 const empty=await loadHome(database({profile:null,scans:[]}),'u1');assert.equal(empty.name,'');assert.deepEqual(empty.scans,[]);assert.equal(empty.error,false);
});
test('normalizes records and never invents a safety assessment',()=>{
 assert.equal(normalizeScan(row).product.risk,'caution');assert.equal(normalizeScan({...row,product:{name:''}}).product.name,'Unnamed product');assert.equal(normalizeScan({...row,product:{name:'Food'}}).product.risk,'unknown');for(const invalid of [{}, {...row,created_at:'bad'}, {...row,product:null}])assert.equal(normalizeScan(invalid),null);assert.equal(riskPresentation('unknown').label,'Not assessed');assert.equal(riskPresentation('safe').label,'No flags');
});
test('thumbnail URLs accept trusted https product assets and reject unsafe hosts',()=>{
 assert.ok(safeProductImage('https://images.openfoodfacts.org/item.jpg'));for(const value of ['javascript:alert(1)','http://images.openfoodfacts.org/a.jpg','https://openfoodfacts.org.evil.example/a.jpg','https://evil.example/a.jpg','/broken.jpg',null])assert.equal(safeProductImage(value),null);
});
test('search destinations trim and encode the actual query with a length bound',()=>{
 assert.equal(searchDestination('  milk & nuts?  '),'/search?query=milk%20%26%20nuts%3F');assert.equal(decodeURIComponent(searchDestination('x'.repeat(120)).split('=')[1]).length,100);
});
test('timestamps are stable and format older dates in India timezone',()=>{
 const now=Date.parse(row.created_at);assert.equal(scanTimestamp(row.created_at,now),'Just now');assert.equal(scanTimestamp(row.created_at,now+2*3600000),'2 hours ago');assert.equal(scanTimestamp('invalid',now),'Date unavailable');assert.match(scanTimestamp('2026-10-01T22:00:00Z',now),/2 Oct 2026/);
});
test('history limits are bounded and query errors never expose records',async()=>{
 const client=database();await loadScanHistory(client,'u1',999);assert.ok(client.operations.some(x=>x[0]==='limit'&&x[1]===100));const result=await loadScanHistory(database({scanError:new Error('RLS')}),'u1');assert.equal(result.error,true);assert.deepEqual(result.scans,[]);
});
test('saving verifies the user and writes an unassessed record',async()=>{
 const client=database();await saveProductScan(client,row.product);const payload=client.operations.find(x=>x[0]==='insert')[1];assert.equal(payload.user_id,'u1');assert.equal(payload.product.risk,'unknown');assert.equal(payload.product.name,'Test food');
 const missing=database({user:null});await assert.rejects(saveProductScan(missing,row.product),/Sign in/);assert.equal(missing.operations.some(x=>x[0]==='insert'),false);await assert.rejects(saveProductScan(database({insertError:new Error('denied')}),row.product),/denied/);
});
