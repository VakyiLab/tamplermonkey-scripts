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

(function() {
    'use strict';

    const STORAGE_KEY = 'linux_do_oauth_allowed_sites_v2';
    let currentSiteName = null;
    let isProcessing = false;

    function getAllowedSites() {
        const data = GM_getValue(STORAGE_KEY, '[]');
        try {
            return JSON.parse(data);
        } catch (e) {
            return [];
        }
    }

    function saveAllowedSite(siteName) {
        const sites = getAllowedSites();
        const exists = sites.find(s => s.name === siteName);
        if (!exists) {
            sites.push({
                name: siteName,
                allowedAt: new Date().toISOString()
            });
            GM_setValue(STORAGE_KEY, JSON.stringify(sites));
            updateStatusPanel(true);
        }
    }

    function removeAllowedSite(siteName) {
        let sites = getAllowedSites();
        sites = sites.filter(s => s.name !== siteName);
        GM_setValue(STORAGE_KEY, JSON.stringify(sites));
        updateStatusPanel(false);
    }

    function isAllowed(siteName) {
        const sites = getAllowedSites();
        return sites.some(s => s.name === siteName);
    }

    function getSiteName() {
        const h2 = document.querySelector('h2');
        if (h2) {
            const text = h2.textContent.trim();
            const match = text.match(/"([^"]+)"/);
            return match ? match[1] : text;
        }
        const appName = document.querySelector('.app-name, [class*="app"]');
        if (appName) return appName.textContent.trim();
        const strong = document.querySelector('strong, b');
        if (strong) return strong.textContent.trim();
        return '未知应用';
    }

    function createStatusPanel() {
        const existing = document.getElementById('oauth-status-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'oauth-status-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            padding: 20px;
            width: 280px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        panel.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                <div id="oauth-status-icon" style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    flex-shrink: 0;
                ">🔐</div>
                <div style="flex: 1; min-width: 0;">
                    <div id="oauth-status-text" style="
                        font-weight: 600;
                        font-size: 15px;
                        margin-bottom: 4px;
                    ">检测中...</div>
                    <div id="oauth-site-name" style="
                        font-size: 12px;
                        opacity: 0.9;
                        word-break: break-word;
                        line-height: 1.4;
                    "></div>
                </div>
            </div>
            <div id="oauth-action-hint" style="
                font-size: 11px;
                opacity: 0.8;
                margin-bottom: 12px;
                line-height: 1.4;
            "></div>
            <button id="oauth-toggle-btn" style="
                width: 100%;
                padding: 10px 16px;
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 10px;
                font-size: 13px;
                color: white;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
                display: none;
            ">管理此网站</button>
        `;

        document.body.appendChild(panel);

        panel.querySelector('#oauth-toggle-btn').addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255,255,255,0.3)';
        });
        panel.querySelector('#oauth-toggle-btn').addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255,255,255,0.2)';
        });

        panel.querySelector('#oauth-toggle-btn').addEventListener('click', () => {
            if (isAllowed(currentSiteName)) {
                removeAllowedSite(currentSiteName);
            } else {
                saveAllowedSite(currentSiteName);
            }
        });
    }

    function updateStatusPanel(allowed) {
        const icon = document.getElementById('oauth-status-icon');
        const text = document.getElementById('oauth-status-text');
        const siteName = document.getElementById('oauth-site-name');
        const hint = document.getElementById('oauth-action-hint');
        const toggleBtn = document.getElementById('oauth-toggle-btn');
        const panel = document.getElementById('oauth-status-panel');

        if (!icon || !text) return;

        if (allowed) {
            icon.textContent = '✓';
            icon.style.background = 'rgba(16, 185, 129, 0.3)';
            text.textContent = '已自动允许';
            hint.textContent = '下次访问此网站将自动授权登录';
            toggleBtn.textContent = '移除自动允许';
            toggleBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            toggleBtn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            panel.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            panel.style.boxShadow = '0 10px 40px rgba(16, 185, 129, 0.4)';
        } else {
            icon.textContent = '⏳';
            icon.style.background = 'rgba(245, 158, 11, 0.3)';
            text.textContent = '待授权';
            hint.textContent = '点击页面上的"允许"按钮，脚本将自动记住此网站';
            toggleBtn.textContent = '立即添加自动允许';
            toggleBtn.style.background = 'rgba(255,255,255,0.2)';
            toggleBtn.style.borderColor = 'rgba(255,255,255,0.3)';
            panel.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            panel.style.boxShadow = '0 10px 40px rgba(102, 126, 234, 0.4)';
        }

        if (currentSiteName) {
            siteName.textContent = currentSiteName;
        }

        toggleBtn.style.display = 'block';
    }

    function isAllowButton(element) {
        const text = (element.textContent || element.value || '').toLowerCase().trim();
        const allowKeywords = ['允许', 'authorize', 'approve', '同意', '授权', '确认', '授权登录', '确认授权', '登录', 'login', '登入'];
        return allowKeywords.some(kw => text.includes(kw));
    }

    function isDenyButton(element) {
        const text = (element.textContent || element.value || '').toLowerCase().trim();
        const denyKeywords = ['cancel', '取消', '拒绝', 'deny', 'reject', '不同意', 'decline'];
        return denyKeywords.some(kw => text.includes(kw));
    }

    function handleButtonClick(e) {
        if (isProcessing) return;

        const target = e.target.closest('button, input[type="submit"], input[type="button"], a.btn, [class*="btn"], [class*="button"]');
        if (!target) return;

        if (isAllowButton(target)) {
            isProcessing = true;
            saveAllowedSite(currentSiteName);

            const panel = document.getElementById('oauth-status-panel');
            if (panel) {
                panel.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    panel.style.transform = 'scale(1)';
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
        const allowKeywords = ['允许', 'authorize', 'approve', '同意', '授权', '确认', '授权登录', '确认授权', '登录', 'login', '登入'];
        const denyKeywords = ['cancel', '取消', '拒绝', 'deny'];

        const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, [class*="btn"], [class*="button"]');

        for (const btn of buttons) {
            const text = (btn.textContent || btn.value || '').toLowerCase().trim();

            const isAllow = allowKeywords.some(kw => text.includes(kw));
            const isDeny = denyKeywords.some(kw => text.includes(kw));

            if (isAllow && !isDeny) {
                btn.click();
                return true;
            }
        }

        return false;
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' : '#ef4444';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 500;
            z-index: 1000000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function init() {
        currentSiteName = getSiteName();
        if (!currentSiteName || currentSiteName === '未知应用') {
            setTimeout(init, 500);
            return;
        }

        createStatusPanel();

        const allowed = isAllowed(currentSiteName);
        updateStatusPanel(allowed);

        document.addEventListener('click', handleButtonClick, true);

        if (allowed) {
            setTimeout(() => {
                if (isAllowed(currentSiteName)) {
                    autoClickAllow();
                    showNotification(`已自动授权: ${currentSiteName}`);
                }
            }, 3000);
        }
    }

    GM_registerMenuCommand('📋 查看已允许的网站', () => {
        const sites = getAllowedSites();

        if (sites.length === 0) {
            showNotification('暂无已允许的网站', 'info');
            return;
        }

        const panel = document.getElementById('oauth-status-panel');
        const existingList = document.getElementById('oauth-sites-list');
        if (existingList) {
            existingList.remove();
            return;
        }

        const listDiv = document.createElement('div');
        listDiv.id = 'oauth-sites-list';
        listDiv.style.cssText = `
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(255,255,255,0.2);
            max-height: 200px;
            overflow-y: auto;
        `;

        listDiv.innerHTML = sites.map((s, i) => `
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
        `).join('');

        panel.appendChild(listDiv);

        listDiv.querySelectorAll('.oauth-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
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

            btn.addEventListener('mouseenter', function() {
                this.style.background = 'rgba(239, 68, 68, 0.5)';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.background = 'rgba(239, 68, 68, 0.3)';
            });
        });
    });

    GM_registerMenuCommand('🗑️ 清除所有记录', () => {
        GM_setValue(STORAGE_KEY, '[]');
        updateStatusPanel(false);
        showNotification('已清除所有记录');
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
