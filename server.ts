import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body limit to handle large CSV datasets
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Initialize Google Gen AI client with AI Studio credentials and custom user-agent
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// System instructions that guide the AI to perform a comprehensive data analysis
const SYSTEM_INSTRUCTIONS = `你是一位專業的高級數據科學家與商業分析師（使用繁體中文）。
你的任務是為使用者貼上的 CSV 數據進行全面、精準、具備商業洞察力的分析。

請務必遵守以下規範與輸出格式：
1. **語系**：請完全使用「繁體中文（台灣地區常用語彙）」進行分析與回覆。例如使用：欄位、列、數據、圖表、數值、比例。
2. **分析架構**：請以清晰層次、直觀易讀的 Markdown 格式輸出。報告必須包含以下五大核心區塊：

   ### 📊 數據集總覽 (Data Overview)
   - 分析總數據筆數（Rows）、欄位（Columns）個數與完整欄位名稱列表。
   - 簡述此數據集反映的核心主題與資料架構。
   - 識別任何潛在的數據缺失、空值（Null/Missing values）或格式異常。

   ### 💡 關鍵指標與核心發現 (Key Performance Indicators & Findings)
   - 計算關鍵指標（如平均值、總和、最大與最小值、佔比等），並提供一個 Markdown 表格呈現。
   - 列出你發現的 3-5 個最具洞察力或最值得注意的「核心關鍵發現」（加粗重點）。
   - 列出顯著的極值（Outliers）或奇特趨勢。

   ### 🔍 多維度交叉分析 (Multi-dimensional Insights)
   - 依據數據欄位，進行時間維度、類別維度或數值相關性的交叉探討，找出背後的關聯性。
   - 深入解釋關鍵欄位之間的因果或關聯效應（例：「當 A 增加時，B 亦隨之增長...」）。

   ### 📈 專業視覺化圖表建議 (Recommended Visualizations)
   - 具體而微地指導使用者：若要製作圖表，應該選擇哪幾種圖表（如長條圖、折線圖、圓餅圖、散佈圖），並明確指定 X 軸與 Y 軸應擺放什麼欄位、用什麼顏色分組、其分析目的為何。

   ### 🎯 實戰策略與行動決策建議 (Actionable Recommendations)
   - 基於上述洞察，提出至少 3 個具體、可行、以數據為驅動的商業與運營策略建議。
   - 這些建議應該要「直接扣合前面的數字發現」，提供高價值、落地可行的操作方向，切忌空洞空泛。

3. **專業態度**：請保持客觀、敘事有條理且重點突出，大量運用 Markdown 表格、區塊引用、粗體、清單，讓報告顯得高端專業。`;

// AI Analysis API endpoint
app.post("/api/analyze", async (req, res) => {
  const { csvData, promptOverride } = req.body;

  if (!csvData || csvData.trim() === "") {
    return res.status(400).json({ error: "請提供 CSV 數據內容！" });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY in environment");
      return res.status(500).json({ 
        error: "伺服器未設定 GEMINI_API_KEY 密鑰，請至右下角的 Secrets 設定面板填入您的 API 密鑰。" 
      });
    }

    const userInstructions = promptOverride && promptOverride.trim() !== ""
      ? `${promptOverride}\n\n以下是待分析的 CSV 數據內容：\n\`\`\`csv\n${csvData}\n\`\`\``
      : `請分析以下 CSV 數據內容，為我撰寫一份最深入的專業分析與數據洞察報告：\n\`\`\`csv\n${csvData}\n\`\`\``;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userInstructions,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS,
        temperature: 0.15, // Keep it highly focused and factual
      }
    });

    const analysisResult = response.text || "無法生成分析結果，請重試。";
    res.json({ result: analysisResult });
  } catch (error: any) {
    console.error("Gemini API error in /api/analyze:", error);
    res.status(500).json({ error: `AI 分析失敗：${error?.message || error || "未知錯誤"}` });
  }
});

// Setup development server with instant HMR fallback & server-side routing
async function setupViteServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Server] Vite development middleware mounted successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Server] Production static file serving mounted at:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Web application running at http://0.0.0.0:${PORT}`);
  });
}

setupViteServer();
