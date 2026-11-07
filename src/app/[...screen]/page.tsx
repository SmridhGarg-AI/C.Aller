import Splash from '@/components/splash';
import {notFound,redirect} from 'next/navigation';
const aliases:Record<string,string>={onboarding:'/onboarding/name',food:'/search','ingredient-analysis':'/ingredients/analysis'};
export function generateStaticParams(){return ['splash',...Object.keys(aliases)].map(screen=>({screen:[screen]}));}
export default async function Page({params}:{params:Promise<{screen:string[]}>}){const {screen}=await params;if(screen.length!==1)notFound();if(screen[0]==='splash')return <Splash/>;if(aliases[screen[0]])redirect(aliases[screen[0]]);notFound();}
