import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { QualityReport, QualityStatus } from "../../types/dataset";
import { formatNumber } from "../../utils/dataUtils";

interface DataQualityReportProps {
  quality: QualityReport;
}

function StatusBadge({ status }: { status: QualityStatus }) {
  const slug = status.toLowerCase().replace(/\s+/g, "-");
  const Icon =
    status === "Good"
      ? CheckCircle2
      : status === "Warning"
        ? AlertTriangle
        : ShieldAlert;

  return (
    <span className={`status-pill ${slug}`}>
      <Icon size={12} />
      <span>{status}</span>
    </span>
  );
}

export function DataQualityReport({ quality }: DataQualityReportProps) {
  return (
    <section className="panel quality-report-panel">
      <div className="panel-heading">
        <div>
          <h2>Data quality report</h2>
          <p>
            Automated checks for missing values, duplicate rows, empty columns, and data type
            consistency.
          </p>
        </div>
        <StatusBadge status={quality.overallStatus} />
      </div>

      <div className="quality-checks-grid">
        {quality.checks.map(check => (
          <div key={check.id} className="quality-check-card">
            <div className="quality-check-top">
              <span className="quality-check-label">{check.label}</span>
              <StatusBadge status={check.status} />
            </div>
            <strong className="quality-check-val">{check.value}</strong>
            <p className="quality-check-detail">{check.detail}</p>
          </div>
        ))}
      </div>

      <div className="fields-table-wrap">
        <table className="fields-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th>Populated</th>
              <th>Missing</th>
              <th>Missing %</th>
              <th>Unique</th>
              <th>Type Mismatches</th>
              <th>Status</th>
              <th>Findings</th>
            </tr>
          </thead>
          <tbody>
            {quality.columnChecks.map(col => (
              <tr key={col.column}>
                <td>
                  <b>{col.column}</b>
                </td>
                <td>
                  <span className={`type-tag ${col.type.toLowerCase()}`}>
                    {col.type === "Numeric" ? "123" : "Aa"} {col.type}
                  </span>
                </td>
                <td>{formatNumber(col.nonEmptyCount)}</td>
                <td>
                  {col.missing > 0 ? (
                    <span className="warn-number">{formatNumber(col.missing)}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td>{col.missingPct}%</td>
                <td>{formatNumber(col.unique)}</td>
                <td>
                  {col.inconsistentCount > 0 ? (
                    <span
                      className="warn-number"
                      title={
                        col.inconsistentSamples.length
                          ? `Examples: ${col.inconsistentSamples.join(", ")}`
                          : undefined
                      }
                    >
                      {formatNumber(col.inconsistentCount)}
                    </span>
                  ) : (
                    "0"
                  )}
                </td>
                <td>
                  <StatusBadge status={col.status} />
                </td>
                <td className="quality-note-cell">
                  {col.note}
                  {col.inconsistentSamples.length > 0 && (
                    <span className="sample-mismatch">
                      {" "}
                      (e.g. {col.inconsistentSamples.join(", ")})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
