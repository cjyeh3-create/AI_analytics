/**
 * TypeScript Type Definitions for AI Data Analysis Tool
 */

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  errors?: string[];
}

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';

export interface ColumnMetric {
  name: string;
  type: 'numeric' | 'categorical' | 'empty';
  uniqueValues: number;
  nullCount: number;
  min?: number;
  max?: number;
  mean?: number;
  sum?: number;
}

export interface CSVTemplate {
  name: string;
  description: string;
  icon: string;
  data: string;
  recommendedX: string;
  recommendedY: string;
  recommendedChartType: ChartType;
  promptSuggestion: string;
}
