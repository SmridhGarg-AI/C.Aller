import 'server-only';
import {normalizeOFF} from '@/lib/search-data';
const fields='code,product_name,brands,image_front_small_url,image_front_url,ingredients_text,ingredients_text_en,ingredients_lc,lang,allergens,allergens_tags,traces,traces_tags,categories_tags,states_tags,unknown_ingredients_n,ingredients_n';
export async function searchPackaged(query:string){
 const url=new URL('https://world.openfoodfacts.org/cgi/search.pl');url.search=new URLSearchParams({search_terms:query,search_simple:'1',action:'process',json:'1',page_size:'24',fields}).toString();
 const data=await requestOFF(url.toString());return (Array.isArray(data.products)?data.products:[]).map(normalizeOFF).filter((p:ReturnType<typeof normalizeOFF>)=>p!==null);
}
export async function packagedProduct(code:string){const data=await requestOFF(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`,true);return data.product?normalizeOFF({...data.product,code}):null;}
async function requestOFF(url:string,allowMissing=false){const response=await fetch(url,{headers:{'User-Agent':process.env.OPEN_FOOD_FACTS_USER_AGENT||'AllerMatrix/0.1'},signal:AbortSignal.timeout(12000),next:{revalidate:300}});if(response.status===404&&allowMissing)return {products:[],product:undefined};if(!response.ok)throw new Error(response.status===429?'The product database is busy. Wait a moment and retry.':'Open Food Facts is unavailable. Please retry.');return response.json() as Promise<{products?:Record<string,unknown>[];product?:Record<string,unknown>}>;}
export async function categoryPackaged(category:string){
 if(!/^en:[a-z0-9-]+$/.test(category))return [];
 const url=new URL('https://world.openfoodfacts.org/api/v2/search');url.search=new URLSearchParams({categories_tags:category,page_size:'24',fields}).toString();
 const data=await requestOFF(url.toString());return (data.products||[]).map(normalizeOFF).filter((p:ReturnType<typeof normalizeOFF>)=>p!==null);
}
