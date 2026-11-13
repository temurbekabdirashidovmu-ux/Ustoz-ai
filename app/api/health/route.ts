import {configured,json,MODEL,db} from '../../../lib/service';
export async function GET(){
  let aiConfigured=false,googleAuthReady=false;
  try{aiConfigured=await configured();}catch{}
  try{await db().prepare('SELECT 1 FROM google_accounts LIMIT 1').first();googleAuthReady=true;}catch{}
  return json({aiConfigured,model:MODEL,googleAuthReady,authBackend:'google-v1'});
}
