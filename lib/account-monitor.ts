import {db,owner} from './service';
import {identity} from './admin-auth';
export const activityLabels:Record<string,string>={tab_hidden:'Sahifa boshqa oynaga almashtirilgan',focus_lost:'Sahifa fokusdan chiqqan',paste:'Matn joylashtirish (paste)',copy:'Matn nusxalash (copy)'};
export async function guardAccount(req:Request){
 const u=identity(req);if(!u.userId||!u.email)return null;
 const row=await db().prepare('SELECT blocked FROM account_activity WHERE user_id=?').bind(u.userId).first<any>();
 if(row?.blocked&&!owner(req))return new Response(req.url.includes('/api/')?JSON.stringify({error:'Hisobingiz bloklangan. Sayt egasiga murojaat qiling.'}):'<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Hisob bloklangan — ZIYOMAKON</title><main style="max-width:650px;margin:10vh auto;padding:24px;font:18px system-ui"><h1>Hisobingiz bloklangan</h1><p>Sayt egasiga murojaat qiling.</p><a href="/auth/logout">Hisobdan chiqish</a></main></html>',{status:403,headers:{'Content-Type':req.url.includes('/api/')?'application/json; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'}});
 const path=new URL(req.url).pathname;
 if(req.method==='GET'&&(!path.includes('.')||path==='/api/profile')){
  const now=new Date().toISOString(),before=new Date(Date.now()-60000).toISOString();
  await db().prepare('INSERT INTO account_activity (user_id,email,first_seen_at,last_seen_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,last_seen_at=excluded.last_seen_at WHERE account_activity.last_seen_at<?').bind(u.userId,u.email,now,now,before).run();
 }
 return null;
}
const accounts=`WITH accounts AS (SELECT user_id,email,created_at AS first_seen_at,last_seen_at FROM student_profiles UNION ALL SELECT a.user_id,a.email,a.first_seen_at,a.last_seen_at FROM account_activity a WHERE NOT EXISTS (SELECT 1 FROM student_profiles p WHERE p.user_id=a.user_id))`;
const fields=`u.user_id,u.email,p.username,COALESCE(a.first_seen_at,u.first_seen_at) AS first_seen_at,MAX(u.last_seen_at,COALESCE(a.last_seen_at,u.last_seen_at)) AS last_seen_at,COALESCE(a.blocked,0) AS blocked,a.block_reason,COALESCE(s.best_score,0) AS best_score,COALESCE(s.attempts,0) AS attempts`;
const joins=`FROM accounts u LEFT JOIN student_profiles p ON p.user_id=u.user_id LEFT JOIN account_activity a ON a.user_id=u.user_id LEFT JOIN student_scores s ON s.user_id=u.user_id`;
export async function accountList(q:string,page:number){const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';const where=`WHERE u.email LIKE ? ESCAPE '\\' OR p.username LIKE ? ESCAPE '\\'`;const result=await db().prepare(`${accounts} SELECT ${fields} ${joins} ${where} ORDER BY last_seen_at DESC,u.user_id LIMIT 30 OFFSET ?`).bind(pattern,pattern,(page-1)*30).all();return result.results as any[];}
export async function accountDetails(id:string){const account=await db().prepare(`${accounts} SELECT ${fields} ${joins} WHERE u.user_id=?`).bind(id).first<any>();if(!account)return null;const [runs,events,localSummary,localRuns]=await Promise.all([db().prepare('SELECT id,questions,answers,submitted_answers,started_at,expires_at,finished_at,score FROM quiz_runs WHERE user_id=? ORDER BY started_at DESC LIMIT 30').bind(id).all(),db().prepare('SELECT run_id,event_type,created_at FROM integrity_events WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(id).all(),db().prepare('SELECT * FROM local_progress WHERE user_id=?').bind(id).first(),db().prepare('SELECT id,title,correct,total,coins,received_at FROM local_game_results WHERE user_id=? ORDER BY received_at DESC LIMIT 30').bind(id).all()]);return {account,runs:runs.results as any[],events:events.results as any[],localSummary,localRuns:localRuns.results as any[]};}
