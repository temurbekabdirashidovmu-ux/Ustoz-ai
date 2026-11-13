import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createEmailLogin,createResendSender} from './email-login.mjs';
import {createGateway} from './server.mjs';
import {verifyToken} from '../lib/hosting-proof.mjs';

const secret='test-only-'.repeat(8);let time=1000000,messages=[];
const login=createEmailLogin({secret,now:()=>time,send:async message=>messages.push(message)});
await assert.rejects(login.begin('reader@example.invalid'),/Gmail/);
const first=await login.begin(' Reader@gmail.com ','//attacker.invalid');
assert(!('code'in first));assert.equal(first.email,'reader@gmail.com');
await assert.rejects(login.begin(first.email),error=>error.status===429);
assert.throws(()=>login.verify(first.id,'000000'));
const verified=login.verify(first.id,messages[0].code);assert.equal(verified.returnTo,'/');assert.equal(verified.identity.userId,'email:reader@gmail.com');
assert.throws(()=>login.verify(first.id,messages[0].code));
time+=61000;const second=await login.begin(first.email,'/profil');
for(let i=0;i<5;i++)assert.throws(()=>login.verify(second.id,'000000'));
assert.throws(()=>login.verify(second.id,messages[1].code));
time+=61000;const third=await login.begin(first.email);time+=300001;assert.throws(()=>login.verify(third.id,messages[2].code));
const unavailable=createEmailLogin({secret,send:async()=>{throw Error('provider details must stay private');}});
await assert.rejects(unavailable.begin('reader@gmail.com'),error=>error.status===503&&!error.message.includes('provider'));
assert.equal(createResendSender({}),null);
await assert.rejects(createResendSender({apiKey:'test-only',from:'test@example.invalid',fetcher:async()=>new Response('{}',{status:403})})({email:'reader@gmail.com',code:'123456'}));
await createResendSender({apiKey:'test-only',from:'test@example.invalid',fetcher:async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');assert.equal(JSON.parse(options.body).to[0],'reader@gmail.com');return Response.json({id:'test-message'});}})({email:'reader@gmail.com',code:'123456'});

const origin='http://127.0.0.1:19490';let delivered,forwarded;
const server=createGateway({upstream:'https://backend.invalid',publicOrigin:origin,secret,legacyProfiles:[{email:'reader@gmail.com',userId:'legacy-test-reader'}],emailSender:async message=>{delivered=message;},fetcher:async(url,options)=>{const proof=options.headers instanceof Headers?options.headers.get('x-ziyomakon-proof'):options.headers['x-ziyomakon-proof'];forwarded=await verifyToken(secret,proof,'request','https://backend.invalid');return Response.json({profile:{username:'reader_01'}});}});
server.listen(19490,'127.0.0.1');await once(server,'listening');
try {
 let r=await fetch(origin+'/kirish',{redirect:'manual'});assert.equal(r.status,303);assert(r.headers.get('location').startsWith('/auth/email'));
 r=await fetch(origin+'/auth/email');assert.equal(r.status,200);assert.equal(r.headers.get('referrer-policy'),'strict-origin-when-cross-origin');assert(!(await r.text()).includes('password'));
 const body=new URLSearchParams({email:'reader@gmail.com',return_to:'/profil'});
 r=await fetch(origin+'/auth/email/send',{method:'POST',body,headers:{Origin:'https://attacker.invalid'}});assert.equal(r.status,403);assert.equal(delivered,undefined);
 r=await fetch(origin+'/auth/email/send',{method:'POST',body,headers:{Origin:origin}});assert.equal(r.status,200);const html=await r.text();assert(!html.includes(delivered.code));const pending=r.headers.getSetCookie().find(c=>c.startsWith('__Host-ziyo_email_pending=')).split(';')[0];
 r=await fetch(origin+'/auth/email/verify',{method:'POST',body:new URLSearchParams({code:delivered.code}),headers:{Origin:origin},redirect:'manual'});assert.equal(r.status,403);
 r=await fetch(origin+'/auth/email/verify',{method:'POST',body:new URLSearchParams({code:delivered.code}),headers:{Origin:origin,Cookie:pending},redirect:'manual'});assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/profil');assert.equal(forwarded.identity.userId,'legacy-test-reader');assert.equal(forwarded.identity.provider,'email-gateway');
 const session=r.headers.getSetCookie().find(c=>c.startsWith('__Host-ziyo_render=')).split(';')[0];
 r=await fetch(origin+'/api/profile',{headers:{Cookie:session}});assert.equal(r.status,200);assert.equal(forwarded.identity.userId,'legacy-test-reader');
 r=await fetch(origin+'/auth/email/verify',{method:'POST',body:new URLSearchParams({code:delivered.code}),headers:{Origin:origin,Cookie:pending},redirect:'manual'});assert.equal(r.status,403);
 console.log('Email OTP tests passed: expiry, one use, attempt/send limits, provider acceptance checks, CSRF, browser binding and legacy profile preservation. No email was sent.');
}finally{server.close();server.closeAllConnections();}
