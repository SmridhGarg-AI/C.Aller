import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeIngredientText} from '../src/lib/ingredient-analysis.ts';
import {createIngredientAnalysisHandler} from '../src/lib/ingredient-analysis-handler.ts';
const options={english:true,complete:true};
const assess=(text,allergies=['milk'])=>analyzeIngredientText(text,{allergies,noKnown:!allergies.length},options);
test('confirmed allergens identify exact matched ingredient, source and personal allergen',()=>{
 const result=assess('Ingredients: wheat flour, whey powder, salt.',['wheat','milk']);
 assert.equal(result.risk,'unsafe');assert.equal(result.label,'Not Safe');
 const whey=result.findings.find(f=>f.ingredient==='whey powder');assert.equal(whey.tag,'Your allergy');assert.deepEqual(whey.matches,[{allergen:'milk',matchedText:'whey',personal:true}]);assert.equal(whey.sourceText,'whey powder');
 assert.equal(assess('water, sodium caseinate').risk,'unsafe');assert.equal(assess('egg albumen',['eggs']).risk,'unsafe');
});
test('precautionary statements remain separate from confirmed ingredients',()=>{
 const r=assess('Ingredients: water, salt. May contain milk, sesame. Contains wheat.',['milk','sesame']);
 assert.equal(r.risk,'caution');assert.equal(r.findings.find(f=>f.ingredient.includes('milk')).kind,'may-contain');
 assert.equal(assess('Ingredients: whey, salt. May contain peanuts.').risk,'unsafe');
 assert.equal(assess('water; made on shared equipment with milk').risk,'caution');
});
test('derivatives, negation, missing language or completeness never receive a clear outcome',()=>{
 for(const text of ['Emulsifier (E471), salt','lecithin, salt','modified starch, water','milk-free chocolate','natural flavours'])assert.equal(assess(text).risk,'caution',text);
 assert.equal(analyzeIngredientText('water, salt',{allergies:['milk'],noKnown:false},{english:false,complete:true}).risk,'caution');
 assert.equal(analyzeIngredientText('water, salt',{allergies:['milk'],noKnown:false},{english:true,complete:false}).risk,'caution');
 assert.equal(assess('water, salt',['custom allergy']).risk,'caution');
 assert.equal(assess('water, salt').label,'No known conflict found in provided text');
 assert.equal(assess('coconut milk, salt').risk,'clear');assert.equal(assess('peanut butter, cream of tartar').risk,'clear');
 assert.equal(assess('whey, salt',['wheat']).findings[0].tag,'Contains dairy');
});
test('matches respect boundaries and nested ingredient groups',()=>{
 assert.equal(assess('eggplant, salt',['eggs']).risk,'clear');
 assert.equal(assess('chocolate (sugar, milk powder), salt').findings.length,2);
 assert.equal(assess('sesame oil',['sesame']).risk,'unsafe');
 assert.equal(assess('soy lecithin',['soy']).risk,'unsafe');
});
const draft={text:'wheat flour, salt',source:'manual',reviewed:true,updatedAt:Date.now()};
const request=(body={draft,english:true,complete:true,action:'analyze'})=>new Request('http://localhost/api/ingredients/analyze',{method:'POST',headers:{origin:'http://localhost'},body:JSON.stringify(body)});
test('server uses its own profile, recomputes saves and makes retries idempotent',async()=>{
 const rows=[];let profile={allergies:['wheat'],noKnown:false};
 const handler=createIngredientAnalysisHandler({loadProfile:async()=>({userId:'owner',profile}),save:async row=>{rows.push(row);}});
 assert.equal((await (await handler(request())).json()).analysis.risk,'unsafe');
 const body={draft,english:true,complete:true,action:'save',risk:'clear',userId:'attacker'};
 const first=await (await handler(request(body))).json();const second=await (await handler(request(body))).json();
 assert.equal(first.savedId,second.savedId);assert.equal(rows[0].user_id,'owner');assert.equal(rows[0].product.assessment.risk,'unsafe');
 profile={allergies:['milk'],noKnown:false};const changed=await (await handler(request(body))).json();assert.equal(changed.analysis.risk,'clear');assert.notEqual(changed.savedId,first.savedId);
});
test('server rejects missing, unreviewed, expired, unreadable and unsigned profiles; handles failures',async()=>{
 const deps={loadProfile:async()=>({userId:'user',profile:{allergies:['wheat'],noKnown:false}}),save:async()=>{}};
 const handler=createIngredientAnalysisHandler(deps);
 for(const invalid of [{...draft,reviewed:false},{...draft,updatedAt:1},{...draft,text:'[unreadable], salt'}])assert.equal((await handler(request({draft:invalid,english:true,complete:true,action:'analyze'}))).status,400);
 assert.equal((await createIngredientAnalysisHandler({...deps,loadProfile:async()=>null})(request())).status,401);
 assert.equal((await createIngredientAnalysisHandler({...deps,save:async()=>{throw new Error('offline');}})(request({draft,english:true,complete:true,action:'save'}))).status,503);
});


test('dairy declarations and plant-source dairy names are distinguished',()=>{
 assert.equal(assess('Ingredients: water. Contains dairy.').risk,'unsafe');
 assert.equal(assess('coconut cream, salt').risk,'clear');
 assert.equal(assess('Contains peanuts',['milk']).risk,'caution');
});

test('a free-from claim for a different ingredient never hides a personal allergen',()=>{
 assert.equal(assess('gluten-free oats with milk').risk,'unsafe');
 assert.equal(assess('milk-free chocolate').risk,'caution');
});

test('saved ingredient snapshots retain conservative history wording',async()=>{
 const {normalizeScan}=await import('../src/lib/home-data.ts');
 const record=normalizeScan({id:'record',created_at:new Date().toISOString(),product:{kind:'ingredient-analysis',name:'Ingredient label check',ingredients:'water, salt',risk:'unknown',assessment:assess('water, salt')}});
 assert.equal(record.product.assessmentLabel,'No known conflict found in provided text');assert.equal(record.product.risk,'unknown');
});
