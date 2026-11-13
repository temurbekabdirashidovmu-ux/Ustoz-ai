// Called only after the Worker has verified the gateway's signed request.
export async function resolveGoogleUserId(database, identity) {
  if(identity.provider !== 'google' || typeof identity.subject !== 'string' || identity.userId !== 'google:'+identity.subject || !/^[A-Za-z0-9_-]{1,255}$/.test(identity.subject)) throw new Error('Invalid provider identity');
  const account = await database.prepare('SELECT user_id FROM google_accounts WHERE subject=?').bind(identity.subject).first();
  if(account)return account.user_id;
  const email=identity.email.trim().toLowerCase();
  const profiles=await database.prepare('SELECT user_id FROM student_profiles WHERE lower(email)=? LIMIT 3').bind(email).all();
  const grants=await database.prepare('SELECT user_id FROM admin_members WHERE lower(email)=? AND user_id IS NOT NULL LIMIT 3').bind(email).all();
  const candidates=[...new Set([...profiles.results,...grants.results].map(row=>row.user_id))];
  if(candidates.length>1)throw new Error('Ambiguous existing account');
  if(candidates.length && identity.authoritative!==true)throw new Error('Existing account requires ownership confirmation');
  const userId=candidates[0]||identity.userId;
  try {
    await database.prepare('INSERT INTO google_accounts (subject,user_id,email,created_at) VALUES (?,?,?,?) ON CONFLICT(subject) DO NOTHING').bind(identity.subject,userId,email,new Date().toISOString()).run();
  } catch { throw new Error('Existing account is already linked'); }
  const linked=await database.prepare('SELECT user_id FROM google_accounts WHERE subject=?').bind(identity.subject).first();
  if(!linked || linked.user_id!==userId)throw new Error('Account link changed');
  return linked.user_id;
}
