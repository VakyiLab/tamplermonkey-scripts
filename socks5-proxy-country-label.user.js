// ==UserScript==
// @name         Socks5代理列表国家标识
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在 socks5-proxy.github.io 的 IP 地址左侧添加国家2字母缩写
// @author       tampermonkey
// @match        https://socks5-proxy.github.io/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect ipinfo.io
// ==/UserScript==

(function() {
    'use strict';

    // IP缓存，避免重复请求
    const countryCache = new Map();

    // 添加样式
    GM_addStyle(`
        .ip-country {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
            margin-right: 6px;
            display: inline-block;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .ip-country.loading {
            background: #95a5a6;
        }
        .ip-country.error {
            background: #e74c3c;
        }
    `);

    // 从 ip-api.com 获取国家代码
    function fetchCountryCode(ip, callback) {
        // 检查缓存
        if (countryCache.has(ip)) {
            callback(countryCache.get(ip));
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: `https://ipinfo.io/${ip}/country`,
            timeout: 5000,
            onload: function(response) {
                const code = response.responseText.trim() || '??';
                countryCache.set(ip, code);
                callback(code);
            },
            onerror: function() {
                countryCache.set(ip, '??');
                callback('??');
            },
            ontimeout: function() {
                countryCache.set(ip, '??');
                callback('??');
            }
        });
    }

    // 处理单个IP单元格
    function processIpCell(cell) {
        // 如果已经处理过了，跳过
        if (cell.querySelector('.ip-country')) {
            return;
        }

        const ip = cell.textContent.trim();
        if (!ip || !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
            return;
        }

        // 创建国家代码标签
        const countrySpan = document.createElement('span');
        countrySpan.className = 'ip-country loading';
        countrySpan.textContent = '...';

        // 清空单元格并重新构建
        cell.innerHTML = '';
        cell.appendChild(countrySpan);

        const ipSpan = document.createElement('span');
        ipSpan.textContent = ip;
        ipSpan.style.display = 'inline';
        cell.appendChild(ipSpan);

        // 获取国家代码
        fetchCountryCode(ip, function(code) {
            countrySpan.classList.remove('loading');
            countrySpan.textContent = code;

            if (code === '??') {
                countrySpan.classList.add('error');
            }
        });
    }

    // 处理所有IP单元格
    function processAllIps() {
        const ipCells = document.querySelectorAll('td.ip');
        ipCells.forEach(cell => {
            processIpCell(cell);
        });
    }

    // 初始处理
    processAllIps();

    // 使用 MutationObserver 监听表格变化（应对动态加载）
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查是否是 tr 元素或包含 tr 元素
                        if (node.matches && node.matches('tr')) {
                            const ipCell = node.querySelector('td.ip');
                            if (ipCell) {
                                processIpCell(ipCell);
                            }
                        }
                        // 如果是 tbody，处理其所有行
                        if (node.tagName === 'TBODY') {
                            const rows = node.querySelectorAll('tr');
                            rows.forEach(row => {
                                const ipCell = row.querySelector('td.ip');
                                if (ipCell) {
                                    processIpCell(ipCell);
                                }
                            });
                        }
                    }
                });
            }
        });
    });

    // 开始监听
    const table = document.querySelector('table');
    if (table) {
        observer.observe(table, {
            childList: true,
            subtree: true
        });
    }

    console.log('[Socks5代理国家标识] 脚本已加载');
})();
