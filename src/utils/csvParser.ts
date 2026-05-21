import { ParsedCSV, ColumnMetric } from '../types';

/**
 * Resilient CSV Parser that handles standard separators, quotes, and newlines.
 */
export function parseCSV(rawText: string): ParsedCSV {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];
    const nextChar = rawText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped double quotes inside quotes
        currentLine += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\n' || char === '\r') {
      if (inQuotes) {
        currentLine += char;
      } else {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip LF if CRLF
        }
        lines.push(currentLine);
        currentLine = '';
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Filter out empty lines
  const nonEmptyLines = lines.map(l => l.trim()).filter(l => l.length > 0);
  if (nonEmptyLines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parser helper for fields of each csv row
  const parseFields = (line: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let insideInputQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        insideInputQuotes = !insideInputQuotes;
      } else if (c === ',' && !insideInputQuotes) {
        fields.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = parseFields(nonEmptyLines[0]).map(h => h.replace(/^"(.*)"$/, '$1'));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < nonEmptyLines.length; i++) {
    const fields = parseFields(nonEmptyLines[i]).map(f => f.replace(/^"(.*)"$/, '$1'));
    const rowObj: Record<string, string> = {};

    headers.forEach((header, index) => {
      rowObj[header] = fields[index] !== undefined ? fields[index] : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Iterates through rows to determine categorical vs numerical distributions and statistical ranges
 */
export function analyzeColumns(headers: string[], rows: Record<string, string>[]): ColumnMetric[] {
  return headers.map(header => {
    let numericCount = 0;
    let nullCount = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    const uniqueValuesSet = new Set<string>();

    rows.forEach(row => {
      const val = row[header];
      if (val === undefined || val === null || val.trim() === '') {
        nullCount++;
      } else {
        const cleanVal = val.trim();
        uniqueValuesSet.add(cleanVal);
        const cleanedValForNumber = cleanVal.replace(/[\$,%\s]/g, '');
        const num = Number(cleanedValForNumber);
        if (cleanVal !== '' && !isNaN(num)) {
          numericCount++;
          sum += num;
          if (num < min) min = num;
          if (num > max) max = num;
        }
      }
    });

    const nonNullCount = rows.length - nullCount;
    const isNumeric = numericCount > 0 && (numericCount / (nonNullCount || 1)) > 0.5;

    return {
      name: header,
      type: isNumeric ? 'numeric' : 'categorical',
      uniqueValues: uniqueValuesSet.size,
      nullCount,
      min: isNumeric && min !== Infinity ? min : undefined,
      max: isNumeric && max !== -Infinity ? max : undefined,
      mean: isNumeric && numericCount > 0 ? parseFloat((sum / numericCount).toFixed(2)) : undefined,
      sum: isNumeric ? parseFloat(sum.toFixed(2)) : undefined
    };
  });
}
