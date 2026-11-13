import assert from 'node:assert/strict';
import {once} from 'node:events';
import {legacyGoogleProfiles,googleGatewayIdentity} from './legacy-google-profiles.mjs';
import {createGateway} from './server.mjs';
import {verifyToken} from '../lib/hosting-proof.mjs';

const records=[{email:'reader@gmail.com',userId:'legacy-reader'}];
const profiles=legacyGoogleProfiles(records);
const identity={provider:'google',subject:'test-subject',userId:'google:test-subject',email:'reader@gmail.com',authoritative:true};
assert.equal(googleGatewayIdentity(identity,profiles).userId,'legacy-reader');
assert.equal(googleGatewayIdentity({...identity,email:'new@gmail.com'},profiles).userId,identity.userId);
assert.throws(()=>legacyGoogleProfiles([...records,...records]));
assert.throws(()=>legacyGoogleProfiles([{...records[0],email:'reader@example.invalid'}]));
assert.throws(()=>googleGatewayIdentity({...identity,authoritative:false},profiles));
assert.throws(()=>googleGatewayIdentity({...identity,userId:'legacy-reader'},profiles));
const secret='test-only-'.repeat(8),origin='http://127.0.0.1:19489';let forwarded=[];
const server=createGateway({upstream:'https://backend.invalid',publicOrigin:origin,secret,googleClientId:'123-test.apps.googleusercontent.com',legacyProfiles:records,googleVerifier:async()=>identity,fetcher:async(url,options)=>{
  assert(!url.endsWith('/api/health'));
  const value=options.headers instanceof Headers?options.headers.get('x-ziyomakon-proof'):options.headers['x-ziyomakon-proof'];
  const proof=await verifyToken(secret,value,'request','https://backend.invalid');
  assert.equal(proof.identity.userId,'legacy-reader');assert.equal(proof.identity.subject,identity.subject);assert.equal(proof.identity.provider,'google-gateway');
  forwarded.push(proof);return Response.json({profile:{username:'reader_01'}});
}});
server.listen(19489,'127.0.0.1');await once(server,'listening');
try {
  let r=await fetch(origin+'/kirish');const pending=r.headers.getSetCookie().find(c=>c.startsWith('__Host-ziyo_google_pending=')).split(';')[0];
  const csrf='test-csrf-token-with-32-characters';
  r=await fetch(origin+'/auth/google/callback',{method:'POST',body:new URLSearchParams({credential:'test-only',g_csrf_token:csrf}),headers:{Cookie:pending+'; g_csrf_token='+csrf},redirect:'manual'});
  assert.equal(r.status,303);const session=r.headers.getSetCookie().find(c=>c.startsWith('__Host-ziyo_render=')).split(';')[0];
  r=await fetch(origin+'/api/profile',{headers:{Cookie:session,'oai-authenticated-user-id':'attacker'}});assert.equal(r.status,200);assert.equal((await r.json()).profile.username,'reader_01');assert.equal(forwarded.length,2);
  // A legacy ChatGPT session cannot enter the Google-only gateway.
  r=await fetch(origin+'/auth/callback?token=old',{redirect:'manual'});assert.equal(r.status,410);
  console.log('Google gateway compatibility preserves reviewed Gmail profile IDs and rejects ambiguous or unverified links.');
} finally {server.close();server.closeAllConnections();}
