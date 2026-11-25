import {
  Award,
  CheckCircle2,
  Copy,
  Database,
  Filter,
  LayoutDashboard
} from "lucide-react";
import { AnalysisOverview } from "../../types/dataset";
import { formatNumber } from "../../utils/dataUtils";

interface AnalysisOverviewCardsProps {
  overview: AnalysisOverview;
}

export function AnalysisOverviewCards({ overview }: AnalysisOverviewCardsProps) {
  const statusSlug = overview.overallStatus.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="analysis-metrics-grid">
      <div className="metric-card">
        <div className="metric-top">
          <span>Total records</span>
          <div className="metric-icon purple">
            <Database size={16} />
          </div>
        </div>
        <strong>{formatNumber(overview.totalRecords)}</strong>
        <small>Stored rows in SQLite</small>
      </div>

      <div className="metric-card">
        <div className="metric-top">
          <span>Total columns</span>
          <div className="metric-icon teal">
            <LayoutDashboard size={16} />
          </div>
        </div>
        <strong>{formatNumber(overview.totalColumns)}</strong>
        <small>
          {overview.numericColumns} numeric · {overview.textColumns} text
        </small>
      </div>

      <div className="metric-card">
        <div className="metric-top">
          <span>Missing values</span>
          <div className="metric-icon orange">
            <Filter size={16} />
          </div>
        </div>
        <strong>{formatNumber(overview.missingValues)}</strong>
        <small>{overview.missingPct}% of total cells</small>
      </div>

      <div className="metric-card">
        <div className="metric-top">
          <span>Duplicate records</span>
          <div className="metric-icon indigo">
            <Copy size={16} />
          </div>
        </div>
        <strong>{formatNumber(overview.duplicateRecords)}</strong>
        <small>{overview.duplicatePct}% duplicate rows</small>
      </div>

      <div className="metric-card">
        <div className="metric-top">
          <span>Completeness</span>
          <div className="metric-icon pink">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <strong>{overview.completeness}%</strong>
        <small>Non-empty cell ratio</small>
      </div>

      <div className="metric-card quality-score-card">
        <div className="metric-top">
          <span>Data quality score</span>
          <div className="metric-icon teal">
            <Award size={16} />
          </div>
        </div>
        <div className="quality-score-row">
          <strong>{overview.qualityScore}/100</strong>
          <span className={`status-pill ${statusSlug}`}>{overview.overallStatus}</span>
        </div>
        <small>Composite health rating</small>
      </div>
    </div>
  );
}
