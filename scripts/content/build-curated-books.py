"""Build full Uzbek public-domain works from cached Wikisource transcriptions.
Sources and revision attribution are embedded in every PDF and manifest.
Raw fetched HTML is in tmp/books (not published or committed).
"""
from pathlib import Path
from bs4 import BeautifulSoup
import json,re,urllib.parse,hashlib,base64,html
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from pypdf import PdfReader
root=Path.cwd();cache=root/'tmp/books';out=root/'public/books';out.mkdir(exist_ok=True)
pdfmetrics.registerFont(TTFont('Book','/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('Label','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
styles={
 'body':ParagraphStyle('body',fontName='Book',fontSize=10.5,leading=16,spaceAfter=7,splitLongWords=True),
 'title':ParagraphStyle('title',fontName='Book',fontSize=29,leading=38,textColor=HexColor('#0b493d'),spaceAfter=25),
 'chapter':ParagraphStyle('chapter',fontName='Label',fontSize=16,leading=23,spaceAfter=16),
 'note':ParagraphStyle('note',fontName='Label',fontSize=8.5,leading=13,spaceAfter=8,wordWrap='CJK'),
}
chapters=json.loads((cache/'chapters.json').read_text())
books=[
 ('otkan-kunlar',"O'tkan kunlar",'O‘tkan kunlar','Abdulla Qodiriy','Roman. Yozg‘uchidan va 57 bob. Ochiq matn asosidagi elektron nashr.',['milliy']),
 ('kecha-va-kunduz','Kecha va kunduz','Kecha va kunduz','Abdulhamid Cho‘lpon','Roman. Saqlanib qolgan “Kecha” qismining 20 bobi. “Kunduz” qismi ushbu nashrga kirmaydi.',['milliy','mutolaa']),
 ('padarkush','Padarkush','Padarkush','Mahmudxo‘ja Behbudiy','Uch parda va to‘rt manzarali drama. Ochiq matn asosidagi elektron nashr.',['mutolaa']),
 ('turkiy-guliston','Turkiy Guliston yoxud axloq','Turkiy guliston yoxud axloq','Abdulla Avloniy','Ta’lim, tarbiya va axloqqa bag‘ishlangan asar. Ochiq matn asosidagi elektron nashr.',['mutolaa']),
 ('baxtsiz-kuyov','Baxtsiz kuyov','Baxtsiz kuyov','Abdulla Qodiriy','To‘rt pardali fojia. Ochiq matn asosidagi elektron nashr.',[]),
 ('muxtasar-tarix','Muxtasar tarixi anbiyo va tarixi Islom','Muxtasar tarixi anbiyo va tarixi Islom','Abdulla Avloniy','1913-yilgi tarixiy-ma’rifiy asar. Tarixiy matndagi qarash va imlo saqlangan.',[]),
 ('uloqda','Uloqda','Uloqda','Abdulla Qodiriy','Hikoya. Ochiq matn asosidagi elektron nashr.',[]),
]
manifest=[];payload=[]
def extract(f):
 s=BeautifulSoup(f.read_text(),'html.parser');c=s.select_one('.mw-parser-output');assert c
 for x in c.select('style,script,.ws-noexport,.noprint,.licensetpl,.mw-editsection,.navbox,.toc,.header-container,.ws-header,table') :x.decompose()
 text=c.get_text('\n',strip=True)
 lines=[re.sub(r'\s+',' ',x).strip() for x in text.splitlines() if x.strip()]
 # Parent links and navigation are separate markup outside literary content.
 lines=[x for x in lines if x not in ['Download','←','→']]
 return lines,s
for slug,name,title,author,desc,groups in books:
 f=cache/(name+'.html');s=BeautifulSoup(f.read_text(),'html.parser');url='https://wikisource.org/wiki/'+urllib.parse.quote(name.replace(' ','_'))
 revision=s.select_one('#t-permalink a');rev='https://wikisource.org'+revision['href'] if revision else url
 parts=[(x['chapter'],cache/x['file'], 'https://wikisource.org'+x['href']) for x in chapters if x['book']==name]
 if not parts:parts=[('',f,url)]
 assert len(parts)==(58 if slug=='otkan-kunlar' else 20 if slug=='kecha-va-kunduz' else 1)
 story=[Spacer(1,45),Paragraph('ZIYOMAKON · OCHIQ KUTUBXONA',styles['note']),Spacer(1,25),Paragraph(html.escape(title),styles['title']),Paragraph(html.escape(author),styles['chapter']),Paragraph(html.escape(desc),styles['note']),Spacer(1,30),Paragraph('Manba: Wikisource va uning ko‘ngilli ishtirokchilari. Ushbu PDF Wikisource ochiq matnidan sahifalandi; Mutolaa nashri yoki audiokitobining nusxasi emas.',styles['note']),Paragraph(html.escape(rev),styles['note']),Paragraph('Asl asar Wikisource’da public domain deb belgilangan. Raqamli matn va ushbu tartiblangan nusxa: Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0). Muallif, Wikisource ishtirokchilari va manbani ko‘rsating; moslashtirilgan nusxani shu litsenziya bilan tarqating.',styles['note']),Paragraph('https://creativecommons.org/licenses/by-sa/4.0/',styles['note']),Paragraph('O‘zgarishlar: navigatsiya olib tashlandi, muqova va sahifa raqamlari qo‘shildi, matn PDF formatida qayta sahifalandi. Asl imlo saqlandi. 7 noyabr 2026.',styles['note'])]
 totalchars=0;sources=[]
 for i,(chapter,p,source) in enumerate(parts):
  lines,doc=extract(p);chars=sum(map(len,lines));assert chars>300,(p,chars);totalchars+=chars
  story.append(PageBreak())
  if chapter:story.append(Paragraph(html.escape('Muqaddima' if not chapter.isdigit() else chapter+'-bob'),styles['chapter']))
  for line in lines:
   story.append(Paragraph(html.escape(line),styles['body']))
  r=doc.select_one('#t-permalink a');sources.append('https://wikisource.org'+r['href'] if r else source)
 story.append(PageBreak());story.append(Paragraph('Manbalar va hissa qo‘shuvchilar',styles['chapter']))
 for src in sources:story.append(Paragraph(html.escape(src),styles['note']))
 def footer(c,d):
  c.setFont('Label',8);c.setFillColor(HexColor('#718078'));c.drawString(44,25,'ZIYOMAKON | '+title[:45]);c.drawRightString(376,25,str(d.page))
 pdf=out/(slug+'.pdf');SimpleDocTemplate(str(pdf),pagesize=(420,595),leftMargin=44,rightMargin=44,topMargin=42,bottomMargin=43,title=title,author=author).build(story,onFirstPage=footer,onLaterPages=footer)
 data=pdf.read_bytes();count=len(PdfReader(pdf).pages);print(slug,'parts',len(parts),'chars',totalchars,'pages',count,'bytes',len(data),flush=True)
 b={'id':'curated-'+slug,'title':title,'author':author,'language':'uz','category':'Mumtoz adabiyot','description':desc,'source':rev+' | Wikisource contributors; CC BY-SA 4.0; original public domain','size':len(data),'hash':hashlib.sha256(data).hexdigest(),'pages':count,'groups':groups,'path':'/books/'+slug+'.pdf','parts':len(parts),'characters':totalchars}
 manifest.append(b);payload.append({**b,'base64':base64.b64encode(data).decode()})
(root/'lib/curated-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));(root/'lib/curated-payload.json').write_text(json.dumps(payload,ensure_ascii=False))
