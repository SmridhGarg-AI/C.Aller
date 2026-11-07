import test from 'node:test';
import assert from 'node:assert/strict';
import {scanPresentation,validScanId,pendingScanKey,savedScanKey,scanOwnerKey,claimPendingScan,newScanId} from '../src/lib/scan-result-data.ts';
import {assessAllergens} from '../src/lib/allergen-assessment.ts';
import {productAction,saveUnknownScan} from '../src/lib/product-actions.ts';
const id='80ad57c1-b178-4eb6-98c0-2e6e60eca123';const food={ingredients:'Potatoes, sunflower oil, salt',allergens:[],traces:[],complete:true,english:true};const profile={allergies:['Milk'],noKnown:false};
const product={code:'3017620422003',name:'Synthetic assessment test only',brand:'Test',image:null,ingredients:food.ingredients,allergens:'',categories:['en:crisps'],source:'Open Food Facts',screening:food};
function db({user={id:'u1'},error=null}={}){const rows=new Map();const operations=[];return {rows,operations,auth:{async getUser(){return {data:{user},error:null};}},from(table){return {async upsert(row,options){operations.push({table,row,options});if(!error&&!rows.has(row.id))rows.set(row.id,row);return {error};},async insert(row){operations.push({table,row});return {error};}};}};}
function storage(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};}
test('four internal outcomes remain distinct and green wording is expressly non-guaranteeing',()=>{
 const outcomes=['safe','caution','unsafe','unknown'].map(risk=>scanPresentation({risk}));assert.equal(new Set(outcomes.map(x=>x.outcome)).size,4);assert.equal(outcomes[0].title,'No known conflicts found in available data');assert.match(outcomes[0].description,/not a safety guarantee/);assert.match(outcomes[0].description,/cross-contact/);assert.equal(outcomes[2].title,'Not Safe');assert.equal(outcomes[3].title,'Unknown');assert.equal(scanPresentation(null).tone,'unknown');
});
test('real shared assessments map to contains, may-contain and missing-data result panels',()=>{
 assert.equal(scanPresentation(assessAllergens({...food,allergens:['en:milk']},profile)).outcome,'identified-conflict');assert.equal(scanPresentation(assessAllergens({...food,traces:['en:milk']},profile)).outcome,'caution');assert.equal(scanPresentation(assessAllergens({...food,ingredients:''},profile)).outcome,'insufficient-data');assert.equal(scanPresentation(assessAllergens({...food,complete:false},profile)).outcome,'insufficient-data');assert.equal(scanPresentation(assessAllergens(food,null)).outcome,'insufficient-data');
});
test('same scanner intent is idempotent across repeats while a new scan can be saved',async()=>{
 const client=db();const assessment=assessAllergens(food,profile);await productAction(client,'u1',product,'history',assessment,id);await productAction(client,'u1',product,'history',assessment,id);assert.equal(client.rows.size,1);assert.equal(client.rows.get(id).user_id,'u1');assert.equal(client.operations[0].options.ignoreDuplicates,true);await productAction(client,'u1',product,'history',assessment,'80ad57c1-b178-4eb6-98c0-2e6e60eca124');assert.equal(client.rows.size,2);
});
test('unknown product history explicitly records missing data without fabricated ingredients',async()=>{
 const client=db();await saveUnknownScan(client,'u1','99999999999997',id);const saved=client.rows.get(id).product;assert.equal(saved.lookup_status,'not-found');assert.equal(saved.risk,'unknown');assert.equal(saved.ingredients,'');assert.equal(saved.allergens,'');assert.equal(saved.image,null);assert.equal(saved.assessment.label,'Unknown');
});
test('history rejects invalid scan IDs, expired accounts and write errors',async()=>{
 await assert.rejects(productAction(db(),'u1',product,'history',assessAllergens(food,profile),'not-uuid'),/Invalid scan/);const signedOut=db({user:null});await assert.rejects(saveUnknownScan(signedOut,'u1',product.code,id));assert.equal(signedOut.operations.length,0);await assert.rejects(saveUnknownScan(db({error:new Error('RLS denied')}),'u1',product.code,id),/RLS denied/);
});
test('auto-save intent is barcode-specific and binds to one account only',()=>{
 const store=storage();store.setItem(pendingScanKey(id),product.code);assert.equal(claimPendingScan(store,id,'different','u1'),false);assert.equal(claimPendingScan(store,id,product.code,'u1'),true);assert.equal(store.getItem(scanOwnerKey(id)),'u1');assert.equal(claimPendingScan(store,id,product.code,'u2'),false);assert.notEqual(savedScanKey('u1',id),savedScanKey('u2',id));
});
test('UUID validation and secure-random fallback support manual entry outside camera contexts',()=>{
 assert.equal(validScanId(id),true);for(const value of ['', '../escape',null,product.code])assert.equal(validScanId(value),false);const generated=newScanId({getRandomValues(bytes){bytes.fill(7);return bytes;}});assert.equal(validScanId(generated),true);assert.equal(newScanId({randomUUID:()=>id}),id);
});
