import Link from 'next/link';
import type {SearchProduct} from '@/lib/search-data';
import type {AllergyProfile} from '@/lib/allergen-assessment';
import {categoryPackaged} from '@/lib/server/open-food-facts';
import {alternativeCategory,screenedAlternatives} from '@/lib/product-detail-data';
import {FoodImage,RefreshProduct} from './product-media';
import styles from './product-detail.module.css';
export default async function ProductAlternatives({product,profile,query,conservativeLabels=false}:{product:SearchProduct;profile:AllergyProfile|null;query:string;conservativeLabels?:boolean}){
 if(!profile)return <p className={styles.empty}>Sign in and confirm your allergies to screen alternatives for your profile.</p>;
 const category=alternativeCategory(product);if(!category)return <p className={styles.empty}>No reliable product category is available for alternatives.</p>;
 let items;try{items=screenedAlternatives(await categoryPackaged(category),product,profile);}catch{return <div role="status" className={styles.empty}><p>Alternative products couldn’t be loaded.</p><RefreshProduct label="Retry alternatives"/></div>;}
 if(!items.length)return <p className={styles.empty}>No independently screened alternatives are available from this category. No products are being recommended.</p>;
 return <><p className={styles.source}>Same category · each product screened independently. Verify every package before choosing.</p><ul className={styles.alternativeList}>{items.map(({product:p,assessment})=><li key={p.code}><Link href={'/food/'+p.code+(query?'?query='+encodeURIComponent(query):'')}><FoodImage src={p.image} name={p.name}/><strong>{p.name}</strong><span className={styles.altBrand}>{p.brand||'Brand not supplied'}</span><span className={`${styles.badge} ${styles[assessment.risk]}`}>{conservativeLabels&&assessment.risk==='safe'?'No known conflicts':assessment.label}</span><small>Open Food Facts</small></Link></li>)}</ul></>;
}
