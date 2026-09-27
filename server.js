const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BRAVE_API_KEY = "BSAi7b6ThHEsyTThxK0cbfrJ8huwKxN";

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function normalizePhone(raw) {
  if (!raw) return null;
  let s = raw.replace(/[\u200e\u200f]/g, '').trim();
  s = s.replace(/(?:tel:|call:)/gi, '');
  const digits = s.replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length < 7 || digits.replace(/\D/g, '').length > 15) return null;
  return s;
}

function extractPhones(text) {
  if (!text) return [];
  const patterns = [
    /(?:\+?\d[\d\s().-]{6,}\d)/g,
    /(?:800|9200|900)\s?[\d\s-]{4,12}/g,
    /(?:0\d{2})\s?[\d\s-]{5,10}/g
  ];
  const out = [];
  for (const p of patterns) {
    for (const m of text.matchAll(p)) {
      const phone = normalizePhone(m[0]);
      if (phone && !out.includes(phone)) out.push(phone);
    }
  }
  return out.slice(0, 10);
}

function cleanDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function scoreResult(result, company) {
  const title = `${result.title || ''} ${result.description || ''}`.toLowerCase();
  const url = result.url || '';
  const domain = cleanDomain(url).toLowerCase();
  let score = 0;
  if (title.includes(company.toLowerCase())) score += 3;
  if (/contact|support|help|customer|اتصل|تواصل|خدمة العملاء|اتصل بنا|دعم/.test(title)) score += 5;
  if (/official|رسمي|الرئيسية|contact|support|help|customer/.test(title)) score += 2;
  if (/gov\.sa$|\.sa$/.test(domain)) score += 1;
  return score;
}

app.post('/api/search', async (req, res) => {
  try {
    if (!BRAVE_API_KEY) return res.status(500).json({ error: 'BRAVE_API_KEY غير مضبوط في الخادم.' });
    const company = String(req.body?.company || '').trim();
    if (company.length < 2) return res.status(400).json({ error: 'اكتب اسم الشركة أو المنصة.' });

    const q = `"${company}" ("خدمة العملاء" OR "اتصل بنا" OR "تواصل معنا" OR "customer service" OR "contact us") (رقم OR phone OR هاتف)`;
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', q);
    url.searchParams.set('count', '10');
    url.searchParams.set('country', 'sa');
    url.searchParams.set('search_lang', 'ar');
    url.searchParams.set('safesearch', 'moderate');

    const r = await fetch(url, { headers: { 'Accept': 'application/json', 'X-Subscription-Token': BRAVE_API_KEY } });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.message || 'تعذر الاتصال بخدمة البحث.' });

    const raw = (data.web?.results || []).map(x => ({
      title: x.title || '',
      url: x.url || '',
      description: x.description || ''
    }));

    const ranked = raw.map(x => ({ ...x, score: scoreResult(x, company), phones: extractPhones(`${x.title} ${x.description}`) }))
      .sort((a,b) => b.score - a.score);

    const phoneCandidates = [...new Set(ranked.flatMap(x => x.phones))].slice(0, 8);
    res.json({ company, query: q, phoneCandidates, results: ranked.slice(0, 8) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم.' });
  }
});

app.get('*', (req,res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Viper running on http://localhost:${PORT}`));
