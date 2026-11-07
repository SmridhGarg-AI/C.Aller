import SearchScreen from '@/components/search-screen';
export default async function SearchPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const query=typeof params.query==='string'?params.query.trim().slice(0,100):'';return <SearchScreen key={query} initialQuery={query}/>;}
