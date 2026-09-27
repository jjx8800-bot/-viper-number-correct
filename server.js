const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 10000;

// ========================================
// إعدادات Google
// ========================================

// ضع مفتاح Google API هنا
const GOOGLE_API_KEY = "BSAi7b6ThHEsyTThxK0cbfrJ8huwKxN";

// ضع Google Search Engine ID (CX) هنا
const GOOGLE_CX = "17e078b70b49a488a"

// ========================================
// استخراج أرقام الهواتف من النص
// ========================================

function extractPhones(text) {
  if (!text) return [];

  const patterns = [
    /\+966[\s-]?\d{1,3}[\s-]?\d{3}[\s-]?\d{3,4}/g,
    /00966[\s-]?\d{1,3}[\s-]?\d{3}[\s-]?\d{3,4}/g,
    /05\d[\s-]?\d{3}[\s-]?\d{4}/g,
    /0\d[\s-]?\d{2,3}[\s-]?\d{3,4}/g
  ];

  const phones = [];

  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    phones.push(...matches);
  }

  return [...new Set(phones)];
}

// ========================================
// تنظيف رقم الهاتف
// ========================================

function normalizePhone(phone) {
  return phone
    .replace(/[^\d+]/g, "")
    .replace(/^00966/, "+966");
}

// ========================================
// الصفحة الرئيسية
// ========================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// ========================================
// فحص حالة السيرفر
// ========================================

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    status: "online",
    service: "VipEr Number Search"
  });
});

// ========================================
// البحث
// ========================================

app.post("/api/search", async (req, res) => {
  try {
    const company = String(
      req.body.company || ""
    ).trim();

    if (!company) {
      return res.status(400).json({
        success: false,
        error: "اكتب اسم الشركة أولاً."
      });
    }

    // التأكد من وجود الإعدادات
    if (
      !GOOGLE_API_KEY ||
      GOOGLE_API_KEY === "YOUR_GOOGLE_API_KEY"
    ) {
      return res.status(500).json({
        success: false,
        error: "مفتاح Google API غير موجود."
      });
    }

    if (
      !GOOGLE_CX ||
      GOOGLE_CX === "YOUR_GOOGLE_CX"
    ) {
      return res.status(500).json({
        success: false,
        error: "معرّف محرك البحث Google CX غير موجود."
      });
    }

    // ========================================
    // عبارة البحث
    // ========================================

    const query =
      `"${company}" (هاتف OR جوال OR رقم OR تواصل OR اتصل OR phone OR contact OR telephone)`;

    // ========================================
    // إنشاء رابط Google
    // ========================================

    const searchUrl = new URL(
      "https://www.googleapis.com/customsearch/v1"
    );

    searchUrl.searchParams.set(
      "key",
      GOOGLE_API_KEY
    );

    searchUrl.searchParams.set(
      "cx",
      GOOGLE_CX
    );

    searchUrl.searchParams.set(
      "q",
      query
    );

    searchUrl.searchParams.set(
      "num",
      "10"
    );

    // ========================================
    // إرسال الطلب إلى Google
    // ========================================

    const response = await fetch(
      searchUrl.toString()
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Google API Error:",
        data
      );

      return res.status(502).json({
        success: false,
        error:
          data?.error?.message ||
          "حدث خطأ في خدمة Google."
      });
    }

    // ========================================
    // قراءة النتائج
    // ========================================

    const items = Array.isArray(data.items)
      ? data.items
      : [];

    const results = [];
    const phones = [];

    for (const item of items) {

      const title =
        item.title || "";

      const description =
        item.snippet || "";

      const link =
        item.link || "";

      const text =
        `${title} ${description} ${link}`;

      // استخراج الأرقام
      const foundPhones =
        extractPhones(text);

      for (const phone of foundPhones) {

        const normalized =
          normalizePhone(phone);

        if (
          normalized.length >= 9 &&
          !phones.includes(normalized)
        ) {
          phones.push(normalized);
        }
      }

      results.push({
        title,
        description,
        url: link
      });
    }

    // ========================================
    // إرسال النتيجة للموقع
    // ========================================

    return res.json({
      success: true,
      company,
      phones,
      results,
      count: phones.length
    });

  } catch (error) {

    console.error(
      "Search Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "حدث خطأ أثناء تنفيذ البحث."
    });
  }
});

// ========================================
// تشغيل السيرفر
// ========================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `VipEr running on port ${PORT}`
    );
  }
);