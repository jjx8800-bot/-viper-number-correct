const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 10000;

// =====================================================
// Brave Search API
// =====================================================

// ضع مفتاح Brave الخاص بك هنا
const BRAVE_API_KEY = "BSAgVUke7T8k_ndidhQ8TRs2jV2kfb1";


// =====================================================
// تنظيف رقم الجوال
// =====================================================

function normalizePhone(phone) {
  let number = String(phone || "").trim();

  number = number.replace(/[\s()-]/g, "");

  if (number.startsWith("00966")) {
    number = "+" + number.substring(2);
  }

  if (number.startsWith("05") && number.length === 10) {
    number = "+966" + number.substring(1);
  }

  if (number.startsWith("5") && number.length === 9) {
    number = "+966" + number;
  }

  return number;
}


// =====================================================
// البحث في Brave
// =====================================================

async function braveSearch(query) {

  if (
    !BRAVE_API_KEY ||
    BRAVE_API_KEY === "BSAgVUke7T8k_ndidhQ8TRs2jV2kfb1"
  ) {
    throw new Error("BSAgVUke7T8k_ndidhQ8TRs2jV2kfb1");
  }

  const url =
    "https://api.search.brave.com/res/v1/web/search?q=" +
    encodeURIComponent(query) +
    "&count=20";

  const response = await fetch(url, {
    method: "GET",

    headers: {
      "Accept": "application/json",
      "X-Subscription-Token": BRAVE_API_KEY
    }
  });

  if (!response.ok) {

    const errorText = await response.text();

    throw new Error(
      "Brave API Error " +
      response.status +
      ": " +
      errorText
    );
  }

  return await response.json();
}


// =====================================================
// البحث عن رقم الجوال
// =====================================================

async function searchPhone(phone) {

  const number = normalizePhone(phone);

  if (!number) {
    throw new Error("أدخل رقم الجوال");
  }

  const searchQueries = [
    `"${number}"`,
    `"${number.replace("+966", "00966")}"`,
    `"0${number.substring(4)}"`
  ];

  const results = [];
  const usedUrls = new Set();

  for (const query of searchQueries) {

    const data = await braveSearch(query);

    const webResults =
      data &&
      data.web &&
      data.web.results
        ? data.web.results
        : [];

    for (const item of webResults) {

      const url = item.url || "";

      if (!url || usedUrls.has(url)) {
        continue;
      }

      usedUrls.add(url);

      results.push({
        title: item.title || "بدون عنوان",

        url: url,

        description:
          item.description || ""
      });
    }
  }

  return {
    phone: number,

    found: results.length > 0,

    count: results.length,

    results: results
  };
}


// =====================================================
// API البحث - POST
// =====================================================

app.post("/api/search", async (req, res) => {

  try {

    const phone =
      req.body.phone ||
      req.body.number ||
      req.body.query;

    if (!phone) {

      return res.status(400).json({
        success: false,
        error: "أدخل رقم الجوال"
      });

    }

    const result =
      await searchPhone(phone);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});


// =====================================================
// API البحث - GET
// =====================================================

app.get("/api/search", async (req, res) => {

  try {

    const phone =
      req.query.phone ||
      req.query.number;

    if (!phone) {

      return res.status(400).json({
        success: false,
        error: "أدخل رقم الجوال"
      });

    }

    const result =
      await searchPhone(phone);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});


// =====================================================
// فحص الخادم
// =====================================================

app.get("/api/health", (req, res) => {

  const braveConfigured =
    BRAVE_API_KEY &&
    BRAVE_API_KEY !== "ضع_مفتاح_Brave_هنا";

  res.json({

    success: true,

    server: "online",

    braveConfigured: Boolean(braveConfigured)

  });

});


// =====================================================
// الصفحة الرئيسية
// =====================================================

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});


// =====================================================
// تشغيل الخادم
// =====================================================

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});