import {NextResponse} from 'next/server';
import {searchPackaged} from '@/lib/server/open-food-facts';
import {screeningProfile} from '@/lib/server/screening-profile';
import {assessAllergens} from '@/lib/allergen-assessment';
export async function GET(request:Request){const query=new URL(request.url).searchParams.get('q')?.trim()||'';if(!query||query.length>100)return NextResponse.json({error:'Enter a search query of 1–100 characters.'},{status:400});
 try{const [products,profile]=await Promise.all([searchPackaged(query),screeningProfile()]);return NextResponse.json({products:products.map(p=>({...p,assessment:assessAllergens(p.screening,profile.profile)})),profileStatus:profile.status,source:'Open Food Facts · community contributed packaged-food records',restaurantConfigured:false,homemadeConfigured:false},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Search is unavailable. Please retry.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
