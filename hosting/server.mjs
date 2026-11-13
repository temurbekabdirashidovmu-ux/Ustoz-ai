import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import {signToken, verifyToken, hashBody, validIdentity, safeReturnPath} from '../lib/hosting-proof.mjs';

const SESSION = '__Host-ziyo_render';
const PENDING = '__Host-ziyo_pending';
const LIMIT = 27*1024*1024;
const passHeaders = new Set(['accept','accept-language','content-type','range','if-range','if-none-match','if-modified-since','user-agent']);
const passCookies = new Set(['ziyo_email','ziyo_login_user']);
export function cookies(header = '') {
  return Object.fromEntries(header.split(';').map(v=>v.trim().split(/=(.*)/s).slice(0,2)).filter(v=>v.length===2));
}
export function cookie(name, value, age) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
}
export function safeCookies(header) {
  return Object.entries(cookies(header)).filter(([k])=>passCookies.has(k)).map(([k,v])=>`${k}=${v}`).join('; ');
}
export function createGateway({upstream, publicOrigin, secret, fetcher = fetch}) {
  const backend = new URL(upstream).origin;
  const origin = new URL(publicOrigin).origin;
  if(secret.length<43) throw new Error('HOSTING_PROXY_SECRET is required');
  async function handle(req, res) {
    const headers = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
    function send(status, body = '', extra = {}) {res.writeHead(status, {...headers,...extra});res.end(body);}
    function redirect(location, extra = {}) {send(303,'',{Location:location,...extra});}
    if(req.url === '/healthz') return send(200,'ok',{'Content-Type':'text/plain'});
    if(req.headers.host !== new URL(origin).host) return send(421,'Noto‘g‘ri manzil.');
    const url = new URL(req.url,origin);
    if(url.origin !== origin) return send(400,'Noto‘g‘ri so‘rov.');
    const jar = cookies(req.headers.cookie);
    if(url.pathname === '/signin-with-chatgpt') {
      const state = randomBytes(32).toString('base64url');
      const returnTo = safeReturnPath(url.searchParams.get('return_to') || '/');
      const next = backend+'/hosting/login?state='+state+'&return_to='+encodeURIComponent(returnTo);
      return redirect(next,{'Set-Cookie':cookie(PENDING,state,300),'X-Robots-Tag':'noindex,nofollow'});
    }
    if(url.pathname === '/auth/callback') {
      const data = await verifyToken(secret,url.searchParams.get('token'),'login',origin);
      if(!data || !jar[PENDING] || data.state !== jar[PENDING] || !validIdentity(data.identity)) return send(403,'Kirish so‘rovi eskirgan. Saytdan qayta kirishni bosing.',{'X-Robots-Tag':'noindex,nofollow'});
      const now=Date.now();
      const token=await signToken(secret,{purpose:'session',aud:origin,iat:now,exp:now+24*60*60*1000,identity:data.identity});
      return redirect(safeReturnPath(data.returnTo),{'Set-Cookie':[cookie(SESSION,token,86400),cookie(PENDING,'',0)],'X-Robots-Tag':'noindex,nofollow'});
    }
    if(url.pathname === '/signout-with-chatgpt') return redirect(safeReturnPath(url.searchParams.get('return_to')||'/'),{'Set-Cookie':[cookie(SESSION,'',0),cookie(PENDING,'',0),cookie('ziyo_email','',0),cookie('ziyo_login_user','',0)]});
    if(url.pathname.startsWith('/hosting/') || url.pathname.startsWith('/auth/')) return send(404,'Topilmadi.');
    const unsafe = !['GET','HEAD','OPTIONS'].includes(req.method);
    if(unsafe && req.headers.origin !== origin) return send(403,'So‘rovni sayt ichidan yuboring.');
    if(req.method === 'OPTIONS') return send(204,'',{Allow:'GET, HEAD, POST, PATCH, DELETE, OPTIONS'});
    let length=0;const chunks=[];
    for await(const chunk of req) {length+=chunk.length;if(length>LIMIT)return send(413,'Fayl juda katta.');chunks.push(chunk);}
    const body=Buffer.concat(chunks);
    const session=await verifyToken(secret,jar[SESSION],'session',origin);
    const identity=session&&validIdentity(session.identity)?session.identity:null;
    const forwarded=new Headers();
    for(const [name,value] of Object.entries(req.headers)) if(passHeaders.has(name)&&typeof value==='string')forwarded.set(name,value);
    const kept=safeCookies(req.headers.cookie);if(kept)forwarded.set('cookie',kept);
    if(req.headers.origin===origin)forwarded.set('origin',backend);
    const now=Date.now();
    forwarded.set('x-ziyomakon-proof',await signToken(secret,{purpose:'request',aud:backend,origin,iat:now,exp:now+45000,method:req.method,path:url.pathname+url.search,body:await hashBody(body),identity}));
    const response=await fetcher(backend+url.pathname+url.search,{method:req.method,headers:forwarded,body:unsafe?body:undefined,redirect:'manual',signal:AbortSignal.timeout(90000)});
    const out=new Headers(response.headers);
    for(const name of ['content-length','content-encoding','transfer-encoding','connection','set-cookie','alt-svc'])out.delete(name);
    out.set('Cache-Control','private, no-store');out.set('Vary','Cookie');out.set('Referrer-Policy','no-referrer');
    const location=out.get('location');
    if(location){const dest=new URL(location,backend);if(dest.origin===backend)out.set('Location',origin+dest.pathname+dest.search+dest.hash);}
    const responseCookies=response.headers.getSetCookie?.()||[];
    const accepted=responseCookies.filter(v=>passCookies.has(v.split('=')[0])).map(v=>v.replace(/;\s*Domain=[^;]+/ig,'').replace(/;\s*Secure/ig,'')+'; Secure');
    const type=out.get('content-type')||'';
    let text;
    if(/text\/|application\/(?:json|javascript|xml)|image\/svg\+xml/.test(type))text=(await response.text()).replaceAll(backend,origin);
    if(/^(?:\/admin|\/api\/|\/profil|\/kirish|\/sozlash|\/bellashuv|\/google[^/]+\.html)/.test(url.pathname))out.set('X-Robots-Tag','noindex,nofollow');
    const headerObject=Object.fromEntries(out);if(accepted.length)headerObject['set-cookie']=accepted;
    res.writeHead(response.status,headerObject);
    if(req.method==='HEAD'||[204,304].includes(response.status))return res.end();
    if(text!==undefined)return res.end(text);
    if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();
  }
  return http.createServer((req,res)=>{handle(req,res).catch(()=>{if(res.headersSent){res.destroy();return;}res.writeHead(502,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Retry-After':'15'});res.end('<!doctype html><html lang="uz"><meta charset="utf-8"><title>ZIYOMAKON</title><h1>Ulanish yangilanmoqda</h1><p>Iltimos, birozdan keyin qayta urinib ko‘ring.</p></html>');});});
}
if(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const publicOrigin=process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL;
  if(!publicOrigin||!process.env.UPSTREAM_ORIGIN||!process.env.HOSTING_PROXY_SECRET)throw new Error('Missing hosting configuration');
  const server=createGateway({upstream:process.env.UPSTREAM_ORIGIN,publicOrigin,secret:process.env.HOSTING_PROXY_SECRET});
  server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('ZIYOMAKON server is ready.'));
  const close=()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),25000).unref();};
  process.on('SIGTERM',close);process.on('SIGINT',close);
}
