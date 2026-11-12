import {db,json,owner,sameOrigin} from '../../../lib/service';
import {validateAttempt} from '../../../lib/pilot.mjs';
export async function GET(req:Request){const r=await db().prepare('SELECT COUNT(*) AS sessions, AVG(pre_score) AS pre, AVG(post_score) AS post, AVG(rating) AS rating FROM pilot_attempts').first<any>();const sessions=Number(r?.sessions||0);return json({sessions,pre:sessions>=5||owner(req)?r?.pre:null,post:sessions>=5||owner(req)?r?.post:null,rating:sessions>=5||owner(req)?r?.rating:null,notice:'Seanslar soni noyob foydalanuvchilar soni emas. Oldin/keyin farqi nazoratli ilmiy samaradorlik isboti emas.'});}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'So‘rovni sayt ichidan yuboring.'},403);
 if(!req.headers.get('content-type')?.includes('application/json'))return json({error:'JSON kerak.'},415);
 if(Number(req.headers.get('content-length'))>4000)return json({error:'So‘rov juda katta.'},413);const raw=await req.text();if(raw.length>4000)return json({error:'So‘rov juda katta.'},413);
 let data;try{data=validateAttempt(JSON.parse(raw));}catch(e){return json({error:e instanceof Error?e.message:'Javoblarni tekshiring.'},400);}
 const exists=await db().prepare('SELECT id FROM pilot_attempts WHERE id=?').bind(data.id).first();if(exists)return json({ok:true,duplicate:true});
 const day='pilot:'+new Date().toISOString().slice(0,10);const quota=await db().prepare('INSERT INTO daily_usage (day,count) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET count=count+1 WHERE count<200 RETURNING count').bind(day).first();if(!quota)return json({error:'Bugungi sinov qabul qilish limiti tugadi. Natijangiz ekranda saqlanadi.'},429);
 await db().prepare('INSERT OR IGNORE INTO pilot_attempts (id,pre_score,post_score,rating,created_at) VALUES (?,?,?,?,?)').bind(data.id,data.pre,data.post,data.rating,new Date().toISOString()).run();return json({ok:true,pre:data.pre,post:data.post});
}
