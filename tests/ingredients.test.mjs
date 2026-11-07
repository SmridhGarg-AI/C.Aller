import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validIngredientText,parseExtraction,readIngredientDraft,reviewedIngredientDraft} from '../src/lib/ingredient-draft.ts';
import {createIngredientExtractionHandler} from '../src/lib/ingredient-extraction.ts';
function request(blob=new Blob([new Uint8Array([255,216,255,0])],{type:'image/jpeg'})){const body=new FormData();body.set('photo',blob,'label.jpg');return new Request('http://localhost/api/ingredients/extract',{method:'POST',body,headers:{origin:'http://localhost'}});}
const deps={apiKey:'test-key',getUserId:async()=>'user',fetch:async()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify({text:'Ingredients: wheat flour, salt. May contain milk.',uncertain:false})}]}}]})};
test('manual text must be present and reviewed, including unreadable-span correction',()=>{
 for(const text of ['', '  ', '12345','???','unknown','ingredients'])assert.equal(validIngredientText(text),false);
 assert.throws(()=>reviewedIngredientDraft('wheat, salt','manual',false),/Review/);
 assert.throws(()=>reviewedIngredientDraft('wheat, [unreadable]','label',true),/unreadable/);
 const draft=reviewedIngredientDraft('Wheat flour, salt','manual',true,1000);
 assert.deepEqual(readIngredientDraft(JSON.stringify(draft),1100),draft);
 assert.equal(readIngredientDraft(JSON.stringify(draft),1801001),null);
 assert.equal(readIngredientDraft('{broken'),null);
});
test('extracted text always requires explicit review and cannot be empty',()=>{
 assert.throws(()=>parseExtraction({text:'',uncertain:true}),/readable/);
 assert.throws(()=>parseExtraction({text:'milk',uncertain:'no'}));
 const extracted=parseExtraction({text:'Water, sesame',uncertain:true});
 assert.throws(()=>reviewedIngredientDraft(extracted.text,'label',false));
 assert.equal(reviewedIngredientDraft(extracted.text,'label',true).source,'label');
});
test('OCR endpoint sends only the label, returns editable text, not an assessment',async()=>{
 let sent;
 const handler=createIngredientExtractionHandler({...deps,fetch:async(url,options)=>{sent=JSON.parse(options.body);assert.equal(options.headers['x-goog-api-key'],'test-key');return deps.fetch();}});
 const response=await handler(request());assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{text:'Ingredients: wheat flour, salt. May contain milk.',uncertain:false});
 assert.match(sent.systemInstruction.parts[0].text,/Never infer/);assert.equal(sent.contents[0].parts[0].inlineData.mimeType,'image/jpeg');assert.equal(JSON.stringify(sent).includes('preferences'),false);
});
test('OCR endpoint handles configuration, auth, malformed uploads, network and unreadable labels',async()=>{
 assert.equal((await createIngredientExtractionHandler({...deps,apiKey:undefined})(request())).status,503);
 assert.equal((await createIngredientExtractionHandler({...deps,getUserId:async()=>null})(request())).status,401);
 assert.equal((await createIngredientExtractionHandler(deps)(request(new Blob(['not jpeg'],{type:'image/jpeg'})))).status,400);
 const large=request(new Blob([new Uint8Array(2100001)],{type:'image/jpeg'}));const buffered=new Request(large.url,{method:'POST',headers:large.headers,body:await large.arrayBuffer()});assert.equal((await createIngredientExtractionHandler(deps)(buffered)).status,413);
 assert.equal((await createIngredientExtractionHandler({...deps,fetch:async()=>{throw new Error('offline');}})(request())).status,502);
 assert.equal((await createIngredientExtractionHandler({...deps,fetch:async()=>Response.json({candidates:[]})})(request())).status,422);
 const foreign=new Request('http://localhost/api/ingredients/extract',{method:'POST',headers:{origin:'https://evil.test'}});
 assert.equal((await createIngredientExtractionHandler(deps)(foreign)).status,403);
});

