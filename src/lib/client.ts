'use client';
import { useCallback,useEffect,useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
export async function request<T>(url:string, options?:RequestInit):Promise<T>{const response=await fetch(url,options);const json=await response.json();if(!response.ok||!json.success)throw new Error(json.error||'Unable to complete this request.');return json.data;}
export function useWorkspaceData<T>(url:string){
  const {status}=useSession();const router=useRouter();const [data,setData]=useState<T|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{setError('');try{setData(await request<T>(url));}catch(e){setError(e instanceof Error?e.message:'Unable to load workspace.');}finally{setLoading(false);}},[url]);
  useEffect(()=>{if(status==='unauthenticated')router.replace('/auth/login');if(status==='authenticated')void refresh();},[status,router,refresh]);
  return {data,error,loading:loading||status==='loading',refresh,setData};
}
export function shortDate(date?:string|null){return date?new Date(date).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'Recently';}
