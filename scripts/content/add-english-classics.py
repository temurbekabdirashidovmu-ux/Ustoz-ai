from pathlib import Path
import json,urllib.request,re,html,hashlib,base64
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
pdfmetrics.registerFont(TTFont('Book','/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'));pdfmetrics.registerFont(TTFont('Label','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
body=ParagraphStyle('body',fontName='Book',fontSize=10.5,leading=16,spaceAfter=8);titleStyle=ParagraphStyle('title',fontName='Book',fontSize=25,leading=34,spaceAfter=25);note=ParagraphStyle('note',fontName='Label',fontSize=9,leading=14,spaceAfter=10)
manifest=json.loads(Path('lib/curated-manifest.json').read_text());payload=json.loads(Path('lib/curated-payload.json').read_text())
books=[(910,'white-fang','White Fang','Jack London','Oq so‘yloq','Jek London'),(103,'eighty-days','Around the World in Eighty Days','Jules Verne','Dunyo bo‘ylab sakson kun','Jyul Vern'),(289,'wind-willows','The Wind in the Willows','Kenneth Grahame','Tolzordan esgan shamol','Kennet Grehem')]
for n,slug,title,author,uz,uzAuthor in books:
 url=f'https://www.gutenberg.org/cache/epub/{n}/pg{n}.txt';f=Path(f'tmp/books/pg{n}.txt')
 if not f.exists():f.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read())
 text=f.read_text(encoding='utf-8-sig');assert '*** START OF' in text and '*** END OF' in text and len(text)>150000
 desc=f'“{uz}” asarining inglizcha asl nusxasi'+(' (George M. Towle tarixiy tarjimasi)' if n==103 else '')+'. O‘zbekcha tarjima emas. Yosh kitobxon ro‘yxatidagi asarni ingliz tilida mutolaa qilish uchun.'
 story=[Spacer(1,45),Paragraph('ZIYOMAKON · ENGLISH CLASSICS',note),Spacer(1,25),Paragraph(title,titleStyle),Paragraph(author,note),Spacer(1,25),Paragraph(html.escape(desc),note),Paragraph('Source: '+url,note),Paragraph('Original literary work: public domain. The Project Gutenberg notices and full license are retained below. Text-only edition; illustrations are not included. PDF typesetting by ZIYOMAKON, 7 November 2026.',note),PageBreak()]
 for para in re.split(r'\n\s*\n',text):
  line=re.sub(r'\s+',' ',para).strip()
  if line:story.append(Paragraph(html.escape(line),body))
 p=Path('public/books')/(slug+'.pdf')
 def footer(c,d):c.setFont('Label',8);c.drawString(44,25,'ZIYOMAKON | '+title[:45]);c.drawRightString(376,25,str(d.page))
 SimpleDocTemplate(str(p),pagesize=(420,595),leftMargin=44,rightMargin=44,topMargin=42,bottomMargin=43,title=title,author=author).build(story,onFirstPage=footer,onLaterPages=footer)
 data=p.read_bytes();pages=len(PdfReader(p).pages);b={'id':'curated-'+slug,'title':title,'author':author,'language':'en','category':'Mumtoz adabiyot','description':desc,'source':url+' | Original public domain; Project Gutenberg license retained','size':len(data),'hash':hashlib.sha256(data).hexdigest(),'pages':pages,'groups':['yosh'],'path':'/books/'+slug+'.pdf','parts':1,'characters':len(text),'listTitle':uz,'listAuthor':uzAuthor}
 manifest=[x for x in manifest if x['id']!=b['id']]+[b];payload=[x for x in payload if x['id']!=b['id']]+[{**b,'base64':base64.b64encode(data).decode()}];print(slug,pages,len(data),flush=True)
Path('lib/curated-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));Path('lib/curated-payload.json').write_text(json.dumps(payload,ensure_ascii=False))
