import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAllergens} from '../src/lib/allergen-assessment.ts';
import {normalizeOFF,categoryMatches} from '../src/lib/search-data.ts';
const food={ingredients:'Potatoes, sunflower oil, salt.',allergens:[],traces:[],complete:true,english:true};
const milk={allergies:['Milk'],noKnown:false};
test('missing ingredients and unavailable profile can never become Safe',()=>{
 for(const ingredients of ['', 'Ingredients unavailable','unknown'])assert.equal(assessAllergens({...food,ingredients},milk).risk,'unknown');
 assert.equal(assessAllergens(food,null).risk,'unknown');assert.equal(assessAllergens(food,{allergies:[],noKnown:false}).risk,'unknown');
});
test('declared and documented ingredient matches are Not Safe for this profile only',()=>{
 assert.equal(assessAllergens({...food,ingredients:'Potatoes, whey powder'},milk).risk,'unsafe');assert.equal(assessAllergens({...food,allergens:['en:milk']},milk).risk,'unsafe');assert.equal(assessAllergens({...food,allergens:['en:milk']},{allergies:['Eggs'],noKnown:false}).risk,'safe');
 assert.equal(assessAllergens({...food,allergens:['en:nuts']},{allergies:['Tree nuts'],noKnown:false}).risk,'unsafe');
});
test('trace statements cause Caution rather than ingredient conflict or Safe',()=>{
 for(const change of [{traces:['en:milk']},{ingredients:'Potatoes, salt. May contain milk.'}])assert.equal(assessAllergens({...food,...change},milk).risk,'caution');
});
test('unknown language, incomplete data and unmatched custom allergies require verification',()=>{
 for(const change of [{english:false},{complete:false}])assert.equal(assessAllergens({...food,...change},milk).risk,'unknown');assert.equal(assessAllergens(food,{allergies:['Mustard'],noKnown:false}).risk,'unknown');assert.equal(assessAllergens({...food,ingredients:'Potatoes, mustard'},{allergies:['Mustard'],noKnown:false}).risk,'unsafe');
});
test('ambiguous dairy-free and plant-based wording does not produce a false Safe or definite conflict',()=>{
 assert.equal(assessAllergens({...food,ingredients:'Milk-free chocolate, sugar'},milk).risk,'caution');assert.equal(assessAllergens({...food,ingredients:'Almond milk, sugar'},milk).risk,'caution');
});
test('Safe requires documented complete ingredients and explains screening limitations',()=>{
 const result=assessAllergens(food,milk);assert.equal(result.label,'Safe');assert.match(result.reasons[0],/not an allergen-free or cross-contact guarantee/);assert.equal(assessAllergens(food,{allergies:[],noKnown:true}).risk,'safe');
});
test('word boundaries avoid coconut/nutmeg and eggplant matching unrelated allergens',()=>{
 assert.equal(assessAllergens({...food,ingredients:'Coconut, nutmeg'},{allergies:['Tree nuts'],noKnown:false}).risk,'safe');assert.equal(assessAllergens({...food,ingredients:'Eggplant, oil'},{allergies:['Eggs'],noKnown:false}).risk,'safe');
});
test('OFF adapter preserves documented ingredients, traces and category evidence without fabricating completeness',()=>{
 const raw={code:'1234567890123',product_name:'Packaged burger',brands:'Brand',ingredients_text_en:'Wheat, water',allergens_tags:['en:wheat'],traces_tags:['en:sesame'],categories_tags:['en:veggie-burgers'],states_tags:['en:ingredients-completed'],unknown_ingredients_n:0,ingredients_n:2};
 const product=normalizeOFF(raw);assert.equal(product.source,'Open Food Facts');assert.equal(product.screening.complete,true);assert.deepEqual(product.screening.traces,['en:sesame']);assert.equal(categoryMatches(product,'Burgers'),true);assert.equal(categoryMatches(product,'All'),true);assert.equal(categoryMatches(product,'Fast Food'),false);assert.equal(categoryMatches(product,'Homemade'),false);
 assert.equal(normalizeOFF({...raw,unknown_ingredients_n:undefined}).screening.complete,false);assert.equal(normalizeOFF({...raw,code:'not-a-code'}),null);
});
