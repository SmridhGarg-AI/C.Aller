import test from 'node:test';
import assert from 'node:assert/strict';
import {MultiFormatReader,RGBLuminanceSource,HybridBinarizer,BinaryBitmap,BarcodeFormat,DecodeHintType} from '@zxing/library';
import {validGTIN,normalizeBarcode,expandUPCE,createBarcodeGate,scannerDestination,cameraErrorMessage,stopCameraResources} from '../src/lib/barcode.ts';
test('validates common retail formats, check digits and leading zeros',()=>{
 for(const code of ['3017620422003','036000291452','96385074','10012345000017'])assert.equal(validGTIN(code),true,code);
 for(const code of ['3017620422004','00000000','123','https://example.com','123456789'])assert.equal(validGTIN(code),false,code);
 assert.equal(normalizeBarcode(' 0360 0029-1452 '),'036000291452');assert.equal(scannerDestination('036000291452'),'/scan/result/036000291452');assert.throws(()=>scannerDestination('invalid'));
});
test('UPC-E expands to equivalent validated UPC-A for product lookup',()=>{
 assert.equal(expandUPCE('04252614'),'042100005264');assert.equal(normalizeBarcode('04252614','UPC_E'),'042100005264');assert.equal(normalizeBarcode('04252615','UPC_E'),null);
});
test('duplicate detection and concurrent different frames produce only one lookup',()=>{
 const gate=createBarcodeGate();let lookups=0;for(let i=0;i<30;i++){if(gate.accept('3017620422003',100+i*20))lookups++;}assert.equal(lookups,1);assert.equal(gate.accept('036000291452',1000),false);gate.release();assert.equal(gate.accept('3017620422003',2000),false);assert.equal(gate.accept('3017620422003',2700),true);gate.reset();assert.equal(gate.accept('3017620422003',2800),true);
});
test('camera controls and every media track are released, including partial startup and repeated stop',()=>{
 let controls=0;let tracks=0;const stream={getTracks:()=>[{stop(){tracks++;}},{stop(){tracks++;}}]};stopCameraResources({stop(){controls++;}},stream);assert.equal(controls,1);assert.equal(tracks,2);stopCameraResources(null,stream);assert.equal(tracks,4);assert.doesNotThrow(()=>stopCameraResources({stop(){throw new Error('already stopped');}},stream));assert.equal(tracks,6);assert.doesNotThrow(()=>stopCameraResources(null,null));
});
test('late acquired streams can be stopped after a cancelled permission request',async()=>{
 let released=0;let active=true;const acquisition=Promise.resolve({getTracks:()=>[{stop(){released++;}}]});active=false;const stream=await acquisition;if(!active)stopCameraResources(null,stream);assert.equal(released,1);
});
test('permission, absent camera, busy device and insecure-context errors have actionable guidance',()=>{
 assert.match(cameraErrorMessage({name:'NotAllowedError'}),/permission was denied/);assert.match(cameraErrorMessage({name:'NotFoundError'}),/No camera/);assert.match(cameraErrorMessage({name:'NotReadableError'}),/busy/);assert.match(cameraErrorMessage({name:'SecurityError'}),/HTTPS or localhost/);
});
// Synthetic test image, not a real product photo or a food safety claim.
function eanImage(code){
 const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
 const G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
 const parity=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'][Number(code[0])];
 let pattern='101';for(let i=1;i<=6;i++)pattern+=(parity[i-1]==='L'?L:G)[Number(code[i])];pattern+='01010';for(let i=7;i<13;i++)pattern+=L[Number(code[i])].replace(/[01]/g,bit=>bit==='1'?'0':'1');pattern+='101';const scale=4;const quiet=20;const width=(pattern.length+2*quiet)*scale;const height=180;const pixels=new Uint8ClampedArray(width*height).fill(255);for(let y=20;y<height-20;y++)for(let x=0;x<pattern.length;x++)if(pattern[x]==='1')pixels.fill(0,y*width+(quiet+x)*scale,y*width+(quiet+x+1)*scale);return {pixels,width,height};
}
test('installed ZXing reader decodes a real EAN-13 pixel fixture into the validated scanner route',()=>{
 const code='3017620422003';const {pixels,width,height}=eanImage(code);const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,width,height)));const hints=new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.UPC_A]]]);const result=new MultiFormatReader().decode(bitmap,hints);assert.equal(result.getText(),code);assert.equal(scannerDestination(normalizeBarcode(result.getText())),'/scan/result/'+code);
});
