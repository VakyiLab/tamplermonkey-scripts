# Tampermonkey Scripts

个人随便糊的方便日常使用的油猴脚本们。

## 目录

- [Linux.do OAuth Auto Allow](#linuxdo-oauth-auto-allow)
- [Socks5代理列表国家标识](#socks5代理列表国家标识)

---

## Linux.do OAuth Auto Allow

用于自动处理 Linux.do OAuth 授权页面的脚本。当你访问使用 Linux.do OAuth 登录的第三方网站时，该脚本可以记住你已信任的网站，并在下次访问时自动点击"允许"按钮完成授权。

### 主要特性

- 自动记住已授权的 OAuth 应用
- 右下角显示当前授权状态面板
- 点击状态面板可快速切换自动授权设置
- 支持通过 Tampermonkey 菜单管理已允许的网站列表
- 一键清除所有授权记录

### 使用方法

1. 安装脚本后，访问任意使用 Linux.do OAuth 的网站
2. 在授权页面右下角会出现状态面板
3. 首次授权时手动点击"允许"，脚本会自动记住该网站
4. 下次访问同一网站时将自动完成授权（3秒延迟）

### 菜单命令

- `📋 查看已允许的网站` - 显示所有已授权的网站列表
- `🗑️ 清除所有记录` - 清空所有已保存的授权记录

### 版本说明

| 版本 | 文件 | 说明 |
|------|------|------|
| v2 | `linux-do-oauth-auto-v2.user.js` | **推荐**。优化版，状态面板采用深色毛玻璃风格，UI 更简洁 |
| v1 | `linux-do-oauth-auto.user.js` | 基础版，包含更多 console 日志输出和独立的"显示调试信息"按钮，适合开发调试 |

### 匹配网址

```
https://connect.linux.do/oauth2/authorize*
```

---

## Socks5代理列表国家标识

**文件**: `socks5-proxy-country-label.user.js`  
**版本**: 1.0

### 功能描述

在 [socks5-proxy.github.io](https://socks5-proxy.github.io/) 网站的代理列表中，自动为每个 IP 地址添加国家/地区代码标识（如 US、CN、JP 等），方便快速识别代理服务器所在位置。

### 主要特性

- 自动查询 IP 地址所属国家/地区
- 在 IP 地址左侧显示渐变色国家代码标签
- 内置缓存机制，避免重复查询同一 IP
- 使用 MutationObserver 监听表格变化，支持动态加载的内容
- 查询失败时显示错误标识

### 技术细节

- 使用 [ipinfo.io](https://ipinfo.io/) API 查询 IP 地理位置
- 查询超时时间：5 秒
- 缓存存储在内存中（Map 对象）

### 样式预览

国家标签采用紫色渐变背景设计：

- 正常状态：紫蓝渐变背景
- 加载中：灰色背景
- 查询失败：红色背景，显示 `??`

### 匹配网址

```
https://socks5-proxy.github.io/*
```

---

## 安装方法

1. 首先安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击上方想要使用的脚本文件
3. 点击 "Raw" 按钮或复制脚本内容
4. Tampermonkey 会自动识别并提示安装

## 许可证

MIT License
