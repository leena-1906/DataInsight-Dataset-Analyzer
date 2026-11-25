import { Sparkles } from "lucide-react";
import { ColumnStat, Dataset } from "../types/dataset";
import { formatNumber } from "../utils/dataUtils";

interface InsightsViewProps {
  stats: ColumnStat[];
  active: Dataset;
  completeness: number;
}

export function InsightsView({ stats, active, completeness }: InsightsViewProps) {
  const numeric = stats.filter(s => s.type === "Numeric");

  return (
    <div className="insights-grid">
      <section className="panel insight-main">
        <div className="insight-header">
          <div className="insight-spark">
            <Sparkles size={20} />
          </div>
          <div>
            <h2>Analysis summary</h2>
            <p>Automated observations from your dataset</p>
          </div>
        </div>

        <div className="insight-item">
          <span className="insight-number">01</span>
          <div>
            <b>Dataset structure</b>
            <p>
              <strong>{formatNumber(active.rowCount)} records</strong> across{" "}
              <strong>{active.columnCount} columns</strong>. We identified {numeric.length} numeric
              fields and {stats.length - numeric.length} text or categorical fields.
            </p>
          </div>
        </div>

        <div className="insight-item">
          <span className="insight-number">02</span>
          <div>
            <b>Data quality</b>
            <p>
              Your dataset is <strong>{completeness}% complete</strong>, with{" "}
              {formatNumber(active.summary.missing)} missing cells and{" "}
              {formatNumber(active.summary.duplicates)} duplicate rows.
            </p>
          </div>
        </div>

        {numeric.map((s, i) => (
          <div className="insight-item" key={s.name}>
            <span className="insight-number">{String(i + 3).padStart(2, "0")}</span>
            <div>
              <b>{s.name} · numeric summary</b>
              <p>
                Values range from{" "}
                <strong>{s.min !== null ? formatNumber(s.min) : "—"}</strong> to{" "}
                <strong>{s.max !== null ? formatNumber(s.max) : "—"}</strong>, with an average of{" "}
                <strong>{s.mean !== null ? formatNumber(s.mean) : "—"}</strong> and median of{" "}
                <strong>{s.median !== null ? formatNumber(s.median) : "—"}</strong>.
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="panel quality-panel">
        <h2>Data quality score</h2>
        <p>Percentage of cells containing a value.</p>
        <div
          className="quality-ring"
          style={{
            background: `conic-gradient(#35b7a4 ${completeness * 3.6}deg,#edf0f6 0deg)`
          }}
        >
          <div>
            <b>{completeness}%</b>
            <span>Complete</span>
          </div>
        </div>
        <div className="quality-row">
          <span>Missing cells</span>
          <b>{formatNumber(active.summary.missing)}</b>
        </div>
        <div className="quality-row">
          <span>Duplicate rows</span>
          <b>{formatNumber(active.summary.duplicates)}</b>
        </div>
        <div className="quality-row">
          <span>Numeric columns</span>
          <b>{numeric.length}</b>
        </div>
      </section>
    </div>
  );
}
