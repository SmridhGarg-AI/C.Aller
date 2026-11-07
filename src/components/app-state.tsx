'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {browserSupabase} from '@/lib/supabase/client';
import {initializeApplication,InitializationError,type ApplicationState,type InitializationProgress} from '@/lib/initialization';
type StateContext={state:ApplicationState|null;progress:InitializationProgress;initialize:()=>Promise<ApplicationState>};
const Context=createContext<StateContext|null>(null);
export function AppStateProvider({children}:{children:React.ReactNode}){
 const [state,setState]=useState<ApplicationState|null>(null);const [progress,setProgress]=useState<InitializationProgress>({completed:0,label:'Checking your session…'});
 const inFlight=useRef<Promise<ApplicationState>|null>(null);const controller=useRef<AbortController|null>(null);const userId=useRef<string|null>(null);
 const initialize=useCallback(()=>{
  if(inFlight.current)return inFlight.current;
  const abort=new AbortController();controller.current=abort;let timer:ReturnType<typeof setTimeout>;
  setState(null);setProgress({completed:0,label:'Checking your session…'});
  const request=Promise.race([
   Promise.resolve().then(()=>initializeApplication(browserSupabase(),value=>{if(!abort.signal.aborted)setProgress(value);},abort.signal)),
   new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(new InitializationError('timeout','Initialization is taking too long. Check your connection and retry.'));},15000);}),
  ]).then(result=>{abort.signal.throwIfAborted();userId.current=result.userId;setState(result);return result;}).finally(()=>{clearTimeout(timer);inFlight.current=null;controller.current=null;});
  inFlight.current=request;return request;
 },[]);
 useEffect(()=>{
  const db=browserSupabase();const subscription=db?.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'||(session&&userId.current&&session.user.id!==userId.current)){controller.current?.abort();userId.current=null;setState(null);}
  });
  return()=>{subscription?.data.subscription.unsubscribe();};
 },[]);
 return <Context.Provider value={{state,progress,initialize}}>{children}</Context.Provider>;
}
export function useApplicationState(){const value=useContext(Context);if(!value)throw new Error('Application state provider is missing.');return value;}
