import {db,owner} from './service';
import {normalizeEmail} from './admin-validation.mjs';
export type AdminAccess={role:'owner'|'admin'|'none',email:string,userId:string};
export function identity(req:Request){const userId=req.headers.get('oai-authenticated-user-id')||'';let email='';try{email=normalizeEmail(req.headers.get('oai-authenticated-user-email'));}catch{}return {email,userId};}
export async function adminAccess(req:Request):Promise<AdminAccess>{
 const user=identity(req);if(!user.email||!user.userId)return {...user,role:'none'};
 if(owner(req))return {...user,role:'owner'};
 const member=await db().prepare('SELECT email,user_id FROM admin_members WHERE email=? AND active=1').bind(user.email).first<any>();
 if(!member||member.user_id&&member.user_id!==user.userId)return {...user,role:'none'};
 if(!member.user_id){const claimed=await db().prepare('UPDATE admin_members SET user_id=?,last_seen_at=? WHERE email=? AND active=1 AND user_id IS NULL RETURNING user_id').bind(user.userId,new Date().toISOString(),user.email).first<any>();if(!claimed){const retry=await db().prepare('SELECT user_id FROM admin_members WHERE email=? AND active=1').bind(user.email).first<any>();if(retry?.user_id!==user.userId)return {...user,role:'none'};}else if(claimed.user_id!==user.userId)return {...user,role:'none'};}
 return {...user,role:'admin'};
}
export async function isAdmin(req:Request){return (await adminAccess(req)).role!=='none';}
export function auditStatement(req:Request,action:string,targetId:string,label:string,onlyIfChanged=false){const user=identity(req);return db().prepare('INSERT INTO admin_audit (id,actor_id,actor_email,action,target_id,label,created_at) '+(onlyIfChanged?'SELECT ?,?,?,?,?,?,? WHERE changes()>0':'VALUES (?,?,?,?,?,?,?)')).bind(crypto.randomUUID(),user.userId,user.email,action,targetId.slice(0,254),label.slice(0,240),new Date().toISOString());}
