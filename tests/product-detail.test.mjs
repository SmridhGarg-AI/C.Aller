import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeOFF} from '../src/lib/search-data.ts';
import {assessAllergens,splitIngredientText} from '../src/lib/allergen-assessment.ts';
import {screenedAlternatives,alternativeCategory} from '../src/lib/product-detail-data.ts';
import {productAction} from '../src/lib/product-actions.ts';
const burger=normalizeOFF({code:'1234567890123',product_name:'Known-conflict test burger',brands:'Test fixture only',ingredients_text_en:'Wheat bun (wheat flour, water), beef, cheese (milk), salt. May contain sesame.',allergens_tags:['en:milk','en:wheat'],traces_tags:['en:sesame'],categories_tags:['en:foods','en:burgers'],states_tags:['en:ingredients-completed'],unknown_ingredients_n:0,ingredients_n:5});
const profile={allergies:['Milk','Wheat','Sesame'],noKnown:false};
function product(code,ingredients,extra={}){return {...burger,code,ingredients,screening:{ingredients,allergens:[],traces:[],english:true,complete:true},...extra};}
function db({user={id:'u1'},error=null}={}){const writes=[];return {writes,auth:{async getUser(){return {data:{user},error:null};}},from(table){return {async upsert(row,options){writes.push({table,action:'upsert',row,options});return {error};},delete(){const filters=[];return {eq(key,value){filters.push([key,value]);return {async eq(key,value){filters.push([key,value]);writes.push({table,action:'delete',filters});return {error};}};}};},async insert(row){writes.push({table,action:'insert',row});return {error};}};}};}
test('known milk/wheat conflict is Not Safe with source-attributed evidence, sesame remains may-contain',()=>{
 const result=assessAllergens(burger.screening,profile);assert.equal(result.label,'Not Safe');assert.ok(result.evidence.some(x=>x.allergy==='Milk'&&x.kind==='contains'&&x.source.includes('declared')));assert.ok(result.evidence.some(x=>x.allergy==='Wheat'&&x.kind==='contains'));assert.ok(result.evidence.some(x=>x.allergy==='Sesame'&&x.kind==='may-contain'));
});
test('recognizable whey match shows exact ingredient-text provenance and incomplete data is never Safe',()=>{
 const result=assessAllergens({...burger.screening,allergens:[],traces:[],ingredients:'Potato, whey powder, salt',complete:false},{allergies:['Milk'],noKnown:false});assert.equal(result.risk,'unsafe');assert.match(result.evidence[0].detail,/whey powder/);assert.match(result.evidence[0].source,/ingredient list/);
 assert.equal(assessAllergens({...burger.screening,allergens:[],traces:[],ingredients:'Rice, salt',complete:false},profile).risk,'unknown');
});
test('ingredient display keeps nested subingredients together',()=>{assert.deepEqual(splitIngredientText('Bun (wheat flour, water), cheese (milk, salt); tomato'),['Bun (wheat flour, water)','cheese (milk, salt)','tomato']);});
test('alternatives are same-category, deduplicated and independently assessed; no invented recommendations',()=>{
 const safe=product('2234567890123','Rice, water, salt');const unsafe=product('3234567890123','Wheat, milk');const unknown=product('4234567890123','');const unrelated=product('5234567890123','Rice',{categories:['en:foods','en:drinks']});
 const result=screenedAlternatives([burger,safe,safe,unsafe,unknown,unrelated],burger,profile);assert.equal(result.length,1);assert.equal(result[0].product.code,safe.code);assert.equal(result[0].assessment.risk,'safe');assert.deepEqual(screenedAlternatives([safe],burger,null),[]);assert.equal(alternativeCategory({...burger,categories:['en:foods']}),null);
});
test('favorites are private/idempotent and removal is scoped by user plus product',async()=>{
 const client=db();const assessment=assessAllergens(burger.screening,profile);await productAction(client,'u1',burger,'favorite',assessment);assert.equal(client.writes[0].table,'favorites');assert.equal(client.writes[0].row.user_id,'u1');assert.equal(client.writes[0].row.product_code,burger.code);assert.equal(client.writes[0].options.onConflict,'user_id,product_code');await productAction(client,'u1',burger,'unfavorite',assessment);assert.deepEqual(client.writes[1].filters,[['user_id','u1'],['product_code',burger.code]]);
});
test('optional history stores the fresh assessment without claiming verification',async()=>{
 const client=db();await productAction(client,'u1',burger,'history',assessAllergens(burger.screening,profile));assert.equal(client.writes[0].table,'scan_history');assert.equal(client.writes[0].row.product.risk,'unsafe');assert.match(client.writes[0].row.product.assessment.source,/screening/);assert.ok(client.writes[0].row.product.assessed_at);
});
test('signed-out, changed-user and denied mutations cannot report success',async()=>{
 for(const user of [null,{id:'u2'}]){const client=db({user});await assert.rejects(productAction(client,'u1',burger,'favorite',assessAllergens(burger.screening,profile)));assert.equal(client.writes.length,0);}await assert.rejects(productAction(db({error:new Error('RLS denied')}),'u1',burger,'favorite',assessAllergens(burger.screening,profile)),/RLS denied/);
});
