/** Retry one transient provider failure; never retry invalid keys or malformed input. */
export async function geminiFetch(fetcher:typeof fetch,url:string,init:RequestInit){
 const first=await fetcher(url,init);
 if(![502,503,504].includes(first.status))return first;
 await first.body?.cancel();
 return fetcher(url,init);
}
