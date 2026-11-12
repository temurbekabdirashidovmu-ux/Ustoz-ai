import {sameOrigin,getKey,takeQuota,json,MODEL,safeError} from '../../../lib/service';
import {parseTutorResponse,tutorRequest} from '../../../lib/tutor-search.mjs';
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Bu saytdan savol yuboring.'},403);
 let key='';
 try{
  const text=await req.text();if(text.length>65536)return json({error:'Savol juda uzun.'},413);
  const data=JSON.parse(text);
  if(!Array.isArray(data.messages)||!data.messages.length||data.messages.some((m:any)=>!m||typeof m.text!=='string'||!['student','teacher'].includes(m.role)))return json({error:'Savol formati xato.'},400);
  if(data.webSearch!==undefined&&typeof data.webSearch!=='boolean')return json({error:'Qidiruv sozlamasi xato.'},400);
  key=await getKey();if(!key)return json({error:'AI hali sozlanmagan. Sayt egasi /sozlash sahifasida kalitni bir marta kiritsin.'},503);
  if(!await takeQuota())return json({error:'Saytning bugungi 100 ta AI so‘rov limiti tugadi. Ertaga qayta urinib ko‘ring.'},429);
  const webSearch=data.webSearch!==false;
  const call=async(search:boolean)=>{
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(tutorRequest({...data,webSearch:search},search?'gemini-2.5-flash-lite':MODEL)),signal:AbortSignal.timeout(search?35000:20000)});
   return {response,result:await response.json() as any};
  };
  let {response,result}=await call(webSearch);
  let searchUnavailable=false;
  // The older model has a free Search allowance for eligible existing projects.
  // Never claim a grounded answer when access or quota prevents searching.
  if(webSearch&&!response.ok&&[403,404,429].includes(response.status)){
   searchUnavailable=true;
   ({response,result}=await call(false));
  }
  if(!response.ok)return json({error:'Google HTTP '+response.status+': '+safeError(String(result.error?.message||'AI xizmatida xato.'),key)},502);
  const answer=parseTutorResponse(result);
  if(!answer.answer)return json({error:'AI matn qaytarmadi. Boshqacha savol yuboring.'},502);
  return json({...answer,searchUnavailable,...(searchUnavailable?{searchNotice:'Bu Google loyihasida avtomatik qidiruvga ruxsat yoki kvota yo‘q. Quyidagi AI javobi internetdan tekshirilmagan. Google’da bepul qidirish tugmasidan foydalaning.',searchQuery:data.messages.filter((m:any)=>m.role==='student').at(-1)?.text.slice(0,1000)||''}:{})});
 }catch(error){const timed=error instanceof Error&&['TimeoutError','AbortError'].includes(error.name);return json({error:timed?'AI yoki internet qidiruvi kechikdi. Birozdan keyin qayta yuboring.':'AI xizmatiga ulanishda xato. Qayta urinib ko‘ring.'},502);}
}
