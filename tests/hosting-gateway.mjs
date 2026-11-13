import assert from 'node:assert/strict';
import {once} from 'node:events';
import {signToken,verifyToken,hashBody,validIdentity,safeReturnPath} from '../lib/hosting-proof.mjs';
import {createGateway,safeCookies,cookie} from '../hosting/server.mjs';

const secret='test-only-'.repeat(8), now=Date.now(), identity={userId:'example.invalid-user',email:'reader@example.invalid'};
const payload={purpose:'session',aud:'https://example.invalid',iat:now,exp:now+10000,identity};
const signed=await signToken(secret,payload);
assert.deepEqual(await verifyToken(secret,signed,'session',payload.aud),payload);
assert.equal(await verifyToken(secret,signed,'login',payload.aud),null);
assert.equal(await verifyToken(secret,signed,'session','https://attacker.invalid'),null);
assert.equal(await verifyToken(secret,signed.slice(0,-2)+'AA','session',payload.aud),null);
assert.equal(await verifyToken(secret,signed,'session',payload.aud,now+10001),null);
assert.equal(await verifyToken('other-secret-'.repeat(5),signed,'session',payload.aud),null);
assert.equal(safeReturnPath('//attacker.invalid'),'/');assert.equal(safeReturnPath('/\\attacker.invalid'),'/');assert.equal(safeReturnPath('/signin-with-chatgpt'),'/');assert.equal(safeReturnPath('/profil?a=1'),'/profil?a=1');
assert.equal(validIdentity({userId:'bad\r\nheader',email:identity.email}),false);
assert.equal(safeCookies('__Host-ziyo_render=secret; upstream_auth=secret; ziyo_email=example; ziyo_login_user=reader'),'ziyo_email=example; ziyo_login_user=reader');
let forwarded;
let origin;
const server=createGateway({upstream:'https://backend.invalid',publicOrigin:'http://127.0.0.1:19487',secret,fetcher:async(url,options)=>{forwarded={url,options};return new Response('<a href="https://backend.invalid/kutubxona">Library</a>',{headers:{'Content-Type':'text/html','Set-Cookie':'upstream_auth=do-not-relay; Path=/'}});}});
server.listen(19487,'127.0.0.1');await once(server,'listening');origin='http://127.0.0.1:19487';
try{
 let response=await fetch(origin+'/',{headers:{'oai-authenticated-user-id':'attacker','x-ziyomakon-proof':'attacker',Cookie:'upstream_auth=stolen'}});
 assert.equal(response.status,200);assert((await response.text()).includes(origin+'/kutubxona'));assert.equal(response.headers.get('set-cookie'),null);
 assert.equal(forwarded.options.headers.get('oai-authenticated-user-id'),null);assert.equal(forwarded.options.headers.get('cookie'),null);
 let proof=await verifyToken(secret,forwarded.options.headers.get('x-ziyomakon-proof'),'request','https://backend.invalid');assert.equal(proof.identity,null);assert.equal(proof.body,await hashBody(new Uint8Array()));
 response=await fetch(origin+'/api/profile',{method:'POST',headers:{Origin:'https://attacker.invalid'},body:'{}'});assert.equal(response.status,403);
 const session=await signToken(secret,{purpose:'session',aud:origin,iat:now,exp:now+10000,identity});
 response=await fetch(origin+'/api/profile',{method:'POST',headers:{Origin:origin,Cookie:'__Host-ziyo_render='+session,'Content-Type':'application/json'},body:'{"username":"reader"}'});
 assert.equal(response.status,200);proof=await verifyToken(secret,forwarded.options.headers.get('x-ziyomakon-proof'),'request','https://backend.invalid');assert.deepEqual(proof.identity,identity);assert.equal(proof.body,await hashBody(new TextEncoder().encode('{"username":"reader"}')));assert.equal(forwarded.options.headers.get('origin'),'https://backend.invalid');
 response=await fetch(origin+'/signin-with-chatgpt?return_to=%2Fprofil',{redirect:'manual'});assert.equal(response.status,303);const location=new URL(response.headers.get('location'));const state=location.searchParams.get('state');assert.equal(state.length,43);assert(response.headers.get('set-cookie').includes('HttpOnly'));
 const login=await signToken(secret,{purpose:'login',aud:origin,iat:now,exp:now+60000,state,returnTo:'/profil',identity});
 response=await fetch(origin+'/auth/callback?token='+login,{headers:{Cookie:'__Host-ziyo_pending=other'},redirect:'manual'});assert.equal(response.status,403);
 response=await fetch(origin+'/auth/callback?token='+login,{headers:{Cookie:'__Host-ziyo_pending='+state},redirect:'manual'});assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/profil');assert(response.headers.get('set-cookie').includes('__Host-ziyo_render='));
 response=await fetch(origin+'/auth/callback?token='+login,{redirect:'manual'});assert.equal(response.status,403);
 console.log('Hosting security, CSRF, identity, cookie and login tests passed.');
}finally{server.close();server.closeAllConnections();}
