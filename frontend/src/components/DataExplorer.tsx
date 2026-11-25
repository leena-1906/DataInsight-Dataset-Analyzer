import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Search
} from "lucide-react";
import { fetchDatasetRecords, getExportUrl } from "../services/api";
import { ColumnStat, Dataset } from "../types/dataset";
import { formatNumber } from "../utils/dataUtils";

interface DataExplorerProps {
  datasets: Dataset[];
  dataset: Dataset;
  stats: ColumnStat[];
  onSelectDataset: (id: number) => void;
}

export function DataExplorer({
  datasets,
  dataset,
  stats,
  onSelectDataset
}: DataExplorerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [rows, setRows] = useState<Record<string, string>[]>(dataset.rows?.slice(0, 10) || []);
  const [totalFiltered, setTotalFiltered] = useState<number>(dataset.rowCount);
  const [totalPages, setTotalPages] = useState<number>(Math.max(1, Math.ceil(dataset.rowCount / 10)));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Reset table controls when switching datasets
  useEffect(() => {
    setSearchInput("");
    setDebouncedQuery("");
    setPage(1);
    setSortBy("");
    setSortDir("asc");
  }, [dataset.id]);

  // Debounce search input slightly for responsive querying
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(1);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetchDatasetRecords(dataset.id, {
      search: debouncedQuery,
      page,
      pageSize,
      sortBy,
      sortDir,
      signal: controller.signal
    })
      .then(res => {
        setRows(res.rows);
        setTotalFiltered(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load records.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [dataset.id, debouncedQuery, page, pageSize, sortBy, sortDir]);

  function handleSort(column: string) {
    if (sortBy === column) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortBy("");
        setSortDir("asc");
      }
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setPage(1);
  }

  function clearFilters() {
    setSearchInput("");
    setDebouncedQuery("");
    setSortBy("");
    setSortDir("asc");
    setPage(1);
  }

  const startRow = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(totalFiltered, page * pageSize);

  return (
    <section className="panel table-panel">
      <div className="panel-heading explorer-heading">
        <div>
          <h2>Dataset explorer</h2>
          <p>
            Showing {formatNumber(startRow)}–{formatNumber(endRow)} of{" "}
            {formatNumber(totalFiltered)} matching rows
            {debouncedQuery ? ` (filtered from ${formatNumber(dataset.rowCount)})` : ""} ·{" "}
            {dataset.columnCount} columns
          </p>
        </div>

        <div className="table-tools">
          <select
            className="explorer-dataset-select"
            value={dataset.id}
            onChange={e => onSelectDataset(Number(e.target.value))}
            aria-label="Switch dataset in explorer"
          >
            {datasets.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({formatNumber(d.rowCount)})
              </option>
            ))}
          </select>

          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Search all columns…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              aria-label="Search dataset records"
            />
          </div>

          <button
            type="button"
            className="btn btn-outline small"
            onClick={clearFilters}
            disabled={!searchInput && !sortBy}
          >
            <Filter size={15} /> Clear
          </button>

          <button
            type="button"
            className="btn btn-outline small"
            onClick={() => window.open(getExportUrl(dataset.id, debouncedQuery), "_blank")}
            title={debouncedQuery ? "Export matching rows as CSV" : "Export full dataset as CSV"}
          >
            <Download size={15} /> {debouncedQuery ? "Export Filtered" : "Export CSV"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert explorer-alert">
          <span>{error}</span>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {dataset.columns.map(col => {
                const colType = stats.find(s => s.name === col)?.type || "Text";
                const isSorted = sortBy === col;
                return (
                  <th key={col}>
                    <button
                      type="button"
                      className={`sort-header-btn ${isSorted ? "sorted" : ""}`}
                      onClick={() => handleSort(col)}
                      title={`Sort by ${col}`}
                    >
                      <span>{col}</span>
                      <span className={`column-type ${colType.toLowerCase()}`}>
                        {colType === "Numeric" ? "123 Numeric" : "Aa Text"}
                      </span>
                      {isSorted ? (
                        sortDir === "asc" ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        )
                      ) : (
                        <ArrowUpDown size={12} className="sort-idle-icon" />
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, dataset.columns.length)} className="table-empty-cell">
                  Loading records from SQLite…
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr key={`${page}-${idx}`} className={loading ? "row-dimmed" : ""}>
                  {dataset.columns.map(col => {
                    const cell = String(row[col] ?? "").trim();
                    return (
                      <td key={col}>
                        {cell || <span className="missing">Missing</span>}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={Math.max(1, dataset.columns.length)} className="table-empty-cell">
                  No records found{debouncedQuery ? ` matching "${debouncedQuery}"` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="page-size-wrap">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Rows per page"
          >
            <option value={8}>8</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <span>
          Page {page} of {totalPages}
        </span>

        <div className="pagination-controls">
          <button
            type="button"
            className="page-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
