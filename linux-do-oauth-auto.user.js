// ==UserScript==
// @name         Linux.do OAuth Auto Allow
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  监听用户点击行为，自动记住授权的OAuth应用，右下角显示状态
// @author       vakyi@linux.do
// @match        https://connect.linux.do/oauth2/authorize*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'linux_do_oauth_allowed_sites';
    let currentClientId = null;
    let currentSiteName = null;
    let isProcessing = false;

    function getAllowedSites() {
        const data = GM_getValue(STORAGE_KEY, '[]');
        console.log('[OAuth Auto] 存储的原始数据:', data);
        try {
            const sites = JSON.parse(data);
            console.log('[OAuth Auto] 解析后的网站列表:', sites);
            return sites;
        } catch (e) {
            console.error('[OAuth Auto] 解析存储数据失败:', e);
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
            console.log('[OAuth Auto] 已记住:', siteName);
            updateStatusPanel(true);
        }
    }

    function removeAllowedSite(siteName) {
        let sites = getAllowedSites();
        sites = sites.filter(s => s.name !== siteName);
        GM_setValue(STORAGE_KEY, JSON.stringify(sites));
        console.log('[OAuth Auto] 已移除:', siteName);
        updateStatusPanel(false);
    }

    function isAllowed(siteName) {
        const sites = getAllowedSites();
        return sites.some(s => s.name === siteName);
    }

    function getClientId() {
        const urlParams = new URLSearchParams(window.location.search);
        const clientId = urlParams.get('client_id');
        console.log('[OAuth Auto] URL client_id:', clientId);
        return clientId;
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
        panel.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 16px 20px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                max-width: 300px;
                transition: all 0.3s ease;
            ">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span id="oauth-status-icon" style="font-size: 18px;">🔐</span>
                    <span id="oauth-status-text" style="font-weight: 600; color: #374151;">检测中...</span>
                </div>
            <div id="oauth-site-name" style="color: #6b7280; font-size: 12px; word-break: break-all; margin-bottom: 8px;"></div>
            <div id="oauth-debug-info" style="color: #9ca3af; font-size: 10px; font-family: monospace; margin-bottom: 8px; display: none;"></div>
            <div id="oauth-action-hint" style="color: #9ca3af; font-size: 11px; font-style: italic;"></div>
            <button id="oauth-toggle-btn" style="
                margin-top: 10px;
                width: 100%;
                padding: 6px 12px;
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 12px;
                color: #4b5563;
                cursor: pointer;
                display: none;
            ">管理此网站</button>
            <button id="oauth-debug-btn" style="
                margin-top: 6px;
                width: 100%;
                padding: 4px 8px;
                background: transparent;
                border: none;
                font-size: 10px;
                color: #9ca3af;
                cursor: pointer;
            ">显示调试信息</button>
            </div>
        `;

        document.body.appendChild(panel);

    panel.querySelector('#oauth-toggle-btn').addEventListener('click', () => {
        if (isAllowed(currentSiteName)) {
            removeAllowedSite(currentSiteName);
        } else {
            saveAllowedSite(currentSiteName);
        }
    });

        panel.querySelector('#oauth-debug-btn').addEventListener('click', () => {
            const debugInfo = document.getElementById('oauth-debug-info');
            if (debugInfo) {
                debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
                const btn = panel.querySelector('#oauth-debug-btn');
                btn.textContent = debugInfo.style.display === 'none' ? '显示调试信息' : '隐藏调试信息';
                if (debugInfo.style.display === 'block') {
                    updateStatusPanel(isAllowed(currentClientId));
                }
            }
        });
    }

    function updateStatusPanel(allowed) {
        const icon = document.getElementById('oauth-status-icon');
        const text = document.getElementById('oauth-status-text');
        const siteName = document.getElementById('oauth-site-name');
        const hint = document.getElementById('oauth-action-hint');
        const toggleBtn = document.getElementById('oauth-toggle-btn');

        if (!icon || !text) return;

        if (allowed) {
            icon.textContent = '✅';
            text.textContent = '已允许';
            text.style.color = '#059669';
            hint.textContent = '下次访问将自动授权';
            toggleBtn.textContent = '移除自动允许';
            toggleBtn.style.background = '#fee2e2';
            toggleBtn.style.borderColor = '#fca5a5';
            toggleBtn.style.color = '#dc2626';
        } else {
            icon.textContent = '⏳';
            text.textContent = '待授权';
            text.style.color = '#d97706';
            hint.textContent = '点击页面上的"允许"按钮将自动记住';
            toggleBtn.textContent = '立即添加自动允许';
            toggleBtn.style.background = '#f3f4f6';
            toggleBtn.style.borderColor = '#d1d5db';
            toggleBtn.style.color = '#4b5563';
        }

        if (currentSiteName) {
            siteName.textContent = currentSiteName;
        }

        const debugInfo = document.getElementById('oauth-debug-info');
        if (debugInfo) {
            const sites = getAllowedSites();
            const savedSite = sites.find(s => s.name === currentSiteName);
            debugInfo.textContent = `网站: ${currentSiteName} | 已保存: ${savedSite ? '是' : '否'} | 总数: ${sites.length}`;
        }

        toggleBtn.style.display = 'block';
    }

    function isAllowButton(element) {
        const text = (element.textContent || element.value || '').toLowerCase().trim();
        console.log('[OAuth Auto] 检查按钮文本:', text);
        const allowKeywords = ['允许', 'authorize', 'approve', '同意', '授权', '确认', '授权登录', '确认授权', '登录', 'login', '登入'];
        const matched = allowKeywords.some(kw => text.includes(kw));
        if (matched) {
            console.log('[OAuth Auto] ✓ 匹配到允许关键词:', text);
        }
        return matched;
    }

    function isDenyButton(element) {
        const text = (element.textContent || element.value || '').toLowerCase().trim();
        const denyKeywords = ['cancel', '取消', '拒绝', 'deny', 'reject', '不同意', 'decline'];
        return denyKeywords.some(kw => text.includes(kw));
    }

function handleButtonClick(e) {
    if (isProcessing) return;

    console.log('[OAuth Auto] 点击事件触发，目标:', e.target.tagName, e.target.textContent?.substring(0, 50));

        const target = e.target.closest('button, input[type="submit"], input[type="button"], a.btn, [class*="btn"], [class*="button"]');
    if (!target) {
        console.log('[OAuth Auto] 未找到按钮元素');
        return;
    }

    console.log('[OAuth Auto] 找到元素:', target.tagName, '|', (target.textContent || target.value || '').substring(0, 50));

    if (isAllowButton(target)) {
        console.log('[OAuth Auto] ✓✓✓ 检测到"允许"按钮，开始保存...');
        isProcessing = true;

        saveAllowedSite(currentSiteName);

        const panel = document.getElementById('oauth-status-panel');
        if (panel) {
            panel.style.transform = 'scale(1.05)';
            setTimeout(() => {
                panel.style.transform = 'scale(1)';
            }, 200);
        }

        setTimeout(() => {
            isProcessing = false;
        }, 1000);
    } else if (isDenyButton(target)) {
        console.log('[OAuth Auto] 检测到"拒绝/取消"按钮');

        if (isAllowed(currentSiteName)) {
            removeAllowedSite(currentSiteName);
        }
    } else {
        console.log('[OAuth Auto] 未匹配到允许/拒绝按钮');
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
                console.log('[OAuth Auto] 自动点击允许按钮:', text);
                btn.click();
                return true;
            }
        }

        console.log('[OAuth Auto] 未找到允许按钮');
        return false;
    }

    function init() {
        currentSiteName = getSiteName();
        if (!currentSiteName || currentSiteName === '未知应用') {
            console.log('[OAuth Auto] 未获取到网站名称，延迟重试...');
            setTimeout(init, 500);
            return;
        }

        console.log('[OAuth Auto] 当前网站:', currentSiteName);

        createStatusPanel();

        const allowed = isAllowed(currentSiteName);
        console.log('[OAuth Auto] 是否已允许:', allowed);

        updateStatusPanel(allowed);

        document.addEventListener('click', handleButtonClick, true);

        if (allowed) {
            console.log('[OAuth Auto] 网站已允许，3秒后自动授权...');
            setTimeout(() => {
                if (isAllowed(currentSiteName)) {
                    autoClickAllow();
                }
            }, 3000);
        }
    }

    GM_registerMenuCommand('📋 查看已允许的OAuth网站', () => {
        const sites = getAllowedSites();
        console.log('[OAuth Auto] 已允许的网站列表:', sites);

        const panel = document.getElementById('oauth-status-panel');
        const existingList = document.getElementById('oauth-sites-list');
        if (existingList) {
            existingList.remove();
            return;
        }

        const listDiv = document.createElement('div');
        listDiv.id = 'oauth-sites-list';
        listDiv.innerHTML = `
            <div style="
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #e5e7eb;
                max-height: 200px;
                overflow-y: auto;
            ">
                ${sites.length === 0 ? '<div style="color: #9ca3af; font-size: 12px;">暂无记录</div>' :
                    sites.map((s, i) => `
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 8px;
                            background: #f9fafb;
                            border-radius: 6px;
                            margin-bottom: 6px;
                            font-size: 12px;
                        ">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 500; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name}</div>
                                <div style="color: #9ca3af; font-size: 10px;">${new Date(s.allowedAt).toLocaleDateString()}</div>
                            </div>
                            <button class="oauth-remove-item" data-index="${i}" style="
                                margin-left: 8px;
                                padding: 4px 8px;
                                background: #fee2e2;
                                border: 1px solid #fca5a5;
                                border-radius: 4px;
                                font-size: 11px;
                                color: #dc2626;
                                cursor: pointer;
                            ">删除</button>
                        </div>
                    `).join('')}
            </div>
        `;

        panel.querySelector('div > div').appendChild(listDiv);

        listDiv.querySelectorAll('.oauth-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const sites = getAllowedSites();
                const removed = sites.splice(idx, 1)[0];
                GM_setValue(STORAGE_KEY, JSON.stringify(sites));
                console.log('[OAuth Auto] 已移除:', removed.name);
                if (removed.name === currentSiteName) {
                    updateStatusPanel(false);
                }
                listDiv.remove();
            });
        });
    });

    GM_registerMenuCommand('🗑️ 清除所有OAuth记录', () => {
        GM_setValue(STORAGE_KEY, '[]');
        console.log('[OAuth Auto] 已清除所有记录');
        updateStatusPanel(false);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
