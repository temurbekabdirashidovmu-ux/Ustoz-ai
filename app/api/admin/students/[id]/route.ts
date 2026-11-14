import {adminAccess,identity,auditStatement} from '../../../../../lib/admin-auth';import {db,json,sameOrigin,ownerEmail} from '../../../../../lib/service';import {accountDetails} from '../../../../../lib/account-monitor';
export async function GET(req:Request,ctx:{params:Promise<{id:string}>}){if((await adminAccess(req)).role==='none')return json({error:'Ruxsat yo‘q.'},403);const {id}=await ctx.params;const detail=await accountDetails(id);return detail?json(detail):json({error:'Hisob topilmadi.'},404);}
export async function PATCH(req:Request,ctx:{params:Promise<{id:string}>}){
 if(!sameOrigin(req)||(await adminAccess(req)).role==='none')return json({error:'Ruxsat yo‘q.'},403);
 let b;try{const raw=await req.text();if(raw.length>2000)throw 0;b=JSON.parse(raw);if(typeof b.blocked!=='boolean'||typeof b.reason!=='string'||b.reason.length>300)throw 0;}catch{return json({error:'Holat va 300 belgigacha sabab kiriting.'},400);}
 const {id}=await ctx.params,target=await accountDetails(id);if(!target)return json({error:'Hisob topilmadi.'},404);
 const a=target.account;if(a.email===ownerEmail()||id===identity(req).userId)return json({error:'O‘zingizni yoki sayt egasini bloklab bo‘lmaydi.'},403);
 if(await db().prepare('SELECT email FROM admin_members WHERE email=? AND active=1').bind(a.email).first())return json({error:'Avval bu hisobning admin ruxsatini bekor qiling.'},409);
 const now=new Date().toISOString();await db().batch([db().prepare('INSERT INTO account_activity (user_id,email,first_seen_at,last_seen_at,blocked,block_reason,blocked_by,blocked_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET blocked=excluded.blocked,block_reason=excluded.block_reason,blocked_by=excluded.blocked_by,blocked_at=excluded.blocked_at').bind(id,a.email,a.first_seen_at,a.last_seen_at,Number(b.blocked),b.reason.trim(),identity(req).userId,now),auditStatement(req,b.blocked?'account.block':'account.unblock',id,b.reason.trim())]);return json({ok:true,blocked:b.blocked});
}
