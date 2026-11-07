'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,Heart,X,Check,AlertTriangle,HelpCircle,LoaderCircle} from 'lucide-react';
import type {SearchProduct} from '@/lib/search-data';
import {splitIngredientText,type Assessment} from '@/lib/allergen-assessment';
import {browserSupabase} from '@/lib/supabase/client';
import {FoodImage,RefreshProduct} from './product-media';
import styles from './product-detail.module.css';
type Props={product:SearchProduct|null;assessment:Assessment|null;failed:boolean;backHref:string;favorite:boolean;favoriteUnavailable:boolean;signedIn:boolean;alternatives?:React.ReactNode};
export default function ProductDetail({product,assessment,failed,backHref,favorite:initialFavorite,favoriteUnavailable,signedIn,alternatives}:Props){
 const router=useRouter();const [favorite,setFavorite]=useState(initialFavorite);const [busy,setBusy]=useState('');const [message,setMessage]=useState('');const [error,setError]=useState('');const [expanded,setExpanded]=useState(false);const lock=useRef(false);const lastAction=useRef<'favorite'|'unfavorite'|'history'>('favorite');
 useEffect(()=>{const db=browserSupabase();const sub=db?.auth.onAuthStateChange(event=>{if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event))router.refresh();});return()=>sub?.data.subscription.unsubscribe();},[router]);
 async function save(action:'favorite'|'unfavorite'|'history'){
  if(lock.current||!product)return;lock.current=true;lastAction.current=action;setBusy(action);setError('');setMessage('');
  try{const response=await fetch('/api/food/'+product.code+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Save failed. Please retry.');if(action!=='history')setFavorite(action==='favorite');setMessage(action==='history'?'Scan saved to your private history.':action==='favorite'?'Added to your favorites.':'Removed from your favorites.');}
  catch(e){setError(e instanceof Error?e.message:'Your change could not be saved. Please retry.');}finally{lock.current=false;setBusy('');}
 }
 const Icon=assessment?.risk==='unsafe'?X:assessment?.risk==='safe'?Check:assessment?.risk==='caution'?AlertTriangle:HelpCircle;
 const parts=product?splitIngredientText(product.ingredients):[];const ingredientRows=expanded?parts:parts.slice(0,3);
 return <div className={styles.workspace}><aside className={styles.desktop}><Link href="/home">Aller <em>Matrix</em></Link><p>Know what’s in your food.</p></aside><main className={styles.panel}>
 <header className={styles.header}><Link href={backHref} aria-label="Back to search results"><ArrowLeft size={21}/></Link>{product&&<button aria-label={favorite?'Remove from favorites':'Add to favorites'} aria-pressed={favorite} disabled={Boolean(busy)} onClick={()=>signedIn?void save(favorite?'unfavorite':'favorite'):router.push('/login')}><Heart size={24} fill={favorite?'#c96e4b':'none'} color={favorite?'#c96e4b':'currentColor'}/></button>}</header>
 {failed||!product||!assessment?<section role="alert" className={styles.error}><h1>Product couldn’t be loaded</h1><p>The product service may be unavailable. Retry or return to search.</p><RefreshProduct/></section>:<>
 <FoodImage src={product.largeImage||product.image} name={product.name} large/>
 <h1>{product.name}</h1><p className={styles.brand}>{product.brand||'Brand not provided'}</p>
 <section aria-labelledby="assessment-title" className={`${styles.assessment} ${styles[assessment.risk]}`}><span className={styles.statusIcon}><Icon size={26}/></span><div><h2 id="assessment-title">{assessment.label}</h2><p>{assessment.risk==='unsafe'?'Contains ingredients or declared allergens that conflict with your profile.':assessment.risk==='safe'?'No conflict found in the documented data for your profile.':assessment.risk==='caution'?'Possible traces or ambiguous ingredients need checking.':'There isn’t enough reliable information for a personal assessment.'}</p></div></section>
 <section className={styles.why} aria-labelledby="why-title"><h2 id="why-title">Why?</h2>{assessment.evidence.length?<ul className={styles.evidence}>{assessment.evidence.map((item,i)=><li key={i}><span className={`${styles.evidenceIcon} ${styles[item.kind==='contains'?'unsafe':item.kind==='may-contain'?'caution':'unknown']}`}>{item.kind==='contains'?<X size={17}/>:item.kind==='may-contain'?<AlertTriangle size={17}/>:<HelpCircle size={17}/>}</span><div><strong>{item.kind==='contains'?'Contains':item.kind==='may-contain'?'May contain':'Unknown'} {item.allergy}</strong><p>{item.detail}</p><small>Source: {item.source}</small></div></li>)}</ul>:<div className={styles.reason}>{assessment.reasons.map(reason=><p key={reason}>{reason}</p>)}</div>}</section>
 <section className={styles.ingredients}><header><h2>Ingredients</h2>{parts.length>3&&<button aria-expanded={expanded} aria-controls="ingredient-list" onClick={()=>setExpanded(!expanded)}>{expanded?'Show less':'See all'}</button>}</header>{parts.length?<ul id="ingredient-list">{ingredientRows.map((part,i)=><li key={i}><span>{part}</span><small>Open Food Facts ingredient list</small></li>)}</ul>:<p>Ingredients are unavailable. This product needs verification.</p>}<p className={styles.source}>Source: Open Food Facts · community contributed, not independently verified. No ingredients have been invented.</p></section>
 <section className={styles.declarations}><h2>Declared allergens</h2><p>{product.screening.allergens.map(x=>x.replace(/^[a-z]{2}:/,'').replace(/-/g,' ')).join(', ')||'Unknown — no declaration supplied.'}</p><h3>May contain / traces</h3><p>{product.screening.traces.map(x=>x.replace(/^[a-z]{2}:/,'').replace(/-/g,' ')).join(', ')||'Unknown — no separate trace statement supplied. Check the ingredient list and package.'}</p><small>Source: Open Food Facts allergen and trace fields</small>{!product.screening.complete&&<p className={styles.missing}>Ingredient coverage is incomplete. No Safe assessment is made from incomplete data.</p>}</section>
 <section className={styles.alternatives} aria-labelledby="alternatives-title"><h2 id="alternatives-title">Recommended Alternatives</h2>{alternatives}</section>
 <p className={styles.safety}>Profile screening cannot guarantee a product is allergen-free or safe from cross-contact. Always check the current package label.</p>
 {favoriteUnavailable&&<p role="status" className={styles.source}>Saved favorites couldn’t be loaded. Ensure the favorites migration is applied; saving the heart will retry.</p>}
 {signedIn?<button className={styles.primary} disabled={Boolean(busy)} onClick={()=>void save('history')}>{busy==='history'?<><LoaderCircle size={17} className={styles.spin}/>Saving…</>:'Save scan to history'}</button>:<Link href="/login" className={styles.primary}>Sign in to save favorites and history</Link>}
 {error&&<div role="alert" className={styles.actionError}>{error}<button disabled={Boolean(busy)} onClick={()=>void save(lastAction.current)}>Retry save</button></div>}{message&&<p role="status" className={styles.success}>{message}</p>}
 <Link href="/history" className={styles.historyLink}>View saved scan history</Link>
 </>}
 </main><aside/></div>;
}
