import Link from 'next/link';
import {randomUUID} from 'node:crypto';
import {serverEntitlement} from '@/lib/server/entitlements';
import {notFound,redirect} from 'next/navigation';
import {Suspense} from 'react';
import {normalizeBarcode} from '@/lib/barcode';
import {packagedProduct} from '@/lib/server/open-food-facts';
import {screeningProfile} from '@/lib/server/screening-profile';
import {productSaveState} from '@/lib/server/product-save-state';
import {assessAllergens} from '@/lib/allergen-assessment';
import {validScanId} from '@/lib/scan-result-data';
import ScanResult from '@/components/scan-result';
import ProductAlternatives from '@/components/product-alternatives';
export const dynamic='force-dynamic';
export default async function BarcodeResultPage({params,searchParams}:{params:Promise<{barcode:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {barcode}=await params;const code=normalizeBarcode(barcode);if(!code||code!==barcode)notFound();const query=await searchParams;const scanId=validScanId(query.scan)?query.scan:'';
 if(!scanId)redirect('/scan/result/'+code+'?scan='+randomUUID());
 let allowance;try{allowance=await serverEntitlement(scanId||randomUUID(),code);}catch(e){return <main className='screen-content'><h1>Barcode scan unavailable</h1><p>{e instanceof Error?e.message:'Scan limits could not be checked.'}</p><Link href='/login'>Sign in</Link><br/><Link href='/plus'>View plan and usage</Link><br/><Link href='/scan/barcode'>Retry scan</Link></main>;}if(!allowance.allowed)return <main className='screen-content'><h1>Monthly scan limit reached</h1><p>Free includes 50 barcode scans per UTC calendar month. Your allowance resets next month.</p><Link href='/plus'>View your plan</Link><br/><Link href='/home'>Return home</Link></main>;
 const [product,profile,saveState]=await Promise.allSettled([packagedProduct(code),screeningProfile(),productSaveState(code)]);
 const saved=saveState.status==='fulfilled'?saveState.value:{signedIn:false,userId:'',favorite:false,favoriteUnavailable:true};
 const screening=profile.status==='fulfilled'?profile.value:{profile:null,status:'unavailable'};
 const result=product.status==='fulfilled'?product.value:null;const failed=product.status==='rejected';
 return <ScanResult key={code+':'+saved.userId+':'+scanId+':'+saved.favorite} barcode={code} scanId={scanId} product={result} assessment={result?assessAllergens(result.screening,screening.profile):null} failed={failed} profileStatus={screening.status} {...saved} alternatives={result?<Suspense fallback={<p role="status">Screening similar products…</p>}><ProductAlternatives product={result} profile={screening.profile} query="" conservativeLabels/></Suspense>:undefined}/>;
}
