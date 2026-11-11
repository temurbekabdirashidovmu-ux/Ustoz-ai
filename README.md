# ZIYOMAKON

O‘zbek tilidagi ta’lim platformasi: virtual Muqaddas ustoz, PDF kutubxona, o‘qish ro‘yxatlari, mashqlar, reyting va admin panel.

Amaldagi sayt: https://ziyomakon-bilim-ai.archedcycle2.chatgpt.site

## Repository tarkibi

- `app/` — sahifalar va server API yo‘llari.
- `lib/` — AI, autentifikatsiya, admin huquqlari, kutubxona va reyting mantiqi.
- `public/` — sayt resurslari, 10 ta PDF, PDF.js o‘quvchi, PWA va brauzer kodlari.
- `db/`, `drizzle/` — ma’lumotlar bazasi sxemasi va SQL migratsiyalar.
- `tests/` — funksional tekshiruvlar.
- `scripts/`, `worker/`, `vite.config.ts` — yig‘ish va server muhiti.

Bu nusxa nashr qilingan saytning v13 manba kodidan (`9a43dd9ab0a44588962e1e6f3a856fb4dcfbb679`) tayyorlangan. API kalitlari, foydalanuvchi yozuvlari va ishlab turgan ma’lumotlar bazasi nusxasi kiritilmagan.

## Ishga tushirish

Node.js 22.13 yoki yangiroq versiya va npm kerak.

```sh
npm run install:ci
npm run build
npm run dev
```

Serverning terminalda ko‘rsatilgan lokal manzilini oching. D1 bazasiga migratsiyalarni tartib bilan qo‘llash va runtime muhitining batafsil ko‘rsatmalari: [docs/SITES_RUNTIME.md](docs/SITES_RUNTIME.md).

## Muhit va saqlash

Platforma Cloudflare Workers, D1 (`DB`) va R2 (`BUCKET`) bilan ishlaydi. `.env.example` faqat qiymatsiz namuna. Haqiqiy sirlarni GitHub’ga yuklamang.

- `OWNER_EMAIL` — sayt egasining tasdiqlangan emaili.
- `CREDENTIAL_ENCRYPTION_KEY` — Gemini kalitini serverda shifrlash uchun base64 ko‘rinishidagi 32 baytli AES kaliti.
- Gemini API kaliti — sayt egasi `/sozlash` orqali kiritadi; server uni bazada shifrlaydi.

Asl ishlab turgan serverning sirlarini ushbu repository’ga ko‘chirish kerak emas. Alohida serverga joylashtirilsa, uning DB/R2 resurslari va sirlarini alohida sozlash kerak.

## Kirish va admin xavfsizligi

Amaldagi nashr ChatGPT Sites tomonidan tekshirilgan shaxsiy identifikatsiya sarlavhalariga tayanadi. Admin huquqlari serverda tekshiriladi. Boshqa hostingga ko‘chirganda ishonchli autentifikatsiya tizimi va shu sarlavhalarni himoya qiladigan qatlam zarur. Oddiy foydalanuvchi yuborgan sarlavhalarga ishonmang. GitHub’ga yuklashning o‘zi Render yoki Netlify’da autentifikatsiyani avtomatik sozlamaydi.

## AI va Google qidiruvi

Oddiy AI suhbat Gemini 3.5 Flash Lite orqali ishlaydi. Avtomatik Google Search bepul qidiruv imkoniyatiga ega Gemini 2.5 Flash Lite modelini sinaydi; modelga kirish Google hisobining ruxsati va kvotasiga bog‘liq. Ruxsat bo‘lmasa, AI suhbat internetdan tekshirilmagan holatda davom etadi va bu holat ochiq ko‘rsatiladi. `Google’da bepul qidirish` tugmasi Google natijalarini alohida oynada ochadi; u avtomatik AI qidiruvi emas.

## Kitoblar

Repository’da 10 ta to‘liq PDF va ularning ko‘rib chiqilgan boshlang‘ich ma’lumotlari mavjud. Bu 1000 ta PDF yuklangan degani emas. Kitoblarning manbalari va izohlari PDF fayllari hamda `lib/curated-manifest.json` ichida. PDF.js litsenziyalari `public/pdfjs/` ichida saqlangan.

## Tekshiruvlar

```sh
node tests/tutor-search.mjs
node tests/admin-permissions.mjs
node tests/book-validation.test.mjs
node tests/library-integration.mjs
node tests/students-integration.mjs
node tests/username-login.mjs
node tests/pilot-integration.mjs
node tests/reader-script.mjs
node tests/seo-integration.mjs
```

Uchinchi tomon kutubxonalarining litsenziyalari saqlangan. Bu repository uchun alohida ochiq kod litsenziyasi belgilanmagan.
