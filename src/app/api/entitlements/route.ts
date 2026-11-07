import {serverEntitlement} from '@/lib/server/entitlements';
export async function GET(){try{return Response.json(await serverEntitlement(),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return Response.json({error:e instanceof Error?e.message:'Usage unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
