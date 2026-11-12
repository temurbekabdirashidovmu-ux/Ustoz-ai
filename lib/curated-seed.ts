import {env} from 'cloudflare:workers';
import {db} from './service';
import {searchKey} from './book-validation.mjs';
import payload from './curated-payload.json';
// Immutable, reviewed public-domain/CC BY-SA books only. No user supplied URL
// is fetched here. Existing records (including archived books) are preserved.
let pending:Promise<void>|undefined;
export async function ensureCuratedBooks(){
 if(pending)return pending;
 pending=(async()=>{
  const existing=await db().prepare('SELECT id FROM books WHERE id IN ('+payload.map(()=>'?').join(',')+')').bind(...payload.map(x=>x.id)).all();
  const ids=new Set(existing.results.map((x:any)=>x.id));
  const bucket=(env as unknown as {BUCKET:R2Bucket}).BUCKET;
  for(const b of payload){
   if(ids.has(b.id))continue;
   const key='books/'+b.id+'.pdf';
   const bytes=Uint8Array.from(atob(b.base64),x=>x.charCodeAt(0));
   await bucket.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});
   const now=new Date().toISOString();
   await db().prepare('INSERT OR IGNORE INTO books (id,title,author,language,category,description,source,status,object_key,hash,size,original_name,search_text,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(b.id,b.title,b.author,b.language,b.category,b.description,b.source,'published',key,b.hash,b.size,b.id+'.pdf',searchKey(b.title+' '+b.author+' '+b.description),now,now).run();
  }
 })().catch(error=>{pending=undefined;throw error;});
 return pending;
}
