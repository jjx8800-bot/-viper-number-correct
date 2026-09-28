const phoneInput = document.getElementById("phone");
const searchBtn = document.getElementById("searchBtn");
const statusBox = document.getElementById("status");
const resultsBox = document.getElementById("results");

searchBtn.addEventListener("click", searchPhone);

phoneInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    searchPhone();
  }
});

async function searchPhone() {
  const phone = phoneInput.value.trim();

  resultsBox.innerHTML = "";

  if (!phone) {
    statusBox.innerHTML = '<span class="error">اكتب رقم الجوال أولاً.</span>';
    return;
  }

  searchBtn.disabled = true;
  statusBox.textContent = "جاري البحث...";
  
  try {
    const response = await fetch(
      `/api/search?phone=${encodeURIComponent(phone)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "حدث خطأ أثناء البحث");
    }

    if (!data.results || data.results.length === 0) {
      statusBox.textContent = "لم يتم العثور على نتائج عامة.";
      resultsBox.innerHTML =
        '<div class="no-results">لا توجد نتائج مطابقة في البحث.</div>';
      return;
    }

    statusBox.textContent =
      `تم العثور على ${data.results.length} نتيجة`;

    data.results.forEach((item) => {
      const div = document.createElement("div");
      div.className = "result";

      div.innerHTML = `
        <div class="result-title">
          ${escapeHtml(item.title || "بدون عنوان")}
        </div>

        <a
          href="${escapeAttribute(item.url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHtml(item.url)}
        </a>
      `;

      resultsBox.appendChild(div);
    });

  } catch (error) {
    statusBox.innerHTML =
      `<span class="error">${escapeHtml(error.message)}</span>`;
  } finally {
    searchBtn.disabled = false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}