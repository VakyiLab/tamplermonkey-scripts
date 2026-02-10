// ==UserScript==
// @name         Linux.do OAuth Auto Allow v2
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  自动允许 Linux.do OAuth 授权，记住已允许的网站，优化版
// @author       vakyi@linux.do
// @match        https://connect.linux.do/oauth2/authorize*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "linux_do_oauth_allowed_sites_v2";
  let currentSiteName = null;
  let currentSiteUrl = null;
  let isProcessing = false;

  function getAllowedSites() {
    const data = GM_getValue(STORAGE_KEY, "[]");
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  function saveAllowedSite(siteName) {
    const sites = getAllowedSites();
    const exists = sites.find((s) => s.name === siteName);
    if (!exists) {
      sites.push({
        name: siteName,
        allowedAt: new Date().toISOString(),
      });
      GM_setValue(STORAGE_KEY, JSON.stringify(sites));
      updateStatusPanel(true);
    }
  }

  function removeAllowedSite(siteName) {
    let sites = getAllowedSites();
    sites = sites.filter((s) => s.name !== siteName);
    GM_setValue(STORAGE_KEY, JSON.stringify(sites));
    updateStatusPanel(false);
  }

  function isAllowed(siteName) {
    const sites = getAllowedSites();
    return sites.some((s) => s.name === siteName);
  }

  function getAppInfo() {
    let name = "未知应用";
    let url = "";

    const appLink = document.querySelector('a[href*="://"]');
    if (appLink) {
      url = appLink.href;
      const linkText = appLink.textContent.trim();
      if (linkText && linkText.length < 50) name = linkText;
    }

    if (name === "未知应用") {
      const h2 = document.querySelector("h2");
      if (h2) {
        const text = h2.textContent.trim();
        const match = text.match(/"([^"]+)"/);
        if (match) name = match[1];
        else {
          const firstPart = text.split(/[\n\r]/)[0].trim();
          if (firstPart && firstPart.length < 50) name = firstPart;
        }
      }
    }

    if (!url) {
      const linkEl = document.querySelector('[class*="url"], [class*="link"]');
      if (linkEl) url = linkEl.textContent.trim();
    }

    return { name, url };
  }

  function getSiteName() {
    return getAppInfo().name;
  }

  function createStatusPanel() {
    const existing = document.getElementById("oauth-status-panel");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.id = "oauth-status-panel";
    panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.75);
            backdrop-filter: blur(10px);
            border-radius: 8px;
            padding: 12px 14px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            font-size: 13px;
            min-width: 180px;
            max-width: 280px;
            cursor: pointer;
            transition: all 0.2s;
        `;

    panel.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span id="oauth-status-icon">⏳</span>
                <span id="oauth-status-text">检测中...</span>
            </div>
            <div id="oauth-site-name" style="font-weight:500;font-size:14px;word-break:break-all;line-height:1.3;"></div>
            <div id="oauth-site-url" style="opacity:0.6;font-size:11px;word-break:break-all;margin-top:4px;"></div>
        `;

    panel.addEventListener("click", () => {
      if (isAllowed(currentSiteName)) {
        removeAllowedSite(currentSiteName);
      } else {
        saveAllowedSite(currentSiteName);
      }
    });

    panel.title = "点击切换自动授权";
    document.body.appendChild(panel);
  }

  function updateStatusPanel(allowed) {
    const icon = document.getElementById("oauth-status-icon");
    const text = document.getElementById("oauth-status-text");
    const siteName = document.getElementById("oauth-site-name");
    const siteUrl = document.getElementById("oauth-site-url");
    const panel = document.getElementById("oauth-status-panel");

    if (!icon || !text) return;

    if (allowed) {
      icon.textContent = "✓";
      text.textContent = "自动授权";
      panel.style.background = "rgba(16,185,129,0.85)";
    } else {
      icon.textContent = "⏳";
      text.textContent = "待授权";
      panel.style.background = "rgba(0,0,0,0.75)";
    }

    if (currentSiteName) {
      siteName.textContent = currentSiteName;
    }
    if (currentSiteUrl) {
      siteUrl.textContent = currentSiteUrl;
    }
  }

  function isAllowButton(element) {
    const text = (element.textContent || element.value || "")
      .toLowerCase()
      .trim();
    const allowKeywords = [
      "允许",
      "authorize",
      "approve",
      "同意",
      "授权",
      "确认",
      "授权登录",
      "确认授权",
      "登录",
      "login",
      "登入",
    ];
    return allowKeywords.some((kw) => text.includes(kw));
  }

  function isDenyButton(element) {
    const text = (element.textContent || element.value || "")
      .toLowerCase()
      .trim();
    const denyKeywords = [
      "cancel",
      "取消",
      "拒绝",
      "deny",
      "reject",
      "不同意",
      "decline",
    ];
    return denyKeywords.some((kw) => text.includes(kw));
  }

  function handleButtonClick(e) {
    if (isProcessing) return;

    const target = e.target.closest(
      'button, input[type="submit"], input[type="button"], a.btn, [class*="btn"], [class*="button"]',
    );
    if (!target) return;

    if (isAllowButton(target)) {
      isProcessing = true;
      saveAllowedSite(currentSiteName);

      const panel = document.getElementById("oauth-status-panel");
      if (panel) {
        panel.style.transform = "scale(1.02)";
        setTimeout(() => {
          panel.style.transform = "scale(1)";
        }, 200);
      }

      setTimeout(() => {
        isProcessing = false;
      }, 1000);
    } else if (isDenyButton(target)) {
      if (isAllowed(currentSiteName)) {
        removeAllowedSite(currentSiteName);
      }
    }
  }

  function autoClickAllow() {
    const allowKeywords = [
      "允许",
      "authorize",
      "approve",
      "同意",
      "授权",
      "确认",
      "授权登录",
      "确认授权",
      "登录",
      "login",
      "登入",
    ];
    const denyKeywords = ["cancel", "取消", "拒绝", "deny"];

    const buttons = document.querySelectorAll(
      'button, input[type="submit"], input[type="button"], a.btn, [class*="btn"], [class*="button"]',
    );

    for (const btn of buttons) {
      const text = (btn.textContent || btn.value || "").toLowerCase().trim();

      const isAllow = allowKeywords.some((kw) => text.includes(kw));
      const isDeny = denyKeywords.some((kw) => text.includes(kw));

      if (isAllow && !isDeny) {
        btn.click();
        return true;
      }
    }

    return false;
  }

  function showNotification(message, type = "success") {
    const notification = document.createElement("div");
    const bgColor =
      type === "success" ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)";
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            backdrop-filter: blur(10px);
            color: white;
            padding: 8px 14px;
            border-radius: 6px;
            font-size: 13px;
            z-index: 1000000;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => (notification.style.transform = "translateX(0)"), 10);
    setTimeout(() => {
      notification.style.transform = "translateX(120%)";
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  function init() {
    const info = getAppInfo();
    currentSiteName = info.name;
    currentSiteUrl = info.url;

    if (!currentSiteName || currentSiteName === "未知应用") {
      setTimeout(init, 500);
      return;
    }

    createStatusPanel();

    const allowed = isAllowed(currentSiteName);
    updateStatusPanel(allowed);

    document.addEventListener("click", handleButtonClick, true);

    if (allowed) {
      setTimeout(() => {
        if (isAllowed(currentSiteName)) {
          autoClickAllow();
          showNotification(`已自动授权: ${currentSiteName}`);
        }
      }, 3000);
    }
  }

  GM_registerMenuCommand("📋 查看已允许的网站", () => {
    const sites = getAllowedSites();

    if (sites.length === 0) {
      showNotification("暂无已允许的网站", "info");
      return;
    }

    const panel = document.getElementById("oauth-status-panel");
    const existingList = document.getElementById("oauth-sites-list");
    if (existingList) {
      existingList.remove();
      return;
    }

    const listDiv = document.createElement("div");
    listDiv.id = "oauth-sites-list";
    listDiv.style.cssText = `
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(255,255,255,0.2);
            max-height: 200px;
            overflow-y: auto;
        `;

    listDiv.innerHTML = sites
      .map(
        (s, i) => `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: rgba(255,255,255,0.1);
                border-radius: 8px;
                margin-bottom: 8px;
                font-size: 12px;
            ">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name}</div>
                    <div style="opacity: 0.7; font-size: 10px;">${new Date(s.allowedAt).toLocaleDateString()}</div>
                </div>
                <button class="oauth-remove-item" data-index="${i}" style="
                    margin-left: 8px;
                    padding: 6px 12px;
                    background: rgba(239, 68, 68, 0.3);
                    border: 1px solid rgba(239, 68, 68, 0.5);
                    border-radius: 6px;
                    font-size: 11px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                ">删除</button>
            </div>
        `,
      )
      .join("");

    panel.appendChild(listDiv);

    listDiv.querySelectorAll(".oauth-remove-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.dataset.index);
        const sites = getAllowedSites();
        const removed = sites.splice(idx, 1)[0];
        GM_setValue(STORAGE_KEY, JSON.stringify(sites));

        if (removed.name === currentSiteName) {
          updateStatusPanel(false);
        }

        listDiv.remove();
        showNotification(`已移除: ${removed.name}`);
      });

      btn.addEventListener("mouseenter", function () {
        this.style.background = "rgba(239, 68, 68, 0.5)";
      });
      btn.addEventListener("mouseleave", function () {
        this.style.background = "rgba(239, 68, 68, 0.3)";
      });
    });
  });

  GM_registerMenuCommand("🗑️ 清除所有记录", () => {
    GM_setValue(STORAGE_KEY, "[]");
    updateStatusPanel(false);
    showNotification("已清除所有记录");
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
