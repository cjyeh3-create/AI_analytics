/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Globe,
  Users,
  Sparkles,
  Play,
  RotateCcw,
  Copy,
  Check,
  FileSpreadsheet,
  AlertCircle,
  UploadCloud,
  ChevronRight,
  Database,
  BarChart3,
  Lightbulb,
  FileText,
  Info
} from 'lucide-react';
import { parseCSV, analyzeColumns } from './utils/csvParser';
import { CSV_TEMPLATES } from './data/templates';
import { ParsedCSV, ChartType } from './types';
import InteractiveChart from './components/InteractiveChart';
import MarkdownRenderer from './components/MarkdownRenderer';

export default function App() {
  const [csvText, setCsvText] = useState<string>("");
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // AI states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // Visualization axes mapping
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [selectedX, setSelectedX] = useState<string>("");
  const [selectedY, setSelectedY] = useState<string>("");

  // Usability state
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active column stats
  const columnMetrics = parsedCSV
    ? analyzeColumns(parsedCSV.headers, parsedCSV.rows)
    : [];

  // Parse CSV text dynamically on change (debounced)
  useEffect(() => {
    if (!csvText.trim()) {
      setParsedCSV(null);
      setErrorMsg("");
      return;
    }

    const timer = setTimeout(() => {
      try {
        const result = parseCSV(csvText);
        if (result.headers.length === 0) {
          setParsedCSV(null);
          return;
        }
        setParsedCSV(result);
        setErrorMsg("");

        // Dynamically auto-suggest X & Y columns
        if (result.headers.length > 0) {
          const metrics = analyzeColumns(result.headers, result.rows);
          const defaultX = result.headers[0];
          const defaultNumericY = metrics.find(m => m.type === 'numeric')?.name || result.headers[1] || result.headers[0];

          setSelectedX(defaultX);
          setSelectedY(defaultNumericY);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg("CSV 格式解析失敗，請確認資料是用逗號(,)分隔。");
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [csvText]);

  // Load select raw template file
  const loadTemplate = (idx: number) => {
    const template = CSV_TEMPLATES[idx];
    setCsvText(template.data);
    setChartType(template.recommendedChartType);
    setSelectedX(template.recommendedX);
    setSelectedY(template.recommendedY);
    setCustomPrompt(template.promptSuggestion);
    // Reset previous AI outputs
    setAnalysisResult("");
  };

  // Reset core app state
  const handleClearAll = () => {
    setCsvText("");
    setParsedCSV(null);
    setAnalysisResult("");
    setCustomPrompt("");
    setErrorMsg("");
  };

  // Drag and Drop files handling
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readCsvFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readCsvFile(e.target.files[0]);
    }
  };

  const readCsvFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrorMsg("不支援的文件格式，請僅貼上或上傳標準 .csv 文件。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setCsvText(text);
        setErrorMsg("");
      }
    };
    reader.onerror = () => {
      setErrorMsg("讀取檔案失敗。");
    };
    reader.readAsText(file, "utf-8");
  };

  // Run AI deep analyzer
  const handleStartAnalysis = async () => {
    if (!csvText.trim()) {
      setErrorMsg("請先輸入、贴上 CSV 數據或點擊下方載入範例。");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult("");
    setErrorMsg("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csvData: csvText,
          promptOverride: customPrompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "生成失敗，請重試。");
      }

      setAnalysisResult(data.result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "無法與伺服器分析 API 建立連接，請確認密鑰配置。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Format Copy to Clipboard
  const handleCopyToClipboard = async () => {
    if (!analysisResult) return;
    try {
      await navigator.clipboard.writeText(analysisResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      {/* Navbar Banner */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 backdrop-blur-md px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Sparkles className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                AI 數據分析與洞察工具
              </h1>
              <p className="text-xs text-slate-500 font-sans">
                貼上 CSV 資料，由 Google Gemini AI 自動進行多維度數據分析與洞察
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1">
              <span className="block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              繁體中文專業版
            </span>
            <span className="text-xs text-slate-400 font-mono">
              v1.2.0 (Gemini 3.5 Flash)
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-8">
        
        {/* Step 1 & Templates Section */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">1</span>
                貼上數據或選擇精選範本
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                您可以直接輸入 CSV 文字、拖曳檔案，或採用下方預設的高品質業務範本作嘗試。
              </p>
            </div>
            {csvText && (
              <button
                onClick={handleClearAll}
                className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                清空與重置
              </button>
            )}
          </div>

          {/* Preset Templates Panels */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              快速測驗精選範本：
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CSV_TEMPLATES.map((item, idx) => {
                const getIcon = (iconName: string) => {
                  if (iconName === "TrendingUp") return <TrendingUp className="w-5 h-5 text-blue-500" />;
                  if (iconName === "Globe") return <Globe className="w-5 h-5 text-indigo-500" />;
                  return <Users className="w-5 h-5 text-emerald-500" />;
                };

                return (
                  <button
                    key={idx}
                    onClick={() => loadTemplate(idx)}
                    className="flex text-left items-start gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="shrink-0 p-2.5 rounded-lg bg-slate-50 group-hover:bg-white transition-colors border border-slate-100">
                      {getIcon(item.icon)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-500 leading-normal mt-1">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-xl border-2 border-dashed transition-all p-4 flex flex-col gap-4 ${
              dragActive
                ? "border-blue-500 bg-blue-50/40"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex justify-between items-center text-xs text-slate-400 font-bold mb-1">
              <span>貼上逗號分隔 (CSV) 數據文字：</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                瀏覽並上傳 CSV 檔案
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="季度,產品類別,銷售額,訂單數量,客戶滿意度&#10;2025-Q1,智慧家電,1250000,850,4.6&#10;2025-Q1,行動通訊,3420000,2100,4.8"
              className="w-full min-h-[160px] max-h-[300px] p-4 font-mono text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all resize-y"
            />

            {/* Error notifications */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Instant Data Visualizations */}
        {parsedCSV && (
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">2</span>
                  資料即時預覽與自主可視化
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  系統已將您的 CSV 資料進行格式化與多維度統計，您可於此自選欄位產生專利圖表。
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
                <Database className="w-3.5 h-3.5" />
                已自動解析：{parsedCSV.rows.length} 筆資料
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Visual Settings & Visual Graph */}
              <div className="lg:col-span-8 flex flex-col gap-6 border-r border-slate-100 lg:pr-8">
                {/* Axes Selector controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500">圖表呈現類型 (Type)</label>
                    <select
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value as ChartType)}
                      className="text-xs border border-slate-200 bg-white p-2 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                    >
                      <option value="bar">📊 垂直長條圖 (Bar Chart)</option>
                      <option value="line">📈 趨勢折線圖 (Line Chart)</option>
                      <option value="area">🎨 滿量面積圖 (Area Chart)</option>
                      <option value="scatter">⚪ 二維散佈圖 (Scatter Plot)</option>
                      <option value="pie">🍕 圓餅分佈圖 (Pie Chart)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500">X 軸指標 (X-Axis Category)</label>
                    <select
                      value={selectedX}
                      onChange={(e) => setSelectedX(e.target.value)}
                      className="text-xs border border-slate-200 bg-white p-2 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                    >
                      {parsedCSV.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500">Y 軸數值 (Y-Axis Value)</label>
                    <select
                      value={selectedY}
                      onChange={(e) => setSelectedY(e.target.value)}
                      className="text-xs border border-slate-200 bg-white p-2 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                    >
                      {parsedCSV.headers.map((header) => {
                        const metric = columnMetrics.find((m) => m.name === header);
                        const isNumericText = metric?.type === "numeric" ? " (數值)" : " (文字)";
                        return (
                          <option key={header} value={header}>
                            {header} {isNumericText}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* SVG Visual Chart Panel */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      數據圖表預覽
                    </span>
                    <span className="text-xs text-slate-500">
                      X軸: <span className="font-semibold text-slate-800">{selectedX}</span> | Y軸: <span className="font-semibold text-slate-800">{selectedY}</span>
                    </span>
                  </div>
                  <InteractiveChart
                    headers={parsedCSV.headers}
                    rows={parsedCSV.rows}
                    selectedX={selectedX}
                    selectedY={selectedY}
                    chartType={chartType}
                  />
                </div>
              </div>

              {/* Right Column: Mini Spreadsheet & Auto Metrics Column list */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                    欄位結構統計特徵 (Columns)
                  </h3>
                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {columnMetrics.map((col, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-700 truncate max-w-[150px]">{col.name}</span>
                          <span className="text-[10px] text-slate-400">
                            非空值: {parsedCSV.rows.length - col.nullCount} | 獨特值: {col.uniqueValues}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end shrink-0">
                          <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ${
                            col.type === 'numeric' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                            {col.type === 'numeric' ? '數值資料' : '分類文字'}
                          </span>
                          {col.type === 'numeric' && col.mean !== undefined && (
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              均值: {col.mean.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Micro Spreadsheet Grid table */}
                <div className="flex flex-col flex-1 min-h-[180px]">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    前 6 筆數據明細
                  </h3>
                  <div className="flex-1 overflow-x-auto border border-slate-200/80 rounded-xl max-h-[160px] shadow-2xs">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          {parsedCSV.headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left font-bold text-slate-600 border-b border-slate-200">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {parsedCSV.rows.slice(0, 6).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/50">
                            {parsedCSV.headers.map((h, hIdx) => (
                              <td key={hIdx} className="px-3 py-2 text-slate-500 font-mono truncate max-w-[124px]">
                                {row[h]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedCSV.rows.length > 6 && (
                    <span className="text-[10px] text-slate-400 text-right mt-1.5 italic">
                      額外 {parsedCSV.rows.length - 6} 筆資料已隱藏，數據將在 AI 呼叫中完整分析。
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Step 3: AI Configuration Details & Start Analysis button */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">3</span>
              設定 AI 分析提示與著眼點
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              透過給予 AI 進一步描述或問題，指定 AI 着重探討的重點（如：指定高、低谷，或進行競品分析建議）。
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>自定義分析重點偏好（選填，寫下您關心的焦點）：</span>
              </div>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="例如：「請聚焦在如何解決最關鍵的痛點，並提出預算內的行銷對策建議。」"
                className="text-xs p-3 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 bg-slate-50/50 focus:bg-white"
              />
            </div>

            {/* Submit active actions */}
            <div className="flex justify-between items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mt-2">
              <div className="flex items-start gap-2.5 max-w-[65%] text-xs text-slate-500 leading-normal">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  本工具在伺服器端（Secure Server）直連呼叫 <strong>Gemini 3.5 Flash</strong> 模型，不會在瀏覽器暴露出您的個人或專利 API 密鑰。
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || !csvText.trim()}
                className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 ${
                  isAnalyzing || !csvText.trim()
                    ? "bg-slate-400 shadow-none cursor-not-allowed opacity-80"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/10 cursor-pointer"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>智慧分析中...請稍候</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>開始 AI 智慧數據分析</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* AI Insight Report Result Section */}
        {analysisResult && (
          <section className="bg-white rounded-2xl border border-blue-100 p-6 md:p-8 shadow-sm flex flex-col gap-6 animate-fade-in relative scroll-mt-24" id="ai-report-view">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                  Gemini AI 多維數據智慧報告
                </h2>
                <span className="text-xs text-slate-400 mt-1 block">
                  報告生成時間：{new Date().toLocaleDateString("zh-TW", { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-2 self-stretch md:self-auto">
                <button
                  onClick={handleCopyToClipboard}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex-1 md:flex-initial ${
                    copied
                      ? "bg-slate-900 text-white border-slate-950"
                      : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>已複製報告！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>一鍵複製報告內容</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Rendered report output */}
            <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100">
              <MarkdownRenderer content={analysisResult} />
            </div>

            {/* Bottom notification */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
              <span>此 AI 報告由先進深度學習引擎即時解算，分析結果僅供商業決策規劃參考。</span>
              <span className="font-mono">Google Gen AI Powered</span>
            </div>
          </section>
        )}

      </main>

      {/* Footer bar */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-center text-xs text-slate-500 font-sans">
        <p>© 2026 AI 數據分析與洞察工具. 保留所有權利。高敏捷無密鑰安全代理架構。</p>
      </footer>
    </div>
  );
}
