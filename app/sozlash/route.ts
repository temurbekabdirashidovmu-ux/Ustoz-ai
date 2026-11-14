import {owner} from '../../lib/service';
export function GET(req:Request){const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex,nofollow'};if(!owner(req))return new Response('Sahifa mavjud emas.',{status:404,headers});return new Response(null,{status:303,headers:{...headers,Location:'/admin/jamoa'}});}
