import { AggregationType, ColumnStat, Dataset } from "../types/dataset";

export const CHART_COLORS = [
  "#6c63ff",
  "#35b7a4",
  "#f5a94b",
  "#e879a5",
  "#4d9de0",
  "#9b8af7",
  "#2ec4b6",
  "#ff8c69"
];

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

export const formatCompactNumber = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(n);
};

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function findCategoricalColumn(
  columns: string[],
  stats: ColumnStat[],
  rows: Record<string, string>[]
): string | null {
  if (!columns.length) return null;

  const exactCategory = columns.find(c => c.trim().toLowerCase() === "category");
  if (exactCategory) return exactCategory;

  const containsCategory = columns.find(c => /category|categories/i.test(c.trim()));
  if (containsCategory) return containsCategory;

  const DATE_NAME_REGEX = /(^|_|\b)(date|time|timestamp|datetime|day|month|year|created_?at|updated_?at)($|_|\b)/i;
  const ID_NAME_REGEX = /(^|_|\b)(id|uuid|guid|code|pk|fk|index|key|hash|token)($|_|\b)/i;
  const DATE_VAL_REGEX = /^\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?)?\s*$/i;

  const candidates = columns.filter(col => {
    const colTrimmed = col.trim();
    const stat = stats.find(s => s.name === col);
    if (stat && stat.type === "Numeric") return false;
    if (DATE_NAME_REGEX.test(colTrimmed)) return false;
    if (ID_NAME_REGEX.test(colTrimmed)) return false;

    const sampleValues = rows
      .map(r => String(r[col] ?? "").trim())
      .filter(v => v !== "")
      .slice(0, 30);

    if (sampleValues.length > 0) {
      const dateMatches = sampleValues.filter(v => DATE_VAL_REGEX.test(v)).length;
      if (dateMatches / sampleValues.length >= 0.5) return false;
    }

    if (stat && stat.unique <= 1) return false;
    if (stat && rows.length > 3 && stat.unique === rows.length) return false;
    return true;
  });

  if (!candidates.length) {
    // Fallback to first text column if no strict categorical column matched
    const firstText = columns.find(c => stats.find(s => s.name === c)?.type !== "Numeric");
    return firstText ?? columns[0] ?? null;
  }

  const CAT_KEYWORDS = /(^|_|\b)(type|segment|group|genre|status|department|class|tier|region|country|city|state|gender|brand|vendor|industry|priority|channel|role|grade|subject)($|_|\b)/i;
  const keywordMatch = candidates.find(c => CAT_KEYWORDS.test(c.trim()));
  if (keywordMatch) return keywordMatch;

  candidates.sort((a, b) => {
    const sA = stats.find(s => s.name === a)?.unique ?? 999;
    const sB = stats.find(s => s.name === b)?.unique ?? 999;
    return sA - sB;
  });

  return candidates[0] ?? null;
}

export function getDefaultChartConfig(
  dataset: Dataset,
  rows: Record<string, string>[]
): { xAxis: string; yAxis: string; aggregation: AggregationType } {
  const stats = dataset.summary.stats;
  const numericCols = stats.filter(s => s.type === "Numeric").map(s => s.name);
  const textCols = stats.filter(s => s.type !== "Numeric").map(s => s.name);

  // Prefer a categorical/date/label column for X-axis
  const xAxis =
    textCols.find(c => /month|date|time|day|year/i.test(c)) ||
    findCategoricalColumn(dataset.columns, stats, rows) ||
    textCols[0] ||
    dataset.columns[0] ||
    "";

  const yAxis = numericCols[0] || "__count__";
  const xStat = stats.find(s => s.name === xAxis);
  const hasDuplicatesOnX = xStat ? xStat.unique < dataset.rowCount : false;
  const aggregation: AggregationType =
    yAxis === "__count__" ? "count" : hasDuplicatesOnX ? "sum" : "none";

  return { xAxis, yAxis, aggregation };
}

export function truncateLabel(label: string, maxLen = 14): string {
  if (label.length <= maxLen) return label;
  return `${label.slice(0, maxLen - 1)}…`;
}
