export type ColumnType = "Numeric" | "Text";

export interface ColumnStat {
  name: string;
  type: ColumnType | string;
  count?: number;
  nonEmptyCount?: number;
  missing: number;
  missingPct?: number;
  unique: number;
  isEmptyColumn?: boolean;
  inconsistentCount?: number;
  inconsistentSamples?: string[];
  mean: number | null;
  median: number | null;
  mode: string;
  modeCount?: number;
  min: number | null;
  max: number | null;
  sum?: number | null;
  range?: number | null;
  stdDev?: number | null;
  variance?: number | null;
}

export interface DatasetSummary {
  stats: ColumnStat[];
  missing: number;
  duplicates: number;
}

export interface Dataset {
  id: number;
  name: string;
  createdAt: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  summary: DatasetSummary;
  rows?: Record<string, string>[];
  totalRows?: number;
}

export type WorkspaceTab = "Overview" | "Data analysis" | "Data explorer" | "Insights";

export type QualityStatus = "Good" | "Warning" | "Needs Attention";

export interface AnalysisOverview {
  totalRecords: number;
  totalColumns: number;
  numericColumns: number;
  textColumns: number;
  missingValues: number;
  missingPct: number;
  duplicateRecords: number;
  duplicatePct: number;
  completeness: number;
  qualityScore: number;
  overallStatus: QualityStatus;
}

export interface QualityCheckItem {
  id: string;
  label: string;
  status: QualityStatus;
  value: string;
  detail: string;
}

export interface ColumnQualityCheck {
  column: string;
  type: string;
  nonEmptyCount: number;
  missing: number;
  missingPct: number;
  unique: number;
  isEmptyColumn: boolean;
  inconsistentCount: number;
  inconsistentSamples: string[];
  status: QualityStatus;
  note: string;
}

export interface QualityReport {
  completeness: number;
  missingPct: number;
  duplicatePct: number;
  emptyColumns: string[];
  inconsistentColumnCount: number;
  qualityScore: number;
  overallStatus: QualityStatus;
  checks: QualityCheckItem[];
  columnChecks: ColumnQualityCheck[];
}

export interface HistogramBin {
  range: string;
  min: number;
  max: number;
  count: number;
}

export interface CategoryFrequencyItem {
  label: string;
  count: number;
  percentage: number;
}

export interface CategoryFrequencySummary {
  column: string;
  totalValid: number;
  uniqueCount: number;
  top5: CategoryFrequencyItem[];
  distribution: CategoryFrequencyItem[];
}

export interface MissingColumnStat {
  column: string;
  missing: number;
  valid: number;
  missingPct: number;
}

export interface NumericComparisonItem {
  column: string;
  min: number;
  mean: number;
  median: number;
  max: number;
  sum: number;
  stdDev: number;
}

export interface AnalysisInsight {
  id: string;
  title: string;
  tone: "positive" | "info" | "warning" | "alert";
  metric: string;
  description: string;
}

export interface DatasetAnalysis {
  dataset: {
    id: number;
    name: string;
    createdAt: string;
    rowCount: number;
    columnCount: number;
    numericColumnsCount: number;
    textColumnsCount: number;
    columns: string[];
  };
  overview: AnalysisOverview;
  numericStats: ColumnStat[];
  columnStats: ColumnStat[];
  quality: QualityReport;
  distributions: {
    selectedNumericCol: string;
    numericColumns: string[];
    numericHistogram: HistogramBin[];
    selectedCategoryCol: string;
    categoryColumns: string[];
    categoryFrequency: CategoryFrequencySummary;
    missingByColumn: MissingColumnStat[];
    numericComparison: NumericComparisonItem[];
  };
  insights: AnalysisInsight[];
}

export type ChartType = "bar" | "line" | "pie" | "donut";

export type AggregationType = "none" | "sum" | "avg" | "count";

export interface ChartDataPoint {
  label: string;
  value: number;
  count: number;
}

export interface ChartResponse {
  datasetId: number;
  xAxis: string;
  yAxis: string;
  aggregation: AggregationType;
  totalPoints: number;
  skippedInvalidCount: number;
  isNumericY: boolean;
  data: ChartDataPoint[];
}

export interface RecordsResponse {
  datasetId: number;
  total: number;
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  rows: Record<string, string>[];
}

export interface SampleDatasetInfo {
  id: string;
  name: string;
  filename: string;
  category: string;
  description: string;
  columns: string[];
  rowCount: number;
}
