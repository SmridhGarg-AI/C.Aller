import {notFound} from 'next/navigation';
import {Suspense} from 'react';
import {packagedProduct} from '@/lib/server/open-food-facts';
import {screeningProfile} from '@/lib/server/screening-profile';
import {serverSupabase} from '@/lib/supabase/server';
import {assessAllergens} from '@/lib/allergen-assessment';
import ProductDetail from '@/components/product-detail';
import ProductAlternatives from '@/components/product-alternatives';
export const dynamic='force-dynamic';
export default async function FoodPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {id}=await params;if(!/^\d{8,14}$/.test(id))notFound();const search=await searchParams;const query=typeof search.query==='string'?search.query.slice(0,100):'';const backHref=query?'/search?query='+encodeURIComponent(query):'/search';
 let product;try{product=await packagedProduct(id);}catch{return <ProductDetail product={null} assessment={null} failed backHref={backHref} favorite={false} favoriteUnavailable={false} signedIn={false}/>;}
 if(!product)notFound();const screening=await screeningProfile();let favorite=false;let favoriteUnavailable=false;let signedIn=false;let userKey="anonymous";const db=await serverSupabase();
 if(db){const {data:{user}}=await db.auth.getUser();if(user){signedIn=true;userKey=user.id;const {data,error}=await db.from('favorites').select('product_code').eq('user_id',user.id).eq('product_code',id).maybeSingle();favorite=Boolean(data);favoriteUnavailable=Boolean(error);}}
 return <ProductDetail key={id+":"+userKey+":"+favorite} product={product} assessment={assessAllergens(product.screening,screening.profile)} failed={false} backHref={backHref} favorite={favorite} favoriteUnavailable={favoriteUnavailable} signedIn={signedIn} alternatives={<Suspense fallback={<p role="status">Screening alternatives…</p>}><ProductAlternatives product={product} profile={screening.profile} query={query}/></Suspense>}/>;
}
