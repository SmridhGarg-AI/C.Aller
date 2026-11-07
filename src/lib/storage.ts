import { browserSupabase } from './supabase/client';
/** Optional private persistent upload; photos sent to AI are not stored by default. */
export async function uploadFoodImage(file:File) {
 const db=browserSupabase(); if(!db) throw new Error('Supabase is not configured.');
 const {data:{user}}=await db.auth.getUser(); if(!user) throw new Error('Sign in first.');
 if(file.size>3_000_000 || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use a JPEG, PNG or WebP under 3 MB.');
 const path=`${user.id}/${crypto.randomUUID()}`;
 const {error}=await db.storage.from('food-images').upload(path,file,{contentType:file.type}); if(error)throw error;
 return path;
}
