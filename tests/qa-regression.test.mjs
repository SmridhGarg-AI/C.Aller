import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessAllergens} from '../src/lib/allergen-assessment.ts';
const check=(ingredients,allergies=['Milk'],extra={})=>assessAllergens({ingredients,allergens:[],traces:[],complete:true,english:true,...extra},{allergies,noKnown:false});
test('confirmed declarations after precaution statements remain confirmed conflicts',()=>{const r=check('Ingredients: rice, salt. May contain sesame. Contains milk.');assert.equal(r.risk,'unsafe');assert.ok(r.evidence.some(e=>e.kind==='contains'&&e.detail.includes('milk')));assert.equal(check('Rice, salt. May contain milk.').risk,'caution');});
test('unrelated vegan and free-from wording cannot suppress a separate match',()=>{assert.equal(check('Vegan wheat flour, water',['Wheat']).risk,'unsafe');assert.equal(check('Milk-free chocolate, whey powder').risk,'unsafe');assert.equal(check('Oat milk, whey').risk,'unsafe');assert.equal(check('Milk-free chocolate').risk,'caution');});
test('declared allergens remain conflicts when ingredient text is unavailable',()=>{assert.equal(check('', ['Milk'],{allergens:['en:milk'],complete:false}).risk,'unsafe');assert.equal(check('', ['Milk'],{complete:false}).risk,'unknown');});
test('plant-source ingredient names do not become dairy matches',()=>{assert.notEqual(check('Peanut butter, cocoa butter, coconut cream, salt').risk,'unsafe');assert.equal(check('Peanut butter, milk powder').risk,'unsafe');});

test('buttermilk is a recognizable milk-source ingredient',()=>{assert.equal(check('Buttermilk, sugar').risk,'unsafe');});
