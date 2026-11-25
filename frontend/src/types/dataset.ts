export type ColumnType = "Numeric" | "Text";

export interface ColumnStat {
  name: string;
  type: ColumnType | string;
  missing: number;
  unique: number;
  mean: number | null;
  median: number | null;
  mode: string;
  min: number | null;
  max: number | null;
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

export type WorkspaceTab = "Overview" | "Data explorer" | "Insights";

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
