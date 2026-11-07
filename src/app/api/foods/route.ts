import {randomUUID} from 'node:crypto';
import {serverEntitlement} from '@/lib/server/entitlements';
import {NextResponse} from 'next/server';
import {searchPackaged,packagedProduct} from '@/lib/server/open-food-facts';
import {screeningProfile} from '@/lib/server/screening-profile';
import {assessAllergens} from '@/lib/allergen-assessment';
export async function GET(request:Request){
 const url=new URL(request.url);const barcode=url.searchParams.get('barcode');const query=url.searchParams.get('q')?.trim()||'';
 if((!barcode&&!query)||query.length>100||(barcode&&!/^\d{8,14}$/.test(barcode)))return NextResponse.json({error:'Enter a search term or an 8–14 digit barcode.'},{status:400});
 try{if(barcode){const usage=await serverEntitlement(randomUUID(),barcode);if(!usage.allowed)return NextResponse.json({error:'Monthly limit reached. Free includes 50 barcode scans per UTC calendar month.'},{status:429});}const [items,profile]=await Promise.all([barcode?packagedProduct(barcode).then(p=>p?[p]:[]):searchPackaged(query),screeningProfile()]);return NextResponse.json({source:'Open Food Facts · community contributed, check packaging',profileStatus:profile.status,products:items.map(p=>({...p,assessment:assessAllergens(p.screening,profile.profile)}))},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Product lookup failed. Please retry.'},{status:502});}
}

