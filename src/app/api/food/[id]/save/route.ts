import {NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/supabase/server';
import {packagedProduct} from '@/lib/server/open-food-facts';
import {screeningProfile} from '@/lib/server/screening-profile';
import {assessAllergens} from '@/lib/allergen-assessment';
import {productAction,saveUnknownScan} from '@/lib/product-actions';
import {validScanId} from '@/lib/scan-result-data';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const origin=request.headers.get('origin');if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'This request must come from Aller Matrix.'},{status:403});
 const {id}=await params;if(!/^\d{8,14}$/.test(id))return NextResponse.json({error:'Invalid product code.'},{status:400});
 const db=await serverSupabase();if(!db)return NextResponse.json({error:'Supabase is not configured. Sign in is required to save.'},{status:503});const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Sign in to save favorites or history.'},{status:401});
 let action;let scanId:unknown;try{const body=await request.json();action=body.action;scanId=body.scanId;}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}if(!['favorite','unfavorite','history'].includes(action)||(scanId!==undefined&&!validScanId(scanId)))return NextResponse.json({error:'Invalid save action or scan identifier.'},{status:400});
 try{const product=await packagedProduct(id);if(!product){if(action!=='history')return NextResponse.json({error:'An unknown product cannot be favorited.'},{status:404});await saveUnknownScan(db,user.id,id,scanId as string|undefined);}else{const {profile}=await screeningProfile();await productAction(db,user.id,product,action,assessAllergens(product.screening,profile),scanId as string|undefined);}return NextResponse.json({saved:true},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:action==='history'?'History could not be saved. Check your connection and retry.':'Favorites could not be saved. Check your connection and ensure the favorites migration has been applied.'},{status:502});}
}
