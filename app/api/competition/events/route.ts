import {db,json,sameOrigin} from '../../../../lib/service';import {student} from '../../../../lib/students';import {activityLabels} from '../../../../lib/account-monitor';
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Ruxsat yo‘q.'},403);const p=await student(req);if(!p)return json({error:'Avval hisobga kiring.'},401);
 let b;try{const raw=await req.text();if(raw.length>4000)throw 0;b=JSON.parse(raw);if(typeof b.runId!=='string'||!Array.isArray(b.events)||!b.events.length||b.events.length>20||b.events.some((t:unknown)=>typeof t!=='string'||!Object.hasOwn(activityLabels,t)))throw 0;}catch{return json({error:'Hodisa xato.'},400);}
 const now=new Date().toISOString(),run=await db().prepare('SELECT id FROM quiz_runs WHERE id=? AND user_id=? AND finished_at IS NULL AND expires_at>?').bind(b.runId,p.user_id,now).first();if(!run)return json({error:'Faol bellashuv topilmadi.'},404);
 const count=await db().prepare('SELECT COUNT(*) AS n FROM integrity_events WHERE run_id=?').bind(b.runId).first<any>();if((count?.n||0)+b.events.length>250)return json({error:'Hodisa limiti.'},429);
 await db().batch(b.events.map((type:string)=>db().prepare('INSERT INTO integrity_events (id,user_id,run_id,event_type,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM integrity_events WHERE run_id=?)<250').bind(crypto.randomUUID(),p.user_id,b.runId,type,now,b.runId)));return json({ok:true});
}
