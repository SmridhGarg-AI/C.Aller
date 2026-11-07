import {test} from 'node:test';
import assert from 'node:assert/strict';
import {imageMime,photoDimensions,parseLensResult} from '../src/lib/food-lens.ts';
import {prepareLensPhoto,captureLensPhoto} from '../src/lib/food-lens-image.ts';
test('lens rejects unsafe claims and invalid model output',()=>{
 assert.throws(()=>parseLensResult({identities:['Safe pasta'],ingredientSuggestions:[]}));
 assert.throws(()=>parseLensResult({identities:['pasta'],ingredientSuggestions:['allergen free']}));
 assert.deepEqual(parseLensResult({identities:['Pasta'],ingredientSuggestions:['Tomato']}),{identities:['Pasta'],ingredientSuggestions:['Tomato']});
 assert.deepEqual(parseLensResult({identities:[],ingredientSuggestions:[]}),{identities:[],ingredientSuggestions:[]});
});
test('lens preserves aspect ratio, bounds dimensions and rejects oversized decode',()=>{
 assert.deepEqual(photoDimensions(4000,3000),{width:1600,height:1200});
 assert.throws(()=>photoDimensions(0,100));assert.throws(()=>photoDimensions(10000,10000));
 assert.equal(imageMime(new Uint8Array([255,216,255])), 'image/jpeg');assert.equal(imageMime(new Uint8Array([0,1,2])),null);
});
test('gallery and camera share local resizing and JPEG conversion',async()=>{
 const originalDocument=globalThis.document,originalBitmap=globalThis.createImageBitmap;
 const jpeg=new Blob([new Uint8Array([255,216,255,0])],{type:'image/jpeg'});
 let closed=0,drawn=0;
 globalThis.createImageBitmap=async()=>({width:4000,height:3000,close(){closed++;}});
 globalThis.document={createElement(){return {width:0,height:0,getContext(){return {fillRect(){},drawImage(){drawn++;}};},toBlob(callback){callback(jpeg);}};}};
 try{
  assert.equal((await prepareLensPhoto(jpeg)).type,'image/jpeg');
  assert.equal((await captureLensPhoto({videoWidth:1920,videoHeight:1080})).type,'image/jpeg');
  assert.equal(closed,2);assert.equal(drawn,3);
  await assert.rejects(()=>prepareLensPhoto(new Blob(['not an image'],{type:'image/jpeg'})),/contents/);
  await assert.rejects(()=>prepareLensPhoto(new Blob(['x'],{type:'text/plain'})),/JPG/);
 }finally{globalThis.document=originalDocument;globalThis.createImageBitmap=originalBitmap;}
});
