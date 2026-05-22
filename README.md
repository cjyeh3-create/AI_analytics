# 📊 AI 數據分析與洞察工具 (AI Data Analytics & Insights Tool)

這是一個現代化、高性能且安全的 **AI 數據分析與動態可視化 Web 應用程式**。使用者只需貼入或上傳標準 CSV 數據，系統便能自動解析資料結構並即時生成多維度的互動式 SVG 圖表，同時透過伺服器端安全的 API 代理直連 Google Gemini AI，為您產出專業且深入的數據分析與商業決策洞察報告。

---

## ✨ 核心特色

1. **📊 多維度自主可視化 (Interactive Charting Engine)**
   - 採用**純原生 SVG 計算繪製**（無第三方圖表庫依賴，體積極輕、加載極快）。
   - 支援 5 種圖表類型自由切換：垂直長條圖 (Bar)、趨勢折線圖 (Line)、滿量面積圖 (Area)、二維散佈圖 (Scatter) 及圓餅分佈圖 (Pie)。
   - 支援滑鼠懸停 (Hover) 的動態資訊框 (Tooltip) 與項目高亮對照 。

2. **🔍 CSV 自動分析與結構統計**
   - 內置強大的 CSV 解析引擎，相容於標準的逗號分隔、引號轉義、換行與極端值。
   - 自動檢測欄位資料型態（分類文字 / 數值型態），並即時分析其統計特徵（非空值數、獨特值計數、平均值、加總等）。

3. **🤖 Gemini AI 智慧報告與商業洞察**
   - 整合先進的 **`gemini-3.5-flash`** 模型，為數據撰寫全方位的專業分析。
   - 支持自定義分析重點偏好（例如：聚焦特定商業痛點或競品策略）。

4. **🔒 企業級無密鑰安全代理架構**
   - 採用前後端分離安全設計，`GEMINI_API_KEY` 僅在伺服器端 (Serverless Function) 運作，**絕不暴露給瀏覽器前端**，提供極佳的密鑰防護。

---

## 🛠️ 技術棧 (Tech Stack)

- **前端框架 (Frontend Core)**：React 19 + TypeScript + Vite 6
- **介面與樣式 (Styling)**：Tailwind CSS v4 + Lucide React (圖標) + React Markdown (報告渲染)
- **雲端與後端 (Serverless / Backend)**：Netlify Functions + Node.js
- **人工智慧核心 (AI Core)**：`@google/genai` (Official SDK) + Gemini 3.5 Flash

---

## 🚀 快速開始 (Local Development)

### 1. 安裝相依套件
在專案根目錄下執行：
```bash
npm install
```

### 2. 設定環境變數
將根目錄中的 `.env.example` 複製一份並命名為 `.env`：
```bash
copy .env.example .env
```
打開 `.env` 檔案，填入您的 **Gemini API 金鑰**：
```env
GEMINI_API_KEY="您的_GEMINI_API_KEY"
APP_URL="http://localhost:8888"
```
> 💡 *您可以前往 [Google AI Studio](https://aistudio.google.com/) 免費申請 Gemini API 金鑰。*

### 3. 啟動本地開發伺服器
```bash
npm run dev
```
啟動成功後，瀏覽器將自動開啟本地網址：
- 服務網址：**`http://localhost:8888`** （由 Netlify CLI 代理運行，包含前端靜態資源與後端 `/api/*` 函數）。

---

## 🌐 雲端生產部署 (Production Deployment)

專案預設已配置好適用於 **Netlify** 的 Serverless 部署設定。

1. **推送至 GitHub / Git 倉庫**
   - 本專案已配置完善的 `.gitignore`，您的私有金鑰 `.env` 絕對不會被提交。

2. **在 Netlify 上建立新網站**
   - 連結您的 Git 倉庫，部署設定將會由 `netlify.toml` 自動讀取：
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`

3. **配置生產環境變數**
   - 在 Netlify 專案後台的前往：**Site configuration** ➔ **Environment variables**
   - 新增變數：
     - Key: `GEMINI_API_KEY`
     - Value: *貼上您的正式 Gemini API 金鑰*

4. **完成部署**：您的網站即刻上線，享有安全的 AI 數據分析功能！
