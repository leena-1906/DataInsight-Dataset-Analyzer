import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ChevronRight,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Menu,
  Sparkles,
  X
} from "lucide-react";
import { ColumnInsightsTable } from "./components/ColumnInsightsTable";
import { DataAnalysisDashboard } from "./components/DataAnalysisDashboard";
import { DataExplorer } from "./components/DataExplorer";
import { DatasetBanner } from "./components/DatasetBanner";
import { InsightsView } from "./components/InsightsView";
import { MetricCards } from "./components/MetricCards";
import { QuickGuideModal } from "./components/QuickGuideModal";
import { SampleDatasetsModal } from "./components/SampleDatasetsModal";
import { Sidebar } from "./components/Sidebar";
import { VisualizationStudio } from "./components/VisualizationStudio";
import {
  deleteDatasetById,
  fetchDatasetDetail,
  fetchDatasets,
  getExportUrl,
  loadSampleDataset,
  uploadDatasetCsv
} from "./services/api";
import { Dataset, WorkspaceTab } from "./types/dataset";
import { getTimeGreeting } from "./utils/dataUtils";

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [active, setActive] = useState<Dataset | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("Overview");
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectDataset = useCallback(async (id: number) => {
    setSwitching(true);
    try {
      setError("");
      const detail = await fetchDatasetDetail(id);
      setActive(detail);
      setRows(detail.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load dataset.");
    } finally {
      setSwitching(false);
    }
  }, []);

  const loadDatasets = useCallback(
    async (preferredId?: number, isRetry = false) => {
      setLoading(true);
      try {
        const list = await fetchDatasets();
        setDatasets(list);
        setError("");
        const chosen = list.find(d => d.id === preferredId) || list[0];
        if (chosen) {
          await selectDataset(chosen.id);
        } else {
          setActive(null);
          setRows([]);
        }
      } catch (e) {
        if (import.meta.env.PROD && !isRetry) {
          window.setTimeout(() => loadDatasets(preferredId, true), 3000);
          return;
        }
        setError(
          import.meta.env.PROD
            ? "Can't connect to the backend server. Render may take 30–50s to wake up on free tier—please retry or refresh."
            : e instanceof Error && e.message
              ? `Can't connect to the API (${e.message}). Start the backend with npm run dev.`
              : "Can't connect to the API. Start the backend with npm run dev."
        );
      } finally {
        setLoading(false);
      }
    },
    [selectDataset]
  );

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  async function uploadFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const created = await uploadDatasetCsv(file);
      await loadDatasets(created.id);
      setActiveTab("Overview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleLoadSample(sampleId: string) {
    setSampleModalOpen(false);
    setUploading(true);
    setError("");
    try {
      const created = await loadSampleDataset(sampleId);
      await loadDatasets(created.id);
      setActiveTab("Overview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load sample dataset.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDataset() {
    if (!active || !window.confirm(`Delete "${active.name}" permanently?`)) return;
    try {
      setError("");
      await deleteDatasetById(active.id);
      await loadDatasets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  const stats = active?.summary.stats || [];
  const numericStats = useMemo(() => stats.filter(s => s.type === "Numeric"), [stats]);
  const completeness =
    active && active.rowCount * active.columnCount
      ? Math.round((1 - active.summary.missing / (active.rowCount * active.columnCount)) * 100)
      : 0;

  const greeting = getTimeGreeting();
  const pageSubtitle =
    activeTab === "Overview"
      ? "Interactive visualizations, dataset metrics, and column statistics backed by SQLite."
      : activeTab === "Data analysis"
        ? "Deep statistical summaries, data quality checks, distributions, and automated insights."
        : activeTab === "Data explorer"
          ? "Search, sort, paginate, and export stored dataset records."
          : "Discover automated patterns and data quality insights.";

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        datasets={datasets}
        activeDatasetId={active?.id ?? null}
        onSelectDataset={selectDataset}
        onOpenSampleModal={() => setSampleModalOpen(true)}
        onTriggerUpload={() => fileRef.current?.click()}
        onOpenGuide={() => setGuideModalOpen(true)}
      />

      <main className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} /> <b>{activeTab}</b>
          </div>
          <div className="top-actions">
            <span className="status-dot" />
            <span className="saved-label">
              {switching ? "Loading dataset…" : "SQLite connected"}
            </span>
            <div className="top-avatar" title="Leena">
              L
            </div>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                DATA WORKSPACE <span>/</span> {activeTab.toUpperCase()}
              </div>
              <h1>{activeTab === "Overview" ? `${greeting}, Leena` : activeTab}</h1>
              <p>{pageSubtitle}</p>
            </div>
            <div className="heading-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSampleModalOpen(true)}
              >
                <Sparkles size={15} /> Load Demo Data
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => active && window.open(getExportUrl(active.id), "_blank")}
                disabled={!active}
              >
                <Download size={16} /> Export CSV
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fileRef.current?.click()}
              >
                <CloudUpload size={17} /> Upload dataset
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={e => uploadFile(e.target.files?.[0])}
              />
            </div>
          </div>

          {error && (
            <div className="alert" role="alert">
              <span>{error}</span>
              <div className="alert-actions">
                <button type="button" className="alert-retry" onClick={() => loadDatasets()}>
                  Retry
                </button>
                <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {uploading && (
            <div className="upload-progress">
              <span /> Uploading and analyzing your CSV…
            </div>
          )}

          {loading ? (
            <div className="loading">
              <div className="loading-spinner" />
              <p>Preparing your SQLite analytics workspace…</p>
            </div>
          ) : !active ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FileSpreadsheet size={30} />
              </div>
              <h2>Start with your first dataset</h2>
              <p>
                Upload a CSV file or load a realistic sample dataset to explore interactive charts
                and insights.
              </p>
              <div className="empty-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSampleModalOpen(true)}
                >
                  <Sparkles size={16} /> Try Sample Dataset
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => fileRef.current?.click()}
                >
                  <CloudUpload size={17} /> Upload CSV
                </button>
              </div>
            </div>
          ) : (
            <>
              <DatasetBanner
                datasets={datasets}
                active={active}
                switching={switching}
                onSelectDataset={selectDataset}
                onOpenExplorer={() => setActiveTab("Data explorer")}
                onDelete={deleteDataset}
              />

              {activeTab === "Overview" && (
                <>
                  <div className="section-title">
                    <div>
                      <h2>Dataset at a glance</h2>
                      <p>Key workspace & active dataset metrics retrieved from SQLite.</p>
                    </div>
                    <span className="date-chip">
                      <Activity size={14} /> Live analysis
                    </span>
                  </div>

                  <MetricCards
                    datasets={datasets}
                    active={active}
                    completeness={completeness}
                    numericCount={numericStats.length}
                  />

                  <VisualizationStudio dataset={active} rows={rows} />

                  <ColumnInsightsTable stats={stats} />
                </>
              )}

              {activeTab === "Data analysis" && <DataAnalysisDashboard dataset={active} />}

              {activeTab === "Data explorer" && (
                <DataExplorer
                  datasets={datasets}
                  dataset={active}
                  stats={stats}
                  onSelectDataset={selectDataset}
                />
              )}

              {activeTab === "Insights" && (
                <InsightsView stats={stats} active={active} completeness={completeness} />
              )}
            </>
          )}

          <footer>
            © 2026 DataInsight <span>Built for curious minds.</span>
            <a href="https://www.papaparse.com/" target="_blank" rel="noreferrer">
              CSV parsing powered by PapaParse
            </a>
          </footer>
        </div>
      </main>

      <SampleDatasetsModal
        open={sampleModalOpen}
        onClose={() => setSampleModalOpen(false)}
        onLoadSample={handleLoadSample}
      />

      <QuickGuideModal open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
    </div>
  );
}
