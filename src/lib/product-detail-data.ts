import type {SearchProduct} from './search-data';
import {assessAllergens,type AllergyProfile} from './allergen-assessment.ts';
export function screenedAlternatives(products:SearchProduct[],current:SearchProduct,profile:AllergyProfile|null){
 const category=alternativeCategory(current);if(!profile||!category)return [];const seen=new Set<string>();return products.filter(p=>{if(p.code===current.code||seen.has(p.code)||!p.categories.includes(category))return false;seen.add(p.code);return true;}).map(product=>({product,assessment:assessAllergens(product.screening,profile)})).filter(item=>item.assessment.risk==='safe').slice(0,6);
}
export function alternativeCategory(product:SearchProduct){return product.categories.filter(x=>/^en:[a-z0-9-]+$/.test(x)&&!['en:foods','en:plant-based-foods-and-beverages','en:plant-based-foods','en:beverages'].includes(x)).at(-1)||null;}
