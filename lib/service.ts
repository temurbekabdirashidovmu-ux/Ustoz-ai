import { env } from 'cloudflare:workers';
const runtime = env as unknown as { DB: D1Database; OWNER_EMAIL: string; CREDENTIAL_ENCRYPTION_KEY: string };
export const MODEL='gemini-3.5-flash-lite';
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export const ownerEmail=()=>runtime.OWNER_EMAIL?.trim().toLowerCase()||'';
export function owner(req:Request){return Boolean(ownerEmail())&&req.headers.get('oai-authenticated-user-email')?.trim().toLowerCase()===ownerEmail()&&Boolean(req.headers.get('oai-authenticated-user-id'));}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
export const db=()=>runtime.DB;
async function cryptoKey(){return crypto.subtle.importKey('raw',Uint8Array.from(atob(runtime.CREDENTIAL_ENCRYPTION_KEY),c=>c.charCodeAt(0)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function saveKey(value:string){const iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},await cryptoKey(),new TextEncoder().encode(value));const stored=JSON.stringify({iv:Array.from(iv),data:Array.from(new Uint8Array(ciphertext))});await db().prepare('INSERT INTO site_settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('gemini',stored).run();}
export async function getKey(){const row=await db().prepare('SELECT value FROM site_settings WHERE id=?').bind('gemini').first<{value:string}>();if(!row)return '';const stored=JSON.parse(row.value);const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(stored.iv)},await cryptoKey(),new Uint8Array(stored.data));return new TextDecoder().decode(clear);}
export async function configured(){return Boolean(await db().prepare('SELECT id FROM site_settings WHERE id=?').bind('gemini').first());}
export async function takeQuota(){const day=new Date().toISOString().slice(0,10);const row=await db().prepare('INSERT INTO daily_usage (day,count) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET count=count+1 WHERE count<100 RETURNING count').bind(day).first();return Boolean(row);}
export function safeError(message:string,key:string){return message.split(key).join('[yashirilgan]').slice(0,1000);}
