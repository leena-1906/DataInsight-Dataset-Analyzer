import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DatasetAnalysis } from "../../types/dataset";
import {
  CHART_COLORS,
  formatCompactNumber,
  formatNumber,
  truncateLabel
} from "../../utils/dataUtils";

interface DistributionAnalysisSectionProps {
  distributions: DatasetAnalysis["distributions"];
  onChangeNumericCol: (col: string) => void;
  onChangeCategoryCol: (col: string) => void;
}

type ComparisonMetric = "mean" | "median" | "max" | "min" | "sum" | "stdDev";

const METRIC_LABELS: Record<ComparisonMetric, string> = {
  mean: "Mean",
  median: "Median",
  max: "Maximum",
  min: "Minimum",
  sum: "Sum",
  stdDev: "Std Dev"
};

export function DistributionAnalysisSection({
  distributions,
  onChangeNumericCol,
  onChangeCategoryCol
}: DistributionAnalysisSectionProps) {
  const [comparisonMetric, setComparisonMetric] = useState<ComparisonMetric>("mean");

  const {
    selectedNumericCol,
    numericColumns,
    numericHistogram,
    selectedCategoryCol,
    categoryColumns,
    categoryFrequency,
    missingByColumn,
    numericComparison
  } = distributions;

  const hasAnyMissing = missingByColumn.some(c => c.missing > 0);

  return (
    <div className="analysis-charts-grid">
      {/* 1. Numeric Column Distribution */}
      <section className="panel analysis-chart-card">
        <div className="panel-heading">
          <div>
            <h2>Numeric distribution</h2>
            <p>
              {selectedNumericCol
                ? `Value frequency buckets for ${selectedNumericCol}`
                : "No numeric column available"}
            </p>
          </div>
          {numericColumns.length > 0 && (
            <select
              className="mini-select"
              value={selectedNumericCol}
              onChange={e => onChangeNumericCol(e.target.value)}
              aria-label="Select numeric column for distribution"
            >
              {numericColumns.map(col => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="analysis-chart-box">
          {numericHistogram.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={numericHistogram} margin={{ top: 12, right: 12, left: 0, bottom: 14 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f6" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 10, fill: "#7d8499" }}
                  tickFormatter={v => truncateLabel(String(v), 13)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#7d8499" }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  cursor={{ fill: "rgba(112, 104, 237, 0.06)" }}
                  contentStyle={{
                    border: "1px solid #e6e8f2",
                    borderRadius: 12,
                    fontSize: 12
                  }}
                  formatter={(value: number | string) => [
                    `${formatNumber(Number(value))} records`,
                    "Frequency"
                  ]}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  name={`${selectedNumericCol} frequency`}
                  dataKey="count"
                  fill="#7068ed"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No numeric distribution data available.</div>
          )}
        </div>
      </section>

      {/* 2. Category Frequency + Top 5 */}
      <section className="panel analysis-chart-card">
        <div className="panel-heading">
          <div>
            <h2>Category frequency & Top 5</h2>
            <p>
              {selectedCategoryCol
                ? `${categoryFrequency.uniqueCount} unique values in ${selectedCategoryCol}`
                : "No column selected"}
            </p>
          </div>
          {categoryColumns.length > 0 && (
            <select
              className="mini-select"
              value={selectedCategoryCol}
              onChange={e => onChangeCategoryCol(e.target.value)}
              aria-label="Select column for category frequency"
            >
              {categoryColumns.map(col => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          )}
        </div>

        {categoryFrequency.distribution.length > 0 ? (
          <div className="category-split">
            <div className="analysis-chart-box compact">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryFrequency.distribution}
                  margin={{ top: 10, right: 10, left: 0, bottom: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#7d8499" }}
                    tickFormatter={v => truncateLabel(String(v), 10)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#7d8499" }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #e6e8f2",
                      borderRadius: 12,
                      fontSize: 12
                    }}
                    formatter={(value: number | string) => [
                      `${formatNumber(Number(value))} records`,
                      "Count"
                    ]}
                  />
                  <Bar dataKey="count" name="Records" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {categoryFrequency.distribution.map((entry, idx) => (
                      <Cell key={entry.label} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="top5-list">
              <div className="top5-heading">Top 5 most frequent</div>
              {categoryFrequency.top5.map((item, idx) => (
                <div key={item.label} className="top5-row">
                  <div className="top5-label">
                    <span className="top5-rank">{idx + 1}</span>
                    <span title={item.label}>{item.label}</span>
                    <b>
                      {formatNumber(item.count)} ({item.percentage}%)
                    </b>
                  </div>
                  <div className="top5-bar-track">
                    <div
                      className="top5-bar-fill"
                      style={{
                        width: `${Math.min(100, item.percentage)}%`,
                        background: CHART_COLORS[idx % CHART_COLORS.length]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="chart-empty">No non-empty values found in {selectedCategoryCol}.</div>
        )}
      </section>

      {/* 3. Column-wise Missing Value Chart */}
      <section className="panel analysis-chart-card">
        <div className="panel-heading">
          <div>
            <h2>Column-wise missing values</h2>
            <p>
              {hasAnyMissing
                ? "Missing cell count across every column"
                : "All columns have 0 missing values"}
            </p>
          </div>
          <span className="field-count">{missingByColumn.length} columns</span>
        </div>

        <div className="analysis-chart-box">
          {missingByColumn.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={missingByColumn} margin={{ top: 12, right: 12, left: 0, bottom: 14 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f6" />
                <XAxis
                  dataKey="column"
                  tick={{ fontSize: 10, fill: "#7d8499" }}
                  tickFormatter={v => truncateLabel(String(v), 12)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#7d8499" }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #e6e8f2",
                    borderRadius: 12,
                    fontSize: 12
                  }}
                  formatter={(value: number | string, _name, item) => [
                    `${formatNumber(Number(value))} missing (${item?.payload?.missingPct ?? 0}%)`,
                    "Missing"
                  ]}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  name="Missing cells"
                  dataKey="missing"
                  fill="#f5a94b"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No columns to evaluate.</div>
          )}
        </div>
      </section>

      {/* 4. Numeric Value Comparison */}
      <section className="panel analysis-chart-card">
        <div className="panel-heading">
          <div>
            <h2>Numeric value comparison</h2>
            <p>Compare {METRIC_LABELS[comparisonMetric].toLowerCase()} across numeric fields</p>
          </div>
          {numericComparison.length > 0 && (
            <select
              className="mini-select"
              value={comparisonMetric}
              onChange={e => setComparisonMetric(e.target.value as ComparisonMetric)}
              aria-label="Select metric for numeric column comparison"
            >
              {Object.entries(METRIC_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="analysis-chart-box">
          {numericComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={numericComparison}
                margin={{ top: 12, right: 12, left: 4, bottom: 14 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f6" />
                <XAxis
                  dataKey="column"
                  tick={{ fontSize: 10, fill: "#7d8499" }}
                  tickFormatter={v => truncateLabel(String(v), 12)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#7d8499" }}
                  tickFormatter={v => formatCompactNumber(Number(v))}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #e6e8f2",
                    borderRadius: 12,
                    fontSize: 12
                  }}
                  formatter={(value: number | string) => [
                    formatNumber(Number(value)),
                    METRIC_LABELS[comparisonMetric]
                  ]}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  name={METRIC_LABELS[comparisonMetric]}
                  dataKey={comparisonMetric}
                  fill="#35b7a4"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No numeric columns available for comparison.</div>
          )}
        </div>
      </section>
    </div>
  );
}
