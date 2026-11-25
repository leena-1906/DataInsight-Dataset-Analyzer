import { CheckCircle2, Database, FileSpreadsheet, Filter, LayoutDashboard } from "lucide-react";
import { Dataset } from "../types/dataset";
import { formatNumber } from "../utils/dataUtils";

interface MetricCardsProps {
  datasets: Dataset[];
  active: Dataset;
  completeness: number;
  numericCount: number;
}

export function MetricCards({
  datasets,
  active,
  completeness,
  numericCount
}: MetricCardsProps) {
  const totalWorkspaceRecords = datasets.reduce((sum, d) => sum + d.rowCount, 0);
  const textCount = Math.max(0, active.columnCount - numericCount);

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-top">
          <span>Total datasets</span>
          <div className="metric-icon indigo">
            <FileSpreadsheet size={16} />
          </div>
        </div>
        <strong>{formatNumber(datasets.length)}</strong>
        <small>{formatNumber(totalWorkspaceRecords)} total rows in SQLite</small>
      </div>

      <div className="metric-card">
        <div className="metric-top">
          <span>Total records</span>
          <div className="metric-icon purple">
            <Database size={16} />
          </div>
        </div>
        <strong>{formatNumber(active.rowCount)}</strong>
        <small>
          {active.summary.duplicates
            ? `${formatNumber(active.summary.duplicates)} duplicate rows`
            : "Rows in active dataset"}
        </small>
      </div>

      <div className="metric-card">
        <div className="metric-top">
          <span>Total columns</span>
          <div className="metric-icon teal">
            <LayoutDashboard size={16} />
          </div>
        </div>
        <strong>{formatNumber(active.columnCount)}</strong>
        <small>
          {numericCount} numeric · {textCount} text
        </small>
      </div>

      <div className="metric-card">
        <div className="metric-top">
          <span>Missing values</span>
          <div className="metric-icon orange">
            <Filter size={16} />
          </div>
        </div>
        <strong>{formatNumber(active.summary.missing)}</strong>
        <small>{active.summary.missing ? "Empty or null cells" : "No missing data found"}</small>
      </div>

      <div className="metric-card">
        <div className="metric-top">
          <span>Completeness</span>
          <div className="metric-icon pink">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <strong>{completeness}%</strong>
        <small>Based on non-empty cells</small>
      </div>
    </div>
  );
}
