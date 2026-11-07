import assert from 'node:assert/strict';
const root='http://localhost:3000';
const routes=['/','/login','/signup','/onboarding/name','/onboarding/diet','/onboarding/medical','/onboarding/allergies','/loading','/home','/search','/food/3017620422003','/scan/barcode','/scan/result/3017620422003','/food-lens','/ingredients','/ingredients/analysis','/chat','/history','/profile','/plus'];
await Promise.all(routes.map(async path=>{const response=await fetch(root+path,{signal:AbortSignal.timeout(40000)});await response.text();assert.equal(response.status,200,path+' failed');}));
for(const name of ['splash-food.svg','setup-bowl.svg','onboarding-welcome.svg']){const response=await fetch(root+'/illustrations/'+name);assert.equal(response.status,200,'Missing illustration '+name);}
console.log('20 production routes and 3 local illustration assets: HTTP 200 (auth redirects followed).');
const payment=await fetch(root+'/api/billing/checkout',{method:'POST'});assert.equal(payment.status,503);console.log('Checkout: explicitly unavailable; no payment or entitlement grant.');
const deletion=await fetch(root+'/api/history/80ad57c1-b178-4eb6-98c0-2e6e60eca123',{method:'DELETE'});assert.equal(deletion.status,401);console.log('Unauthenticated history deletion: rejected (401).');
const search=await fetch(root+'/api/search?q=rice',{signal:AbortSignal.timeout(20000)});const data=await search.json();
if(search.ok){assert.ok(Array.isArray(data.products));console.log('Live Open Food Facts search: '+data.products.length+' packaged results; profile status '+data.profileStatus+'.');}
else{assert.equal(search.status,502);assert.equal(typeof data.error,'string');console.log('Live Open Food Facts unavailable: app returns a clear 502 error. No fallback products fabricated.');}
