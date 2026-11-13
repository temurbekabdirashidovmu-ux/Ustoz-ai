import { verifyToken, hashBody, validIdentity } from './hosting-proof.mjs';

type HostingEnvironment = {HOSTING_PROXY_SECRET?: string; HOSTING_PUBLIC_ORIGIN?: string};
export async function authenticateHostingRequest(request: Request, env: HostingEnvironment): Promise<Request | Response> {
  const proof = request.headers.get('x-ziyomakon-proof');
  if (!proof) return request;
  const forbidden = () => new Response('So‘rov tasdiqlanmadi.', {status:403, headers:{'Cache-Control':'no-store'}});
  const url = new URL(request.url);
  const data = await verifyToken(env.HOSTING_PROXY_SECRET, proof, 'request', url.origin);
  if(!data || data.origin !== env.HOSTING_PUBLIC_ORIGIN || data.method !== request.method || data.path !== url.pathname+url.search || data.exp-data.iat>60000) return forbidden();
  const bytes = await request.clone().arrayBuffer();
  if(bytes.byteLength > 27*1024*1024 || await hashBody(bytes) !== data.body) return forbidden();
  if(data.identity !== null && !validIdentity(data.identity)) return forbidden();
  const headers = new Headers(request.headers);
  for(const name of Array.from(headers.keys())) if(name.startsWith('oai-authenticated-') || name.startsWith('x-ziyomakon-')) headers.delete(name);
  if(data.identity) {
    headers.set('oai-authenticated-user-id', data.identity.userId);
    headers.set('oai-authenticated-user-email', data.identity.email);
  }
  return new Request(request, {headers});
}
