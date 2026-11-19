(function () {
  var DOWNLOAD_URL = "https://www.mediafire.com/file/72e8olo7wo49mu2/AgeOfHistoryDEMultiplayer1.0.apk/file";
  var LABELS = {
    tr: { top: "APK v1.0", title: "Resmi Android İstemcisi — Sürüm 1.0", btn: "MediaFire'dan İndir (405 MB)" },
    en: { top: "APK v1.0", title: "Official Android Client — Version 1.0", btn: "Download via MediaFire (405 MB)" },
    ru: { top: "APK v1.0", title: "Официальный Android-клиент — Версия 1.0", btn: "Скачать с MediaFire (405 МБ)" },
    de: { top: "APK v1.0", title: "Offizieller Android-Client — Version 1.0", btn: "Über MediaFire laden (405 MB)" },
    es: { top: "APK v1.0", title: "Cliente Oficial de Android — Versión 1.0", btn: "Descargar en MediaFire (405 MB)" }
  };

  window.openApkDownload = function () {
    if (typeof window.showToast === "function") {
      window.showToast("MediaFire APK v1.0 (405.38 MB)...");
    }
    window.open(DOWNLOAD_URL, "_blank", "noopener,noreferrer");
  };

  function getLabels() {
    var lang = window.currentLang || localStorage.getItem("turgut_lang") || "tr";
    return LABELS[lang] || LABELS.tr;
  }

  function injectDownloadUI() {
    var L = getLabels();
    var topRight = document.querySelector(".topbar-right");
    if (topRight && !document.getElementById("btnTopApkDl")) {
      var topBtn = document.createElement("button");
      topBtn.id = "btnTopApkDl";
      topBtn.className = "btn btn-ok btn-sm";
      topBtn.textContent = L.top;
      topBtn.onclick = window.openApkDownload;
      topRight.insertBefore(topBtn, topRight.lastElementChild);
    }

    var noticeBar = document.querySelector(".notice-bar");
    if (noticeBar && !document.getElementById("apkDownloadBar")) {
      var bar = document.createElement("div");
      bar.id = "apkDownloadBar";
      bar.className = "notice-bar";
      bar.style.borderColor = "rgba(46, 204, 113, 0.45)";
      bar.style.background = "linear-gradient(90deg, rgba(46, 204, 113, 0.12), rgba(13, 22, 40, 0.95))";
      bar.innerHTML =
        '<div class="notice-left" style="flex-wrap:wrap;">' +
          '<span class="tag tag-green">APK v1.0</span>' +
          '<strong id="apkDlTitle" style="color:var(--text); font-size:11.5px;">' + L.title + '</strong>' +
          '<span style="color:var(--muted); font-size:10.5px;">AgeOfHistoryDEMultiplayer1.0.apk • 405.38 MB • Android</span>' +
        '</div>' +
        '<button id="apkDlBtn" class="btn btn-ok btn-sm" onclick="window.openApkDownload()">' + L.btn + '</button>';
      noticeBar.parentNode.insertBefore(bar, noticeBar.nextSibling);
    }
  }

  var origSetLang = window.setLanguage;
  window.setLanguage = function (langCode) {
    if (typeof origSetLang === "function") origSetLang(langCode);
    var L = getLabels();
    var tEl = document.getElementById("apkDlTitle");
    var bEl = document.getElementById("apkDlBtn");
    if (tEl) tEl.textContent = L.title;
    if (bEl) bEl.textContent = L.btn;
  };

  window.addEventListener("DOMContentLoaded", injectDownloadUI);
})();
