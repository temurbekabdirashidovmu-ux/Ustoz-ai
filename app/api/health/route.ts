import {configured,json,MODEL} from '../../../lib/service';
export async function GET(){try{return json({aiConfigured:await configured(),model:MODEL});}catch{return json({aiConfigured:false,model:MODEL});}}
