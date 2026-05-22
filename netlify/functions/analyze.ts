import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTIONS = `你是一位專業的資料分析師。
你的任務是接收一段 CSV 或表格結構的原始數據，理解其欄位意義，並提出精確的摘要報告與洞察。

請務必嚴格遵循以下 Markdown 輸出格式：

### 1. 📊 資料概況與欄位理解
簡要說明這份資料的主題是什麼，並列出關鍵欄位的意義。

### 2. ⚠️ 異常與缺值檢查
檢查資料中是否有空白（例如缺少數量或金額）、極端值（例如不合理的高價），並將發現的異常項目條列出來。若無異常，說明「未發現明顯異常」。

### 3. 📈 統計與趨勢洞察
請回答以下問題的總結：
- **總計概況**：銷售數量或總金額的大概加總。
- **分類表現**：哪個業務員或哪項產品表現最好？
- **業務建議**：從數據中給出 1-2 個可以執行的商業建議。

請以 Markdown 格式輸出，所有繁體中文部分必須使用**繁體中文**回覆，不要包含任何額外的問候語或結語。`;

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { csvData, promptOverride } = await req.json();

    if (!csvData || csvData.trim() === "") {
      return new Response(JSON.stringify({ error: "請提供 CSV 數據內容！" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ 
        error: "伺服器未設定 GEMINI_API_KEY 密鑰，請在專案後台或 .env 檔案中設定您的 GEMINI_API_KEY。" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Initialize Google Gen AI client
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });

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
    return new Response(JSON.stringify({ result: analysisResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Gemini API error in Netlify Function:", error);
    return new Response(JSON.stringify({ 
      error: `AI 分析失敗：${error?.message || error || "未知錯誤"}` 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
