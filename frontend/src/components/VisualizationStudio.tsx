import { useEffect, useMemo, useState } from "react";
import { BarChart3, CircleDot, LineChart as LineChartIcon, PieChart as PieChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { fetchDatasetChart } from "../services/api";
import { AggregationType, ChartDataPoint, ChartType, Dataset } from "../types/dataset";
import {
  CHART_COLORS,
  findCategoricalColumn,
  formatCompactNumber,
  formatNumber,
  getDefaultChartConfig,
  truncateLabel
} from "../utils/dataUtils";

interface VisualizationStudioProps {
  dataset: Dataset;
  rows: Record<string, string>[];
}

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: typeof BarChart3 }[] = [
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: LineChartIcon },
  { value: "pie", label: "Pie", icon: PieChartIcon },
  { value: "donut", label: "Donut", icon: CircleDot }
];

const AGGREGATION_LABELS: Record<AggregationType, string> = {
  none: "Raw values",
  sum: "Sum",
  avg: "Average",
  count: "Record count"
};

export function VisualizationStudio({ dataset, rows }: VisualizationStudioProps) {
  const stats = dataset.summary.stats;
  const numericColumns = useMemo(
    () => stats.filter(s => s.type === "Numeric").map(s => s.name),
    [stats]
  );

  const defaultConfig = useMemo(() => getDefaultChartConfig(dataset, rows), [dataset, rows]);
  const defaultBreakdownCol = useMemo(
    () => findCategoricalColumn(dataset.columns, stats, rows) || dataset.columns[0] || "",
    [dataset.columns, stats, rows]
  );

  const [chartType, setChartType] = useState<ChartType>("bar");
  const [xAxis, setXAxis] = useState<string>(defaultConfig.xAxis);
  const [yAxis, setYAxis] = useState<string>(defaultConfig.yAxis);
  const [aggregation, setAggregation] = useState<AggregationType>(defaultConfig.aggregation);
  const [limit, setLimit] = useState<number>(30);

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [skippedInvalidCount, setSkippedInvalidCount] = useState<number>(0);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string>("");

  // Secondary breakdown panel state
  const [breakdownCol, setBreakdownCol] = useState<string>(defaultBreakdownCol);
  const [breakdownType, setBreakdownType] = useState<"donut" | "pie">("donut");
  const [breakdownData, setBreakdownData] = useState<ChartDataPoint[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState<boolean>(false);

  // Reset axis defaults cleanly whenever the active dataset changes
  useEffect(() => {
    setXAxis(defaultConfig.xAxis);
    setYAxis(defaultConfig.yAxis);
    setAggregation(defaultConfig.aggregation);
    setBreakdownCol(defaultBreakdownCol);
  }, [dataset.id, defaultConfig, defaultBreakdownCol]);

  // If user switches to Pie or Donut on primary chart and aggregation is "none",
  // aggregate by Sum (or Count) so slices combine matching categories cleanly.
  const effectiveAggregation: AggregationType = useMemo(() => {
    if (yAxis === "__count__") return "count";
    const yIsNumeric = numericColumns.includes(yAxis);
    if (!yIsNumeric) return "count";
    if ((chartType === "pie" || chartType === "donut") && aggregation === "none") {
      return "sum";
    }
    return aggregation;
  }, [yAxis, numericColumns, chartType, aggregation]);

  // Fetch main chart series from backend SQLite records
  useEffect(() => {
    if (!dataset.id || !xAxis || dataset.rowCount === 0) {
      setChartData([]);
      setSkippedInvalidCount(0);
      return;
    }

    const controller = new AbortController();
    setChartLoading(true);
    setChartError("");

    fetchDatasetChart(dataset.id, {
      xAxis,
      yAxis,
      aggregation: effectiveAggregation,
      limit,
      signal: controller.signal
    })
      .then(res => {
        setChartData(res.data);
        setSkippedInvalidCount(res.skippedInvalidCount);
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setChartError(err instanceof Error ? err.message : "Failed to load chart data.");
        setChartData([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setChartLoading(false);
        }
      });

    return () => controller.abort();
  }, [dataset.id, dataset.rowCount, xAxis, yAxis, effectiveAggregation, limit]);

  // Fetch breakdown Pie/Donut series from backend SQLite records
  useEffect(() => {
    if (!dataset.id || !breakdownCol || dataset.rowCount === 0) {
      setBreakdownData([]);
      return;
    }

    const controller = new AbortController();
    setBreakdownLoading(true);

    fetchDatasetChart(dataset.id, {
      xAxis: breakdownCol,
      yAxis: "__count__",
      aggregation: "count",
      limit: 8,
      signal: controller.signal
    })
      .then(res => {
        const sorted = [...res.data].sort((a, b) => b.value - a.value).slice(0, 6);
        setBreakdownData(sorted);
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setBreakdownData([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBreakdownLoading(false);
        }
      });

    return () => controller.abort();
  }, [dataset.id, dataset.rowCount, breakdownCol]);

  const yMetricLabel = yAxis === "__count__" ? "Record count" : yAxis;
  const seriesLabel =
    effectiveAggregation === "none"
      ? yMetricLabel
      : `${AGGREGATION_LABELS[effectiveAggregation]} of ${yMetricLabel}`;

  const breakdownTotal = useMemo(
    () => breakdownData.reduce((sum, item) => sum + item.value, 0),
    [breakdownData]
  );

  const pieData = useMemo(() => {
    // Pie/Donut require strictly positive values
    return chartData.filter(d => d.value > 0).slice(0, 12);
  }, [chartData]);

  const renderPrimaryChart = () => {
    if (chartLoading) {
      return <div className="chart-empty">Loading visualization from database…</div>;
    }
    if (chartError) {
      return <div className="chart-empty chart-error-msg">{chartError}</div>;
    }
    if (!chartData.length) {
      return (
        <div className="chart-empty">
          No valid records available for {xAxis} vs {yMetricLabel}.
        </div>
      );
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 16, left: 6, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#7d8499" }}
              tickFormatter={v => truncateLabel(String(v), 12)}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              label={{
                value: xAxis,
                position: "insideBottom",
                offset: -10,
                fontSize: 11,
                fill: "#8f95a8"
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#7d8499" }}
              tickFormatter={v => formatCompactNumber(Number(v))}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ fill: "rgba(112, 104, 237, 0.06)" }}
              contentStyle={{
                border: "1px solid #e6e8f2",
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "0 8px 24px rgba(37, 40, 58, 0.08)"
              }}
              formatter={(value: number | string) => [formatNumber(Number(value)), seriesLabel]}
              labelFormatter={label => `${xAxis}: ${label}`}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
            />
            <Bar
              name={seriesLabel}
              dataKey="value"
              fill="#7068ed"
              radius={[6, 6, 0, 0]}
              maxBarSize={44}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 16, left: 6, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#7d8499" }}
              tickFormatter={v => truncateLabel(String(v), 12)}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              label={{
                value: xAxis,
                position: "insideBottom",
                offset: -10,
                fontSize: 11,
                fill: "#8f95a8"
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#7d8499" }}
              tickFormatter={v => formatCompactNumber(Number(v))}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #e6e8f2",
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "0 8px 24px rgba(37, 40, 58, 0.08)"
              }}
              formatter={(value: number | string) => [formatNumber(Number(value)), seriesLabel]}
              labelFormatter={label => `${xAxis}: ${label}`}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
            />
            <Line
              name={seriesLabel}
              type="monotone"
              dataKey="value"
              stroke="#7068ed"
              strokeWidth={3}
              dot={{ r: 3.5, fill: "#7068ed", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (!pieData.length) {
      return (
        <div className="chart-empty">
          Pie & Donut charts require positive numeric values. Try choosing Record count or a positive metric.
        </div>
      );
    }

    const isDonut = chartType === "donut";
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={isDonut ? "52%" : 0}
            outerRadius="80%"
            paddingAngle={isDonut ? 3 : 1}
            stroke="#fff"
            strokeWidth={2}
            label={({ name, percent }) =>
              `${truncateLabel(String(name), 10)} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={{ stroke: "#cfd3e0" }}
          >
            {pieData.map((entry, idx) => (
              <Cell key={entry.label} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              border: "1px solid #e6e8f2",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(37, 40, 58, 0.08)"
            }}
            formatter={(value: number | string, name: string) => [
              formatNumber(Number(value)),
              `${name} (${seriesLabel})`
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ fontSize: 11 }}
            formatter={value => truncateLabel(String(value), 16)}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="chart-grid">
      <section className="panel trend-panel">
        <div className="panel-heading chart-panel-heading">
          <div>
            <h2>Interactive visualization</h2>
            <p>
              {seriesLabel} by {xAxis || "—"}
              {skippedInvalidCount > 0 && ` · ${skippedInvalidCount} non-numeric rows skipped`}
            </p>
          </div>
          <div className="segmented" role="tablist" aria-label="Chart type selector">
            {CHART_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={chartType === opt.value}
                className={chartType === opt.value ? "on" : ""}
                onClick={() => setChartType(opt.value)}
              >
                <opt.icon size={12} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="chart-controls-bar">
          <label className="axis-control">
            <span>X-Axis</span>
            <select
              value={xAxis}
              onChange={e => setXAxis(e.target.value)}
              aria-label="Select X-axis column"
            >
              {dataset.columns.map(col => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </label>

          <label className="axis-control">
            <span>Y-Axis</span>
            <select
              value={yAxis}
              onChange={e => setYAxis(e.target.value)}
              aria-label="Select Y-axis column"
            >
              {numericColumns.map(col => (
                <option key={col} value={col}>
                  {col} (Numeric)
                </option>
              ))}
              <option value="__count__">Record Count</option>
            </select>
          </label>

          <label className="axis-control">
            <span>Aggregate</span>
            <select
              value={effectiveAggregation}
              disabled={yAxis === "__count__"}
              onChange={e => setAggregation(e.target.value as AggregationType)}
              aria-label="Select aggregation mode"
            >
              <option value="none" disabled={chartType === "pie" || chartType === "donut"}>
                Raw values
              </option>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="count">Count</option>
            </select>
          </label>

          <label className="axis-control compact">
            <span>Points</span>
            <select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              aria-label="Select maximum chart points"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>

        <div className="chart-area interactive-chart-area">{renderPrimaryChart()}</div>
      </section>

      <section className="panel category-panel">
        <div className="panel-heading">
          <div>
            <h2>Category breakdown</h2>
            <p>{breakdownCol ? `Share by ${breakdownCol}` : "Distribution of values"}</p>
          </div>
          <div className="segmented" role="tablist" aria-label="Breakdown chart type">
            <button
              type="button"
              className={breakdownType === "donut" ? "on" : ""}
              onClick={() => setBreakdownType("donut")}
            >
              Donut
            </button>
            <button
              type="button"
              className={breakdownType === "pie" ? "on" : ""}
              onClick={() => setBreakdownType("pie")}
            >
              Pie
            </button>
          </div>
        </div>

        <div className="breakdown-control">
          <label className="axis-control full">
            <span>Group by column</span>
            <select
              value={breakdownCol}
              onChange={e => setBreakdownCol(e.target.value)}
              aria-label="Select category breakdown column"
            >
              {dataset.columns.map(col => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pie-area">
          {breakdownLoading ? (
            <div className="chart-empty">Loading breakdown…</div>
          ) : breakdownData.length ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdownData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={breakdownType === "donut" ? 58 : 0}
                    outerRadius={86}
                    paddingAngle={breakdownType === "donut" ? 3 : 1}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {breakdownData.map((entry, i) => (
                      <Cell key={entry.label} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #e6e8f2",
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: "0 8px 24px rgba(37, 40, 58, 0.08)"
                    }}
                    formatter={(value: number | string) => [
                      `${formatNumber(Number(value))} records`,
                      "Count"
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {breakdownType === "donut" && (
                <div className="pie-center">
                  <b>{formatNumber(dataset.rowCount)}</b>
                  <span>records</span>
                </div>
              )}
            </>
          ) : (
            <div className="chart-empty">No categorical values available.</div>
          )}
        </div>

        <div className="legend-list">
          {breakdownData.slice(0, 6).map((c, i) => (
            <div key={c.label} title={`${c.label}: ${c.value} records`}>
              <span>
                <i style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="legend-label-text">{c.label}</span>
              </span>
              <b>
                {formatNumber(c.value)} ({Math.round((c.value / (breakdownTotal || 1)) * 100)}%)
              </b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
