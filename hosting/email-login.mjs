import {randomBytes,randomInt,createHmac,timingSafeEqual} from 'node:crypto';
import {safeReturnPath} from '../lib/hosting-proof.mjs';

export class EmailLoginError extends Error {
  constructor(message,status=400){super(message);this.status=status;}
}
export function normalizeGmail(value) {
  const email=typeof value==='string'?value.trim().toLowerCase():'';
  if(email.length>254||!new RegExp("^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\\.com$").test(email))throw new EmailLoginError('To‘g‘ri Gmail manzilini kiriting.');
  return email;
}
export function createEmailLogin({secret,send,now=Date.now}) {
  const challenges=new Map(),rates=new Map();let globalWindow=0,globalCount=0;
  const hash=(id,code)=>createHmac('sha256',secret).update(id+'\0'+code).digest();
  function inspect(id) {
    const record=challenges.get(id);
    if(!record||record.expires<=now()){challenges.delete(id);return null;}
    return {email:record.email,returnTo:record.returnTo};
  }
  return {
    inspect,
    async begin(value,returnTo) {
      const email=normalizeGmail(value),time=now();
      for(const [id,record]of challenges)if(record.expires<=time)challenges.delete(id);
      for(const [key,rate]of rates)if(rate.reset<=time)rates.delete(key);
      if(time>=globalWindow){globalWindow=time+3600000;globalCount=0;}
      const rate=rates.get(email)||{count:0,last:-Infinity,reset:time+900000};
      if(time-rate.last<60000||rate.count>=3||globalCount>=50)throw new EmailLoginError('Ko‘p urinish bo‘ldi. Biroz kutib, qayta urinib ko‘ring.',429);
      rate.count++;rate.last=time;rates.set(email,rate);globalCount++;
      const id=randomBytes(32).toString('base64url'),code=String(randomInt(100000,1000000));
      const record={email,returnTo:safeReturnPath(returnTo||'/profil'),expires:time+300000,attempts:0,digest:hash(id,code)};
      try {await send({email,code});}catch{throw new EmailLoginError('Xat yuborilmadi. Birozdan keyin qayta urinib ko‘ring.',503);}
      for(const [otherId,other]of challenges)if(other.email===email)challenges.delete(otherId);
      challenges.set(id,record);
      return {id,email};
    },
    verify(id,code) {
      const record=challenges.get(id);
      if(!inspect(id))throw new EmailLoginError('Kodning vaqti tugagan. Yangi kod so‘rang.',403);
      record.attempts++;
      if(record.attempts>5){challenges.delete(id);throw new EmailLoginError('Urinishlar tugadi. Yangi kod so‘rang.',403);}
      const candidate=hash(id,typeof code==='string'?code:'');
      if(!/^[0-9]{6}$/.test(code||'')||!timingSafeEqual(record.digest,candidate)){
        if(record.attempts===5)challenges.delete(id);
        throw new EmailLoginError('Kod mos kelmadi. Tekshirib, qayta kiriting.',403);
      }
      challenges.delete(id);
      return {identity:{provider:'email',subject:record.email,userId:'email:'+record.email,email:record.email},returnTo:record.returnTo};
    }
  };
}
export function createResendSender({apiKey,from,fetcher=fetch}) {
  if(!apiKey&&!from)return null;
  if(typeof apiKey!=='string'||!apiKey||typeof from!=='string'||!from||/[\r\n]/.test(from)||from.length>320)throw Error('Email sender configuration is incomplete');
  return async({email,code})=>{
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'ZIYOMAKON — kirish kodi',text:'ZIYOMAKON kirish kodingiz: '+code+'\n\nKod 5 daqiqa amal qiladi va bir marta ishlatiladi. Bu Google parolingiz emas.'}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Email delivery was not accepted');
    const result=await response.json();if(typeof result.id!=='string'||!result.id)throw Error('Email delivery was not accepted');
  };
}
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function emailLoginPage({email='',returnTo='/profil',error='',configured=true,googleEnabled=true}) {
  const codeStep=Boolean(email),back='/auth/email?return_to='+encodeURIComponent(safeReturnPath(returnTo));
  return '<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Gmail kodi bilan kirish — ZIYOMAKON</title><style>*{box-sizing:border-box}body{margin:0;background:#f2f6f3;color:#183c35;font:16px/1.6 system-ui,sans-serif}header{background:#083c38;padding:22px}header a{color:#e8fff5;font-weight:800}main{max-width:600px;margin:6vh auto;padding:24px}.panel{padding:30px;background:white;border:1px solid #dae6df;border-radius:18px}a{color:#0c765a}input,button{font:inherit;border-radius:10px;padding:12px;width:100%;margin:8px 0 18px}input{border:1px solid #c6d9cc}button{border:0;background:#0c765a;color:white;font-weight:700;cursor:pointer}label{display:block}small{color:#57776b}.error{color:#912c27}</style></head><body><header><a href="/">◈ ZIYOMAKON</a></header><main><section class="panel"><h1>'+ (codeStep?'6 xonali kodni kiriting':'Gmail’ga kod olib kiring')+'</h1>'+
    (error?'<p class="error" role="alert">'+escape(error)+'</p>':'')+
    (!configured?'<p>Gmail’ga kod yuborish xizmati hali ulanmagan.</p>':codeStep?'<p>Kod yuborish xizmati xatni qabul qildi: <strong>'+escape(email)+'</strong>. Gmail’dagi kiruvchi xatlar va Spam bo‘limini tekshiring.</p><form method="post" action="/auth/email/verify"><label for="code">Kirish kodi</label><input id="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required autofocus><button>Kodni tasdiqlash</button></form><p><a href="'+escape(back)+'">Gmail’ni o‘zgartirish yoki yangi kod so‘rash</a></p>':'<p>Gmail manzilingizga 5 daqiqalik bir martalik kod yuboriladi. Google parolingiz so‘ralmaydi.</p><form method="post" action="/auth/email/send"><input type="hidden" name="return_to" value="'+escape(safeReturnPath(returnTo))+'"><label for="email">Gmail manzilingiz</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="siz@gmail.com" required><button>Kod yuborish</button></form>')+
    (googleEnabled?'<p><a href="/auth/google/start?return_to='+encodeURIComponent(safeReturnPath(returnTo))+'">Google orqali kirish</a></p>':'')+'<p><a href="/kutubxona">Hisobsiz kutubxonani ochish</a></p><small>Bu kod faqat ZIYOMAKON’ga kirish uchun. Kodlar vaqtincha saqlanadi; server qayta ishga tushsa, yangi kod so‘raladi.</small></section></main></body></html>';
}
