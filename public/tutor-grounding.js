// Evidence UI uses API metadata, not a claim written by the model.
function teacherOpenGoogle(query){
 const text=String(query||document.getElementById('teacherInput')?.value||'').trim().slice(0,1000);
 if(!text){document.getElementById('teacherInput')?.focus();if(typeof showToast==='function')showToast('Google’da qidirish uchun savolingizni yozing.','info');return;}
 window.open('https://www.google.com/search?q='+encodeURIComponent(text),'_blank','noopener,noreferrer');
}
function teacherSafeSources(value){
 if(!Array.isArray(value))return [];
 return value.slice(0,20).flatMap(s=>{try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password||u.href.length>3000)return [];return [{url:u.href,title:String(s.title||u.hostname).slice(0,200)}];}catch{return [];}});
}
function teacherEvidenceMarkup(m,index){
 if(m.role!=='teacher'||!m.searchEnabled)return '';
 if(m.searchUnavailable)return '<div class="small mt-2 border-top pt-2"><strong>Avtomatik Google qidiruviga ruxsat yoki kvota yo‘q.</strong><p class="mb-1">Bu javob internetdan tekshirilmagan. Google natijalarini bepul ochishingiz mumkin:</p><a class="btn btn-outline-primary btn-sm" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q='+encodeURIComponent(String(m.searchQuery||'').slice(0,1000))+'">🌐 Google’da bepul qidirish ↗</a></div>';
 const sources=teacherSafeSources(m.sources);
 return '<div class="small mt-2 border-top pt-2"><strong>'+ (m.webSearchUsed?'🌐 Google Search manbalari':'Internet qidiruvi yoqilgan · bu javobda manba qaytmadi')+'</strong>'+(sources.length?'<ol class="mt-2 mb-1">'+sources.map(s=>'<li><a target="_blank" rel="noopener noreferrer" href="'+escapeHtml(s.url)+'">'+escapeHtml(s.title)+'</a></li>').join('')+'</ol>':'')+'</div><div class="teacher-search-suggestions" data-message-index="'+index+'"></div>';
}
function mountTeacherSuggestions(box,messages){
 box.querySelectorAll('.teacher-search-suggestions').forEach(host=>{
  const m=messages[Number(host.dataset.messageIndex)];
  if(!m?.webSearchUsed||!Array.isArray(m.searchSuggestions))return;
  m.searchSuggestions.slice(0,3).forEach(snippet=>{
   if(typeof snippet!=='string'||snippet.length>100000)return;
   const frame=document.createElement('iframe');
   frame.title='Google Search tavsiyalari';frame.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');
   frame.setAttribute('referrerpolicy','no-referrer');frame.style.cssText='width:100%;height:180px;border:0;margin-top:8px;background:white;border-radius:8px';
   frame.srcdoc=snippet;host.appendChild(frame);
  });
 });
}
