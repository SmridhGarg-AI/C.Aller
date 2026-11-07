// Legacy scaffold endpoint. Dedicated endpoints enforce their own authentication, limits and validation.
export async function POST(){return Response.json({error:'This legacy endpoint is retired. Use /api/chat, /api/food-lens or /api/ingredients/extract.'},{status:410,headers:{'Cache-Control':'no-store'}});}
