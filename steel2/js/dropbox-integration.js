/* SAHROUD STEEL - Dropbox direct upload (OAuth 2.0 PKCE) */
(function () {
  "use strict";

  const CLIENT_ID = "zevuaxek7hupqfb";
  const REDIRECT_URI = "https://sahroud.github.io/steel/steel2/dropbox-callback.html";
  const FOLDER = "/نتایج نرم‌افزارهای مهندسی";
  const TOKEN_KEY = "sahroud_dropbox_refresh_token_v1";
  const AUTO_KEY = "sahroud_dropbox_auto_upload_v1";
  const $ = id => document.getElementById(id);

  let auth = null;
  let dbx = null;

  function hasToken() {
    try { return !!localStorage.getItem(TOKEN_KEY); } catch (_) { return false; }
  }

  function getClient() {
    if (!window.Dropbox || !window.Dropbox.DropboxAuth || !window.Dropbox.Dropbox) {
      throw new Error("کتابخانه رسمی Dropbox بارگذاری نشده است؛ اتصال اینترنت را بررسی کنید.");
    }
    const refreshToken = localStorage.getItem(TOKEN_KEY);
    if (!refreshToken) throw new Error("ابتدا Dropbox را متصل کنید.");
    auth = new window.Dropbox.DropboxAuth({ clientId: CLIENT_ID, refreshToken });
    dbx = new window.Dropbox.Dropbox({ auth });
    return dbx;
  }

  function setStatus(message, isError) {
    const el = $("dropboxStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? "#b45309" : "#166534";
  }

  function updateUI() {
    const connected = hasToken();
    const connect = $("btnDropboxConnect");
    const disconnect = $("btnDropboxDisconnect");
    const upload = $("btnDropboxUploadLatest");
    const auto = $("dropboxAutoUpload");
    if (connect) connect.hidden = connected;
    if (disconnect) disconnect.hidden = !connected;
    if (upload) upload.disabled = !connected || !window.SteelStructuralModel?.lastSpanComparison;
    if (auto) auto.checked = localStorage.getItem(AUTO_KEY) !== "false";
    setStatus(connected
      ? "Dropbox در این مرورگر متصل است. پوشه مقصد: " + FOLDER
      : "Dropbox هنوز در این مرورگر متصل نشده است.", false);
  }

  async function connect() {
    if (!window.Dropbox?.DropboxAuth) throw new Error("کتابخانه Dropbox در دسترس نیست.");
    if (!window.crypto?.subtle) throw new Error("مرورگر باید از Web Crypto پشتیبانی کند؛ صفحه را با HTTPS باز کنید.");
    const stateBytes = new Uint8Array(24);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes, b => b.toString(16).padStart(2, "0")).join("");
    auth = new window.Dropbox.DropboxAuth({ clientId: CLIENT_ID });
    const url = await auth.getAuthenticationUrl(
      REDIRECT_URI, state, "code", "offline",
      ["files.content.write"], undefined, true
    );
    sessionStorage.setItem("sahroud_dropbox_state", state);
    sessionStorage.setItem("sahroud_dropbox_code_verifier", auth.getCodeVerifier());
    window.location.assign(url);
  }

  async function uploadSpanReport(report) {
    if (!report || typeof report !== "object") throw new Error("گزارش آزمایش معتبر نیست.");
    const client = getClient();
    if (auth && typeof auth.checkAndRefreshAccessToken === "function") {
      await auth.checkAndRefreshAccessToken();
    }
    const date = new Date(report.generatedAt || Date.now());
    const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const fileName = "sahroud-steel-span10-" + stamp + ".json";
    const path = FOLDER + "/" + fileName;
    const response = await client.filesUpload({
      path,
      contents: JSON.stringify(report, null, 2),
      mode: { ".tag": "add" },
      autorename: false,
      mute: true
    });
    setStatus("گزارش با موفقیت در Dropbox ذخیره شد: " + (response.result.path_display || path), false);
    updateUI();
    return response.result;
  }

  function addPanel() {
    if ($("dropboxIntegrationPanel")) return;
    const anchor = $("shedLayoutPanel") || $("fullModel3DResult")?.closest(".panel");
    if (!anchor || !anchor.parentNode) return;
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "dropboxIntegrationPanel";
    panel.innerHTML =
      '<div class="panel-title"><h3>ذخیره گزارش در Dropbox</h3><span class="status">اتصال مستقیم</span></div>' +
      '<p>گزارش آزمایش دهانه ۱۰ متر در پوشه «نتایج نرم‌افزارهای مهندسی» ذخیره می‌شود. این اتصال فقط اجازه بارگذاری فایل گزارش را درخواست می‌کند.</p>' +
      '<div class="button-grid">' +
      '<button type="button" id="btnDropboxConnect" class="btn primary">اتصال به Dropbox</button>' +
      '<button type="button" id="btnDropboxDisconnect" class="btn secondary" hidden>قطع اتصال این مرورگر</button>' +
      '<button type="button" id="btnDropboxUploadLatest" class="btn success" disabled>بارگذاری آخرین گزارش</button>' +
      '</div>' +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="dropboxAutoUpload" checked> بارگذاری خودکار گزارش‌های آزمایش بعدی پس از اتصال</label>' +
      '<div id="dropboxStatus" class="notice" aria-live="polite">وضعیت اتصال بررسی می‌شود.</div>' +
      '<p class="geometry-hint">برای اتصال، صفحه رسمی Dropbox باز می‌شود و باید دسترسی را تأیید کنید. کلید محرمانه یا رمز عبور در این نرم‌افزار ذخیره نمی‌شود. توکن تمدید دسترسی در حافظه محلی همین مرورگر نگهداری می‌شود؛ برای قطع کامل مجوز، دسترسی برنامه را از تنظیمات امنیتی Dropbox نیز لغو کنید.</p>';
    anchor.parentNode.insertBefore(panel, anchor.nextSibling);

    $("btnDropboxConnect").addEventListener("click", async () => {
      try { setStatus("در حال انتقال به صفحه امن Dropbox…", false); await connect(); }
      catch (e) { setStatus("اتصال شروع نشد: " + e.message, true); }
    });
    $("btnDropboxDisconnect").addEventListener("click", () => {
      try { localStorage.removeItem(TOKEN_KEY); auth = null; dbx = null; }
      catch (e) { setStatus("خطا در قطع اتصال: " + e.message, true); return; }
      updateUI();
    });
    $("btnDropboxUploadLatest").addEventListener("click", async () => {
      try {
        const report = window.SteelStructuralModel?.lastSpanComparison;
        if (!report) throw new Error("ابتدا آزمایش مقایسه‌ای دهانه ۱۰ متر را اجرا کنید.");
        $("btnDropboxUploadLatest").disabled = true;
        setStatus("در حال بارگذاری گزارش…", false);
        await uploadSpanReport(report);
      } catch (e) { setStatus("بارگذاری انجام نشد: " + (e.error?.error_summary || e.message), true); }
      finally { updateUI(); }
    });
    $("dropboxAutoUpload").addEventListener("change", e => {
      localStorage.setItem(AUTO_KEY, e.target.checked ? "true" : "false");
    });
    updateUI();
  }

  window.addEventListener("sahroud:span-report-ready", async event => {
    if (localStorage.getItem(AUTO_KEY) === "false" || !hasToken()) return;
    try {
      setStatus("گزارش جدید شناسایی شد؛ بارگذاری خودکار آغاز شد…", false);
      await uploadSpanReport(event.detail);
    } catch (e) {
      setStatus("گزارش آماده است اما بارگذاری خودکار ناموفق بود: " + (e.error?.error_summary || e.message), true);
    }
  });

  window.SahroudDropbox = {
    uploadSpanReport,
    isConnected: hasToken,
    isAutoUploadEnabled: () => localStorage.getItem(AUTO_KEY) !== "false"
  };

  function init() {
    addPanel();
    const params = new URLSearchParams(location.search);
    if (params.get("dropbox") === "connected") {
      history.replaceState({}, document.title, location.pathname);
      setStatus("اتصال Dropbox با موفقیت برقرار شد. اکنون می‌توانید گزارش قبلی را بارگذاری کنید یا آزمایش را دوباره اجرا کنید.", false);
    } else if (params.get("dropbox") === "error") {
      setStatus("اتصال Dropbox ناموفق بود: " + (params.get("message") || "خطای نامشخص"), true);
    }
    updateUI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();