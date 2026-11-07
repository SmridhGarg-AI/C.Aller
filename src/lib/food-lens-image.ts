import {imageMime,MAX_PHOTO_BYTES,MAX_SOURCE_BYTES,photoDimensions} from './food-lens.ts';
export async function prepareLensPhoto(source:Blob):Promise<Blob> {
  if (!['image/jpeg','image/png','image/webp'].includes(source.type) || source.size>MAX_SOURCE_BYTES || !source.size) throw new Error('Choose a JPG, PNG or WebP image up to 15 MB.');
  if(imageMime(new Uint8Array(await source.slice(0,12).arrayBuffer()))!==source.type) throw new Error('The image contents do not match its file type.');
  const bitmap=await createImageBitmap(source).catch(()=>{throw new Error('This image could not be opened. Try another JPG, PNG or WebP.');});
  try {
    const size=photoDimensions(bitmap.width,bitmap.height);
    const canvas=document.createElement('canvas');Object.assign(canvas,size);
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image processing is unavailable in this browser.');
    ctx.fillStyle='#FFF8EF';ctx.fillRect(0,0,size.width,size.height);ctx.drawImage(bitmap,0,0,size.width,size.height);
    for(const quality of [.84,.7,.55]) {
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not prepare this image.')),'image/jpeg',quality));
      if(blob.size<=MAX_PHOTO_BYTES)return blob;
    }
    throw new Error('Image is too detailed. Try cropping it or choosing a smaller photo.');
  } finally {bitmap.close();}
}
export async function captureLensPhoto(video:HTMLVideoElement) {
  const size=photoDimensions(video.videoWidth,video.videoHeight);
  const canvas=document.createElement('canvas');Object.assign(canvas,size);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Camera capture is unavailable.');
  ctx.drawImage(video,0,0,size.width,size.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not capture photo.')),'image/jpeg',.9));
  return prepareLensPhoto(blob);
}
