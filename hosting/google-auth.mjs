import {createRemoteJWKSet, jwtVerify} from 'jose';
import {validIdentity} from '../lib/hosting-proof.mjs';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export function validGoogleClientId(value) {
  return typeof value === 'string' && /^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(value) && value.length < 256;
}
export async function verifyGoogleCredential(credential, {clientId, nonce, keys = googleKeys}) {
  if(!validGoogleClientId(clientId) || typeof credential !== 'string' || credential.length > 12000 || typeof nonce !== 'string' || nonce.length < 32) throw new Error('Invalid Google login');
  const {payload} = await jwtVerify(credential,keys,{
    algorithms:['RS256'],audience:clientId,issuer:['https://accounts.google.com','accounts.google.com'],
    requiredClaims:['sub','email','email_verified','nonce','iat','exp'],clockTolerance:5,maxTokenAge:'2h'
  });
  if(payload.nonce !== nonce || payload.email_verified !== true || typeof payload.sub !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(payload.sub) || typeof payload.email !== 'string') throw new Error('Invalid Google identity');
  if(payload.azp && payload.azp !== clientId) throw new Error('Invalid Google presenter');
  const email=payload.email.trim().toLowerCase();
  const identity={provider:'google',subject:payload.sub,userId:'google:'+payload.sub,email,authoritative:email.endsWith('@gmail.com') || (typeof payload.hd==='string' && payload.hd.length>0)};
  if(!validIdentity(identity))throw new Error('Invalid Google identity');
  return identity;
}
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function googleLoginPage({clientId, nonce, origin, error=''}) {
  return '<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Google orqali kirish — ZIYOMAKON</title><style>*{box-sizing:border-box}body{margin:0;background:#f2f6f3;color:#183c35;font:16px/1.65 system-ui,sans-serif}header{background:#083c38;padding:24px max(24px,calc((100vw - 1100px)/2))}header a{color:#e8fff5;font-weight:850;letter-spacing:.08em;text-decoration:none}main{max-width:620px;margin:8vh auto;padding:32px}.panel{background:white;padding:36px;border:1px solid #dae6df;border-radius:20px}h1{font-size:clamp(28px,5vw,38px);line-height:1.2}p{color:#57776b}.eyebrow{color:#13855f;font-size:12px;letter-spacing:.15em;font-weight:750}.google{min-height:48px;margin:28px 0}a{color:#0c765a}.error{color:#912c27;background:#fff2ef;padding:12px;border-radius:8px}</style>'+
    (clientId?'<script src="https://accounts.google.com/gsi/client" async defer></script>':'')+
    '</head><body><header><a href="/">◈ ZIYOMAKON</a></header><main><section class="panel"><div class="eyebrow">ZIYOMAKON HISOBI</div><h1>Google hisobingiz bilan kiring.</h1><p>Google hisobingizni tanlang. Tasdiqlashdan keyin mavjud profilingiz ochiladi yoki username tanlaysiz.</p>'+
    (error?'<p class="error" role="alert">'+escape(error)+'</p>':'')+
    (clientId?'<div id="g_id_onload" data-client_id="'+escape(clientId)+'" data-login_uri="'+escape(origin)+'/auth/google/callback" data-nonce="'+escape(nonce)+'" data-ux_mode="redirect" data-auto_prompt="false" data-context="signin"></div><div class="g_id_signin google" data-type="standard" data-theme="outline" data-size="large" data-text="continue_with" data-shape="rectangular" data-width="320"></div><noscript>Google orqali kirish uchun brauzerda JavaScript’ni yoqing.</noscript>':error?'<p><a href="/auth/google/start">Google orqali qayta kirish →</a></p>':'<p class="error" role="status">Google orqali kirish sozlanmoqda. Iltimos, keyinroq qayta urinib ko‘ring.</p>')+
    '<p>Parolingiz Google sahifasida kiritiladi. Sayt Google parolingizni olmaydi. Faqat tasdiqlangan hisob identifikatori va emailingiz ishlatiladi.</p><p><a href="/kutubxona">Hisobsiz kutubxonani ochish →</a></p><p><a href="/privacy">Maxfiylik haqida</a></p></section></main></body></html>';
}
export function googlePrivacyPage() {
  return '<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maxfiylik — ZIYOMAKON</title><body style="max-width:760px;margin:40px auto;padding:24px;font:17px/1.7 system-ui;color:#183c35"><a href="/">ZIYOMAKON</a><h1>Google orqali kirish va maxfiylik</h1><p>Sayt Google hisobining tasdiqlangan identifikatori va emailidan hisobni aniqlash uchun foydalanadi. Google paroli, Gmail xatlari, kontaktlar yoki Google Drive fayllariga kirish so‘ralmaydi.</p><p>Username, mashq natijalari va faoliyat vaqtlari mavjud doimiy bazada saqlanadi. Username va reyting ommaviy; emailingiz o‘zingiz va sayt egasining himoyalangan hisobotida ko‘rinadi.</p><p>Oldingi Gmail profilingiz shu tasdiqlangan emailga tegishli bo‘lsa, mavjud username va natijalar saqlanadi. Avvalgi Gmail manzilingizni o‘zgartirsangiz, eski profilni tiklash uchun sayt egasiga murojaat qiling. Boshqa email xizmatiga tegishli mavjud hisobni avtomatik bog‘lash rad etilishi mumkin.</p><p>Kirish sessiyasi HttpOnly, Secure cookie orqali saqlanadi va 24 soatdan keyin tugaydi. Hisobdan chiqish sessiya cookie’sini o‘chiradi. Hisob ma’lumotlari haqida sayt egasiga murojaat qilish mumkin.</p></body></html>';
}
