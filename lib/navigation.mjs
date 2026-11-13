const primary=[['/kutubxona','Kutubxona'],['/sinov','Mashq'],['/reyting','Reyting'],['/profil','Profil']];
const secondary=[['/','Bosh sahifa'],['/oquvchilar','O‘quvchilar'],['/loyiha','Loyiha'],['/oqish-royxati','O‘qish ro‘yxatlari'],['/admin','Admin panel']];
const links=(items,path)=>items.map(([href,label])=>`<a href="${href}"${href===path?' aria-current="page"':''}>${label}</a>`).join('');
export function siteNavigation(path='') {
  if(path.startsWith('/kitob/'))path='/kutubxona';
  if(path==='/bellashuv')path='/sinov';
  return `<header class="ziyo-site-header"><a class="brand" href="/">◈ ZIYOMAKON</a><nav class="ziyo-nav" aria-label="Asosiy menyu"><div class="ziyo-primary">${links(primary,path)}</div><details class="ziyo-more"><summary>Yana <span aria-hidden="true">⌄</span></summary><div class="ziyo-more-links">${links(secondary,path)}</div></details></nav></header>`;
}
export const navigationStyles=`
.ziyo-site-header{position:relative;align-items:center;gap:24px}
.ziyo-site-header .brand{flex-shrink:0;display:flex;align-items:center;min-height:44px}
.ziyo-nav{display:flex;align-items:center;gap:12px;flex-wrap:nowrap;min-width:0}
.ziyo-primary{display:flex;align-items:center;gap:8px}
.ziyo-primary>a,.ziyo-more>summary{display:flex;align-items:center;justify-content:center;min-height:44px;padding:10px 13px;white-space:nowrap;border-radius:9px;line-height:1.4}
.ziyo-primary>a:hover,.ziyo-more>summary:hover,.ziyo-primary>a[aria-current=page]{background:#ffffff18;color:#fff}
.ziyo-nav a:focus-visible,.ziyo-more>summary:focus-visible{outline:2px solid #e5c989;outline-offset:3px}
.ziyo-more{position:relative;flex-shrink:0}
.ziyo-more>summary{cursor:pointer;list-style:none;gap:8px;color:#e8fff5}
.ziyo-more>summary::-webkit-details-marker{display:none}
.ziyo-more[open]>summary{background:#ffffff18}
.ziyo-more-links{position:absolute;right:0;top:calc(100% + 9px);z-index:30;width:240px;max-width:calc(100vw - 32px);padding:7px;background:#fff;border:1px solid #d9e6dc;border-radius:13px;box-shadow:0 12px 35px #072c3426}
.ziyo-more-links>a{display:flex;align-items:center;min-height:44px;padding:10px 13px;border-radius:8px;color:#183c35;white-space:normal}
.ziyo-more-links>a:hover,.ziyo-more-links>a[aria-current=page]{background:#edf5ef;color:#075b45}
@media(max-width:760px){
 .ziyo-site-header{display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:12px 16px}
 .ziyo-site-header .brand{min-height:44px;padding-right:82px;font-size:15px}
 .ziyo-nav{display:block;width:100%;font-size:14px}
 .ziyo-primary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
 .ziyo-primary>a{min-width:0;padding:10px 3px}
 .ziyo-more{position:absolute;right:16px;top:12px}
 .ziyo-more>summary{min-height:44px;padding:10px 12px;font-size:14px}
}
`;
const navigationScript=`<script>(()=>{const menu=document.querySelector('.ziyo-more');if(!menu)return;document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false;});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});})();</script>`;

// Apply the shared header at the Render entry point while the older backend
// remains live. New backend pages already render this same shared component.
export function compactNavigationPage(html,path='') {
  const header=/<header><a class="brand" href="\/">[^<]*<\/a><nav>[\s\S]*?<\/nav><\/header>/;
  if(header.test(html))html=html.replace(header,siteNavigation(path)).replace('</head>',`<style>${navigationStyles}</style></head>`);
  if(!html.includes('class="ziyo-site-header"'))return html;
  return html.replace('</body>',navigationScript+'</body>');
}
