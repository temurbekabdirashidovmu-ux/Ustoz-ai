import {SITE_ORIGIN} from '../../lib/public-home';
export async function GET(){return new Response('User-agent: *\nAllow: /\nDisallow: /sozlash\nDisallow: /admin\nDisallow: /api/\nDisallow: /profil\nDisallow: /kirish\nDisallow: /bellashuv\nDisallow: /hosting/\nDisallow: /auth/\nSitemap: '+SITE_ORIGIN+'/sitemap.xml\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}})}
