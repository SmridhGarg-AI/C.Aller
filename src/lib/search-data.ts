import type {AssessmentInput} from './allergen-assessment';
export type SearchProduct={code:string;name:string;brand:string;image:string|null;largeImage?:string|null;ingredients:string;allergens:string;categories:string[];source:'Open Food Facts';screening:AssessmentInput};
export function normalizeOFF(p:Record<string,unknown>):SearchProduct|null{
 const code=String(p.code||'');if(!/^\d{8,14}$/.test(code))return null;
 const list=(key:string)=>Array.isArray(p[key])?(p[key] as unknown[]).filter((x):x is string=>typeof x==='string'):[];
 const ingredients=typeof p.ingredients_text_en==='string'&&p.ingredients_text_en.trim()?p.ingredients_text_en:typeof p.ingredients_text==='string'?p.ingredients_text:'';
 const english=Boolean(typeof p.ingredients_text_en==='string'&&p.ingredients_text_en.trim())||p.lang==='en'||p.ingredients_lc==='en';
 return {code,name:typeof p.product_name==='string'&&p.product_name.trim()?p.product_name:'Unnamed product',brand:typeof p.brands==='string'?p.brands:'',image:typeof p.image_front_small_url==='string'?p.image_front_small_url:null,largeImage:typeof p.image_front_url==='string'?p.image_front_url:null,ingredients,allergens:typeof p.allergens==='string'?p.allergens:'',categories:list('categories_tags'),source:'Open Food Facts',screening:{ingredients,allergens:[...list('allergens_tags'),...(typeof p.allergens==='string'?[p.allergens]:[])],traces:[...list('traces_tags'),...(typeof p.traces==='string'&&p.traces?[p.traces]:[])],complete:list('states_tags').includes('en:ingredients-completed')&&p.unknown_ingredients_n===0&&typeof p.ingredients_n==='number'&&p.ingredients_n>0,english}};
}
export const searchCategories=['All','Burgers','Fast Food','Homemade'] as const;
export function categoryMatches(product:SearchProduct,category:string){if(category==='All')return true;if(category==='Burgers')return product.categories.some(x=>/(^|[-:])(burgers|hamburgers|cheeseburgers|veggie-burgers)$/.test(x));return false;}
