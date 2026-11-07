export const MAX_PHOTO_BYTES = 2_000_000;
export const MAX_SOURCE_BYTES = 15_000_000;
export const PHOTO_WARNING = 'A photograph cannot reliably reveal hidden ingredients, allergens or cross-contact. No allergy risk assessment has been performed.';
export type LensResult = { identities: string[]; ingredientSuggestions: string[] };
export function imageMime(bytes: Uint8Array) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return 'image/png';
  if (String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP') return 'image/webp';
  return null;
}
export function photoDimensions(width:number,height:number) {
  if (!Number.isFinite(width*height) || width<=0 || height<=0 || width*height>40_000_000) throw new Error('Choose an image smaller than 40 megapixels.');
  const scale=Math.min(1,1600/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
export function parseLensResult(value:unknown):LensResult {
  if (!value || typeof value!=='object') throw new Error('Invalid food suggestions.');
  const data=value as Record<string,unknown>;
  const list=(v:unknown,max:number)=>{
    if (!Array.isArray(v)||v.length>max||v.some(s=>typeof s!=='string'||!s.trim()||s.length>80||/safe|free\s*from|allergen|no\s+(?:known\s+)?conflict/i.test(s))) throw new Error('Invalid food suggestions.');
    return [...new Set((v as string[]).map(s=>s.trim()))];
  };
  return {identities:list(data.identities,4),ingredientSuggestions:list(data.ingredientSuggestions,10)};
}
