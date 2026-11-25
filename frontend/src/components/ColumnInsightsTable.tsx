import { ColumnStat } from "../types/dataset";
import { formatNumber } from "../utils/dataUtils";

interface ColumnInsightsTableProps {
  stats: ColumnStat[];
}

export function ColumnInsightsTable({ stats }: ColumnInsightsTableProps) {
  return (
    <section className="panel fields-panel">
      <div className="panel-heading">
        <div>
          <h2>Column insights</h2>
          <p>Statistical summary for each field in your dataset.</p>
        </div>
        <span className="field-count">{stats.length} fields</span>
      </div>
      <div className="fields-table-wrap">
        <table className="fields-table">
          <thead>
            <tr>
              <th>Column name</th>
              <th>Type</th>
              <th>Missing</th>
              <th>Unique</th>
              <th>Mean</th>
              <th>Median</th>
              <th>Min</th>
              <th>Max</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.name}>
                <td>
                  <b>{s.name}</b>
                </td>
                <td>
                  <span className={`type-tag ${s.type.toLowerCase()}`}>
                    {s.type === "Numeric" ? "123" : "Aa"} {s.type}
                  </span>
                </td>
                <td>{s.missing ? <span className="warn-number">{formatNumber(s.missing)}</span> : "—"}</td>
                <td>{formatNumber(s.unique)}</td>
                <td>{s.mean === null ? "—" : formatNumber(s.mean)}</td>
                <td>{s.median === null ? "—" : formatNumber(s.median)}</td>
                <td>{s.min === null ? "—" : formatNumber(s.min)}</td>
                <td>{s.max === null ? "—" : formatNumber(s.max)}</td>
                <td className="mode-cell" title={s.mode}>
                  {s.mode}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
