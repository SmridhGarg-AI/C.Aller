import {paymentProvider} from '@/lib/entitlements';
export async function POST(){if(!paymentProvider())return Response.json({error:'Payments not configured. No charge was made and Plus was not activated.'},{status:503});return Response.json({error:'Checkout is unavailable until verified payment handling is deployed.'},{status:503});}
