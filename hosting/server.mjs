import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import {signToken, verifyToken, hashBody, validIdentity, safeReturnPath} from '../lib/hosting-proof.mjs';
import {validGoogleClientId,verifyGoogleCredential,googleLoginPage,googlePrivacyPage} from './google-auth-bundle.mjs';
import {legacyGoogleProfiles,googleGatewayIdentity} from './legacy-google-profiles.mjs';
import {compactNavigationPage} from '../lib/navigation.mjs';
import {createEmailLogin,createResendSender,emailLoginPage} from './email-login.mjs';

const SESSION = '__Host-ziyo_render';
const PENDING = '__Host-ziyo_pending';
const GOOGLE_PENDING = '__Host-ziyo_google_pending';
const EMAIL_PENDING = '__Host-ziyo_email_pending';
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
export function createGateway({upstream, publicOrigin, secret, fetcher = fetch, googleClientId = '', googleVerifier = verifyGoogleCredential, legacyProfiles,emailSender=null}) {
  const backend = new URL(upstream).origin;
  const origin = new URL(publicOrigin).origin;
  const googleEnabled=validGoogleClientId(googleClientId);
  const legacyMap=legacyGoogleProfiles(legacyProfiles);
  const emailEnabled=typeof emailSender==='function';
  if(emailEnabled&&!legacyMap)throw Error('Email login requires reviewed legacy profiles');
  const emailLogin=emailEnabled?createEmailLogin({secret,send:emailSender}):null;
  const loginPath=googleEnabled?'/auth/google/start':'/auth/email';
  function backendIdentityFor(identity){
    if(identity.provider==='email')return {...identity,provider:'email-gateway',userId:legacyMap.get(identity.email)||identity.userId};
    return legacyMap?googleGatewayIdentity(identity,legacyMap):identity;
  }
  if(googleClientId && !googleEnabled)throw new Error('GOOGLE_CLIENT_ID is invalid');
  if(secret.length<43) throw new Error('HOSTING_PROXY_SECRET is required');
  async function handle(req, res) {
    // Native form POSTs can acquire an opaque Origin under no-referrer.
    // Keep the browser's same-origin signal for CSRF checks on ordinary pages.
    const headers = {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff'};
    function send(status, body = '', extra = {}) {res.writeHead(status, {...headers,...extra});res.end(body);}
    function redirect(location, extra = {}) {send(303,'',{Location:location,...extra});}
    if(req.url === '/healthz') return send(200,'ok',{'Content-Type':'text/plain'});
    if(req.headers.host !== new URL(origin).host) return send(421,'Noto‘g‘ri manzil.');
    const url = new URL(req.url,origin);
    if(url.origin !== origin) return send(400,'Noto‘g‘ri so‘rov.');
    const jar = cookies(req.headers.cookie);
    if(url.pathname==='/auth/email'||url.pathname==='/auth/email/send'||url.pathname==='/auth/email/verify') {
      const authHeaders={'Content-Type':'text/html; charset=utf-8','Referrer-Policy':'strict-origin-when-cross-origin','X-Robots-Tag':'noindex,nofollow'};
      const returnTo=safeReturnPath(url.searchParams.get('return_to')||'/');
      const show=(status,options={})=>send(status,emailLoginPage({configured:emailEnabled,googleEnabled,returnTo,...options}),authHeaders);
      if(!emailEnabled)return show(503);
      if(req.method==='GET'&&url.pathname==='/auth/email')return show(200);
      if(req.method!=='POST')return show(405,{error:'Kirish sahifasidan davom eting.'});
      if(req.headers.origin!==origin)return send(403,'So‘rovni sayt ichidan yuboring.');
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>3000)return show(413,{error:'So‘rov juda katta.'});chunks.push(chunk);}
      const form=new URLSearchParams(Buffer.concat(chunks).toString());
      if(url.pathname==='/auth/email/send') {
        try {
          const pending=await emailLogin.begin(form.get('email'),form.get('return_to'));
          authHeaders['Set-Cookie']=cookie(EMAIL_PENDING,pending.id,300);
          return show(200,{email:pending.email,returnTo:safeReturnPath(form.get('return_to'))});
        }catch(error){return show(error.status||503,{error:error.message,returnTo:safeReturnPath(form.get('return_to'))});}
      }
      if(url.pathname!=='/auth/email/verify')return show(405);
      let verified;
      try{verified=emailLogin.verify(jar[EMAIL_PENDING],form.get('code'));}
      catch(error){const pending=emailLogin.inspect(jar[EMAIL_PENDING]);return show(error.status||403,{error:error.message,...(pending||{})});}
      const identity=verified.identity,now=Date.now(),backendIdentity=backendIdentityFor(identity);
      const proof=await signToken(secret,{purpose:'request',aud:backend,origin,iat:now,exp:now+45000,method:'GET',path:'/api/profile',body:await hashBody(new Uint8Array()),identity:backendIdentity});
      const forwarded={'x-ziyomakon-proof':proof};if(typeof req.headers['user-agent']==='string')forwarded['user-agent']=req.headers['user-agent'];
      let profile;try{profile=await fetcher(backend+'/api/profile',{headers:forwarded,redirect:'manual',signal:AbortSignal.timeout(20000)});}catch{}
      authHeaders['Set-Cookie']=cookie(EMAIL_PENDING,'',0);
      if(profile?.status!==200)return show(503,{error:'Profil ochilmadi. Yangi kod so‘rab, qayta urinib ko‘ring.'});
      const token=await signToken(secret,{purpose:'session',aud:origin,iat:now,exp:now+86400000,identity,returnTo:verified.returnTo});
      return redirect(verified.returnTo,{...authHeaders,'Set-Cookie':[cookie(SESSION,token,86400),cookie(EMAIL_PENDING,'',0),cookie(GOOGLE_PENDING,'',0),cookie(PENDING,'',0),cookie('ziyo_email','',0),cookie('ziyo_login_user','',0)]});
    }
    if(url.pathname === '/privacy' && req.method === 'GET')return send(200,googlePrivacyPage().replace('</body>',(emailEnabled?'<h2>Gmail kodi bilan kirish</h2><p>Kirish kodini yuborish uchun Gmail manzilingiz va bir martalik kod Resend xat yuborish xizmatiga uzatiladi. Kod 5 daqiqa amal qiladi va bir marta ishlatiladi. Server kodning tekshiruv xeshini vaqtincha saqlaydi. Google parolingiz so‘ralmaydi.</p>':'')+'</body>'),{'Content-Type':'text/html; charset=utf-8'});
    if(emailEnabled&&!googleEnabled&&url.pathname==='/kirish'&&req.method==='GET')return redirect('/auth/email?return_to='+encodeURIComponent(safeReturnPath(url.searchParams.get('return_to')||'/')));
    if((googleEnabled||emailEnabled) && (url.pathname === '/signin-with-chatgpt' || url.pathname === '/kirish' && req.method === 'POST')) {
      if(req.method==='POST' && req.headers.origin!==origin)return send(403,'So‘rovni sayt ichidan yuboring.');
      return redirect(loginPath+'?return_to='+encodeURIComponent(safeReturnPath(url.searchParams.get('return_to')||'/')),{'Referrer-Policy':'no-referrer'});
    }
    if((googleEnabled && url.pathname==='/kirish' || url.pathname==='/auth/google/start') && req.method==='GET') {
      const nonce=randomBytes(32).toString('base64url'),now=Date.now();
      const pending=await signToken(secret,{purpose:'google-pending',aud:origin,iat:now,exp:now+600000,nonce,returnTo:safeReturnPath(url.searchParams.get('return_to')||'/')});
      return send(googleEnabled?200:503,googleLoginPage({clientId:googleEnabled?googleClientId:'',nonce,origin}),{
        'Content-Type':'text/html; charset=utf-8','Cross-Origin-Opener-Policy':'same-origin-allow-popups','X-Robots-Tag':'noindex,nofollow',
        'Set-Cookie':[cookie(GOOGLE_PENDING,pending,600).replace('SameSite=Lax','SameSite=None'),cookie('ziyo_email','',0),cookie('ziyo_login_user','',0)]
      });
    }
    if(url.pathname === '/auth/google/callback') {
      const authHeaders={'Content-Type':'text/html; charset=utf-8','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex,nofollow','Set-Cookie':cookie(GOOGLE_PENDING,'',0)};
      const fail=(error='Google tasdig‘i qabul qilinmadi. Kirish sahifasini qayta oching.',status=403)=>send(status,googleLoginPage({clientId:'',nonce:'',origin,error}),authHeaders);
      if(!googleEnabled || req.method!=='POST')return fail();
      const pending=await verifyToken(secret,jar[GOOGLE_PENDING],'google-pending',origin);
      if(!pending || typeof pending.nonce!=='string')return fail('Kirish vaqti tugagan yoki brauzer kirish cookie’sini qabul qilmagan. Google orqali qayta boshlang.');
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>20000)return fail();chunks.push(chunk);}
      let form;try{const raw=Buffer.concat(chunks).toString();form=(req.headers['content-type']||'').startsWith('application/json')?JSON.parse(raw):Object.fromEntries(new URLSearchParams(raw));}catch{return fail();}
      if(typeof jar.g_csrf_token!=='string' || jar.g_csrf_token.length<16 || jar.g_csrf_token!==form.g_csrf_token)return fail();
      let identity;try{identity=await googleVerifier(form.credential,{clientId:googleClientId,nonce:pending.nonce});}catch{return fail();}
      if(!validIdentity(identity) || identity.provider!=='google')return fail();
      const now=Date.now();
      const backendHeaders={};
      if(typeof req.headers['user-agent']==='string')backendHeaders['user-agent']=req.headers['user-agent'];
      // Use the database mapper unless an explicitly reviewed Gmail snapshot
      // enables the gateway compatibility path for the current backend.
      if(!legacyMap)try {
        const health=await fetcher(backend+'/api/health',{headers:backendHeaders,redirect:'manual',signal:AbortSignal.timeout(20000)});
        const state=health.status===200?await health.json():null;
        if(!state?.googleAuthReady||state.authBackend!=='google-v1')return send(503,'Google kirish xizmati yangilanmoqda. Birozdan keyin qayta urinib ko‘ring.',{'Retry-After':'30'});
      }catch{return send(503,'Google kirish xizmati bilan aloqa o‘rnatilmadi. Qayta urinib ko‘ring.',{'Retry-After':'30'});}
      // Resolve the provider subject to an existing profile before issuing a session.
      const backendIdentity=legacyMap?googleGatewayIdentity(identity,legacyMap):identity;
      const proof=await signToken(secret,{purpose:'request',aud:backend,origin,iat:now,exp:now+45000,method:'GET',path:'/api/profile',body:await hashBody(new Uint8Array()),identity:backendIdentity});
      let profile;try{profile=await fetcher(backend+'/api/profile',{headers:{...backendHeaders,'x-ziyomakon-proof':proof},redirect:'manual',signal:AbortSignal.timeout(20000)});}catch{return fail('Profil xizmatiga ulanib bo‘lmadi. Google orqali qayta urinib ko‘ring.',503);}
      if(profile.status!==200)return fail('Profilni ochib bo‘lmadi. Google orqali qayta urinib ko‘ring.',503);
      const token=await signToken(secret,{purpose:'session',aud:origin,iat:now,exp:now+86400000,identity,returnTo:safeReturnPath(pending.returnTo)});
      return redirect(safeReturnPath(pending.returnTo),{...authHeaders,'Set-Cookie':[cookie(SESSION,token,86400),cookie(GOOGLE_PENDING,'',0),cookie(PENDING,'',0)]});
    }
    if((googleEnabled||emailEnabled) && url.pathname==='/auth/callback')return send(410,'Bu kirish usuli almashtirilgan. Saytdagi kirish sahifasini oching.',{'Referrer-Policy':'no-referrer'});
    if(url.pathname === '/signin-with-chatgpt') {
      const state = randomBytes(32).toString('base64url');
      const returnTo = safeReturnPath(url.searchParams.get('return_to') || '/');
      const next = backend+'/hosting/login?state='+state+'&return_to='+encodeURIComponent(returnTo);
      return redirect(next,{'Set-Cookie':cookie(PENDING,state,300),'X-Robots-Tag':'noindex,nofollow','Referrer-Policy':'no-referrer'});
    }
    if(url.pathname === '/auth/callback') {
      const data = await verifyToken(secret,url.searchParams.get('token'),'login',origin);
      if(!data || !jar[PENDING] || data.state !== jar[PENDING] || !validIdentity(data.identity)) return send(403,'Kirish so‘rovi eskirgan. Saytdan qayta kirishni bosing.',{'X-Robots-Tag':'noindex,nofollow','Referrer-Policy':'no-referrer'});
      const now=Date.now();
      const token=await signToken(secret,{purpose:'session',aud:origin,iat:now,exp:now+24*60*60*1000,identity:data.identity});
      return redirect(safeReturnPath(data.returnTo),{'Set-Cookie':[cookie(SESSION,token,86400),cookie(PENDING,'',0)],'X-Robots-Tag':'noindex,nofollow','Referrer-Policy':'no-referrer'});
    }
    if(url.pathname === '/signout-with-chatgpt' || url.pathname === '/auth/logout') return redirect(safeReturnPath(url.searchParams.get('return_to')||'/'),{'Set-Cookie':[cookie(SESSION,'',0),cookie(PENDING,'',0),cookie(GOOGLE_PENDING,'',0),cookie(EMAIL_PENDING,'',0),cookie('ziyo_email','',0),cookie('ziyo_login_user','',0)]});
    if(url.pathname.startsWith('/hosting/') || url.pathname.startsWith('/auth/')) return send(404,'Topilmadi.');
    const unsafe = !['GET','HEAD','OPTIONS'].includes(req.method);
    if(unsafe && req.headers.origin !== origin) return send(403,'So‘rovni sayt ichidan yuboring.');
    if(req.method === 'OPTIONS') return send(204,'',{Allow:'GET, HEAD, POST, PATCH, DELETE, OPTIONS'});
    let length=0;const chunks=[];
    for await(const chunk of req) {length+=chunk.length;if(length>LIMIT)return send(413,'Fayl juda katta.');chunks.push(chunk);}
    const body=Buffer.concat(chunks);
    const session=await verifyToken(secret,jar[SESSION],'session',origin);
    const sessionIdentity=session&&validIdentity(session.identity)&&(!(googleEnabled||emailEnabled)||googleEnabled&&session.identity.provider==='google'||emailEnabled&&session.identity.provider==='email')?session.identity:null;
    const identity=sessionIdentity&&(googleEnabled||emailEnabled)&&legacyMap?backendIdentityFor(sessionIdentity):sessionIdentity;
    if((googleEnabled||emailEnabled) && !identity && url.pathname==='/' && url.searchParams.get('bolim')==='teacher')return redirect(loginPath+'?return_to='+encodeURIComponent(url.pathname+url.search));
    const forwarded=new Headers();
    for(const [name,value] of Object.entries(req.headers)) if(passHeaders.has(name)&&typeof value==='string')forwarded.set(name,value);
    const kept=safeCookies(req.headers.cookie);if(kept)forwarded.set('cookie',kept);
    if(req.headers.origin===origin)forwarded.set('origin',backend);
    const now=Date.now();
    forwarded.set('x-ziyomakon-proof',await signToken(secret,{purpose:'request',aud:backend,origin,iat:now,exp:now+45000,method:req.method,path:url.pathname+url.search,body:await hashBody(body),identity}));
    const response=await fetcher(backend+url.pathname+url.search,{method:req.method,headers:forwarded,body:unsafe?body:undefined,redirect:'manual',signal:AbortSignal.timeout(90000)});
    const out=new Headers(response.headers);
    for(const name of ['content-length','content-encoding','transfer-encoding','connection','set-cookie','alt-svc'])out.delete(name);
    out.set('Cache-Control','private, no-store');out.set('Vary','Cookie');out.set('Referrer-Policy','strict-origin-when-cross-origin');
    const location=out.get('location');
    if(location){const dest=new URL(location,backend);if(dest.origin===backend)out.set('Location',origin+dest.pathname+dest.search+dest.hash);}
    const responseCookies=response.headers.getSetCookie?.()||[];
    const accepted=responseCookies.filter(v=>passCookies.has(v.split('=')[0])).map(v=>v.replace(/;\s*Domain=[^;]+/ig,'').replace(/;\s*Secure/ig,'')+'; Secure');
    const type=out.get('content-type')||'';
    let text;
    if(/text\/|application\/(?:json|javascript|xml)|image\/svg\+xml/.test(type))text=(await response.text()).replaceAll(backend,origin);
    if((googleEnabled||emailEnabled) && text!==undefined && type.includes('text/html'))text=text.replaceAll('/signin-with-chatgpt',loginPath).replaceAll('/signout-with-chatgpt','/auth/logout').replaceAll('ChatGPT hisobingiz',googleEnabled?'Google hisobingiz':'Gmail manzilingiz').replaceAll('ChatGPT hisobi',googleEnabled?'Google hisobi':'Gmail manzili').replaceAll('ChatGPT hisobing',googleEnabled?'Google hisobing':'Gmail manziling').replaceAll('ChatGPT orqali kirish',googleEnabled?'Google orqali kirish':'Gmail kodi bilan kirish');
    if(text!==undefined && type.includes('text/html'))text=compactNavigationPage(text,url.pathname);
    if((googleEnabled||emailEnabled) && identity && url.pathname==='/profil' && text?.includes('id="profileForm"') && session.returnTo && session.returnTo!=='/profil') {
      const returnTo=safeReturnPath(session.returnTo);
      text=text.replace("location.href='/';",'location.href='+JSON.stringify(returnTo).replaceAll('<','\\u003c')+';');
    }
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
  const server=createGateway({upstream:process.env.UPSTREAM_ORIGIN,publicOrigin,secret:process.env.HOSTING_PROXY_SECRET,googleClientId:process.env.GOOGLE_CLIENT_ID||'',legacyProfiles:process.env.GOOGLE_LEGACY_PROFILES,emailSender:createResendSender({apiKey:process.env.RESEND_API_KEY,from:process.env.EMAIL_FROM})});
  server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('ZIYOMAKON server is ready.'));
  const close=()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),25000).unref();};
  process.on('SIGTERM',close);process.on('SIGINT',close);
}
