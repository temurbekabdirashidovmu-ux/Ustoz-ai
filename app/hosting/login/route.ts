import {env} from 'cloudflare:workers';
import {identity} from '../../../lib/admin-auth';
import {signToken, safeReturnPath, validIdentity} from '../../../lib/hosting-proof.mjs';

export async function GET(req:Request) {
  const runtime = env as unknown as {HOSTING_PROXY_SECRET?:string; HOSTING_PUBLIC_ORIGIN?:string};
  if(!runtime.HOSTING_PROXY_SECRET || !runtime.HOSTING_PUBLIC_ORIGIN) return new Response('Yangi manzil hozircha tayyorlanmoqda.',{status:503});
  const url = new URL(req.url), state = url.searchParams.get('state') || '';
  if(!/^[a-zA-Z0-9_-]{43}$/.test(state)) return new Response('Kirish so‘rovi noto‘g‘ri.',{status:400});
  const returnTo = safeReturnPath(url.searchParams.get('return_to') || '/');
  const user = identity(req);
  const headers = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex,nofollow'};
  if(!validIdentity(user)) return new Response(null,{status:303,headers:{...headers,Location:'/signin-with-chatgpt?return_to='+encodeURIComponent(url.pathname+url.search)}});
  const now = Date.now();
  const token = await signToken(runtime.HOSTING_PROXY_SECRET,{purpose:'login',aud:runtime.HOSTING_PUBLIC_ORIGIN,iat:now,exp:now+60000,state,returnTo,identity:{userId:user.userId,email:user.email}});
  return new Response(null,{status:303,headers:{...headers,Location:runtime.HOSTING_PUBLIC_ORIGIN+'/auth/callback?token='+encodeURIComponent(token)}});
}
