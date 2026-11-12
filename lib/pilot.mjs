export const PRE=[
 {text:'Nyutonning I qonuni qanday holatni tushuntiradi?',options:['Jismga natijaviy kuch nol bo‘lsa, uning tezligi o‘zgarmaydi','Har qanday harakat uchun doimiy kuch zarur','Massasi katta jism doim tezroq yuradi'],answer:0},
 {text:'2 kg jismga 6 N natijaviy kuch ta’sir etsa, tezlanish qancha?',options:['12 m/s²','3 m/s²','8 m/s²'],answer:1},
 {text:'Devorni qo‘lingiz bilan itarsangiz, devor sizga qanday kuch bilan ta’sir qiladi?',options:['Hech qanday kuch bilan emas','Kichikroq kuch bilan','Teng kattalikdagi, qarama-qarshi yo‘nalgan kuch bilan'],answer:2},
 {text:'Natijaviy kuch — bu…',options:['Faqat eng katta kuch','Barcha kuchlarning vektor yig‘indisi','Har doim og‘irlik kuchi'],answer:1}
];
export const POST=[
 {text:'Ishqalanishsiz yo‘lda jismga natijaviy kuch nol. U avval 5 m/s tezlikda ketayotgan edi. Keyin…',options:['5 m/s tezlik bilan to‘g‘ri chiziqli harakat qiladi','Albatta to‘xtaydi','Tezlashadi'],answer:0,explanation:'Natijaviy kuch nol bo‘lsa tezlanish nol bo‘ladi; boshlang‘ich tezlik saqlanadi.'},
 {text:'3 kg aravachaga 12 N natijaviy kuch ta’sir etmoqda. Tezlanish?',options:['36 m/s²','9 m/s²','4 m/s²'],answer:2,explanation:'a = F / m = 12 / 3 = 4 m/s².'},
 {text:'III qonundagi ta’sir va aks ta’sir kuchlari nega bir-birini bitta jismda yo‘qotmaydi?',options:['Biri katta bo‘lgani uchun','Ular turli jismlarga qo‘yilgani uchun','Ular bir xil yo‘nalishda bo‘lgani uchun'],answer:1,explanation:'Ta’sir va aks ta’sir kuchlari ikkita turli jismga qo‘yilgan.'},
 {text:'Jismga o‘ngga 10 N va chapga 4 N kuch ta’sir etadi. Natijaviy kuch?',options:['14 N chapga','6 N o‘ngga','0 N'],answer:1,explanation:'Kuchlar qarama-qarshi: 10 − 4 = 6 N. Yo‘nalish kattaroq kuch tomon — o‘ngga.'}
];
export function score(answers,questions){if(!Array.isArray(answers)||answers.length!==questions.length||answers.some(x=>!Number.isInteger(x)||x<0||x>2))throw new Error('Barcha savollarga javob bering.');return answers.reduce((n,a,i)=>n+Number(a===questions[i].answer),0);}
export function validateAttempt(body){if(body.consent!==true)throw new Error('Saqlash uchun rozilik kerak.');if(typeof body.id!=='string'||!/^[-a-f0-9]{36}$/i.test(body.id))throw new Error('Seans identifikatori xato.');if(!Number.isInteger(body.rating)||body.rating<1||body.rating>5)throw new Error('1–5 oralig‘ida baho tanlang.');return {id:body.id,pre:score(body.pre,PRE),post:score(body.post,POST),rating:body.rating};}
