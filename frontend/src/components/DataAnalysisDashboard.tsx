import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { fetchDatasetAnalysis } from "../services/api";
import { Dataset, DatasetAnalysis } from "../types/dataset";
import { AnalysisOverviewCards } from "./analysis/AnalysisOverviewCards";
import { AutoInsightsPanel } from "./analysis/AutoInsightsPanel";
import { DataQualityReport } from "./analysis/DataQualityReport";
import { DistributionAnalysisSection } from "./analysis/DistributionAnalysisSection";
import { StatisticalSummaryTable } from "./analysis/StatisticalSummaryTable";

interface DataAnalysisDashboardProps {
  dataset: Dataset;
}

export function DataAnalysisDashboard({ dataset }: DataAnalysisDashboardProps) {
  const [numericCol, setNumericCol] = useState<string>("");
  const [categoryCol, setCategoryCol] = useState<string>("");
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Reset selected columns when dataset changes
  useEffect(() => {
    setNumericCol("");
    setCategoryCol("");
  }, [dataset.id]);

  const loadAnalysis = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError("");

      fetchDatasetAnalysis(dataset.id, { numericCol, categoryCol, signal })
        .then(res => {
          setAnalysis(res);
        })
        .catch(err => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Failed to run dataset analysis.");
        })
        .finally(() => {
          if (!signal?.aborted) {
            setLoading(false);
          }
        });
    },
    [dataset.id, numericCol, categoryCol]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadAnalysis(controller.signal);
    return () => controller.abort();
  }, [loadAnalysis]);

  if (loading && !analysis) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Running statistical & quality analysis on {dataset.name}…</p>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="empty-state">
        <h2>Analysis unavailable</h2>
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => loadAnalysis()}>
          <RefreshCw size={15} /> Retry analysis
        </button>
      </div>
    );
  }

  if (!analysis || analysis.overview.totalRecords === 0) {
    return (
      <div className="empty-state">
        <h2>No records to analyze</h2>
        <p>This dataset does not contain any rows yet.</p>
      </div>
    );
  }

  return (
    <div className={`analysis-dashboard ${loading ? "is-refreshing" : ""}`}>
      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button type="button" className="alert-retry" onClick={() => loadAnalysis()}>
            Retry
          </button>
        </div>
      )}

      <div className="section-title">
        <div>
          <h2>Analysis overview</h2>
          <p>
            Comprehensive statistical, quality, and distribution report computed from SQLite
            records.
          </p>
        </div>
        <span className="date-chip">
          <Activity size={14} /> {loading ? "Updating…" : "Real-time SQLite analysis"}
        </span>
      </div>

      <AnalysisOverviewCards overview={analysis.overview} />

      <AutoInsightsPanel insights={analysis.insights} />

      <StatisticalSummaryTable numericStats={analysis.numericStats} />

      <DistributionAnalysisSection
        distributions={analysis.distributions}
        onChangeNumericCol={setNumericCol}
        onChangeCategoryCol={setCategoryCol}
      />

      <DataQualityReport quality={analysis.quality} />
    </div>
  );
}
