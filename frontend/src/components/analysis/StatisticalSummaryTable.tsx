import { ColumnStat } from "../../types/dataset";
import { formatNumber } from "../../utils/dataUtils";

interface StatisticalSummaryTableProps {
  numericStats: ColumnStat[];
}

function fmtStat(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return formatNumber(value);
}

export function StatisticalSummaryTable({ numericStats }: StatisticalSummaryTableProps) {
  return (
    <section className="panel fields-panel">
      <div className="panel-heading">
        <div>
          <h2>Statistical summary</h2>
          <p>
            Descriptive statistics calculated from valid numeric values across all stored records.
          </p>
        </div>
        <span className="field-count">{numericStats.length} numeric fields</span>
      </div>

      {numericStats.length === 0 ? (
        <div className="analysis-empty-box">
          No numeric columns were detected in this dataset. Statistical metrics require at least one
          numeric field.
        </div>
      ) : (
        <div className="fields-table-wrap">
          <table className="fields-table stats-detail-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Valid Count</th>
                <th>Min</th>
                <th>Max</th>
                <th>Mean</th>
                <th>Median</th>
                <th>Mode</th>
                <th>Sum</th>
                <th>Range</th>
                <th>Std Dev</th>
                <th>Variance</th>
              </tr>
            </thead>
            <tbody>
              {numericStats.map(stat => (
                <tr key={stat.name}>
                  <td>
                    <b>{stat.name}</b>
                  </td>
                  <td>{formatNumber(stat.count ?? 0)}</td>
                  <td>{fmtStat(stat.min)}</td>
                  <td>{fmtStat(stat.max)}</td>
                  <td>{fmtStat(stat.mean)}</td>
                  <td>{fmtStat(stat.median)}</td>
                  <td className="mode-cell" title={stat.mode}>
                    {stat.mode}
                  </td>
                  <td>{fmtStat(stat.sum)}</td>
                  <td>{fmtStat(stat.range)}</td>
                  <td>{fmtStat(stat.stdDev)}</td>
                  <td>{fmtStat(stat.variance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
