import { useEffect } from "react";
import { BarChart3, CloudUpload, Database, Download, X } from "lucide-react";

interface QuickGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickGuideModal({ open, onClose }: QuickGuideModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="sample-modal guide-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
      >
        <div className="sample-modal-header">
          <div>
            <h2 id="guide-modal-title">DataInsight Quick Guide</h2>
            <p>Everything you can do inside your SQLite-backed analytics workspace.</p>
          </div>
          <button
            type="button"
            className="sample-close-btn"
            onClick={onClose}
            aria-label="Close guide"
          >
            <X size={18} />
          </button>
        </div>

        <div className="guide-grid">
          <div className="guide-item">
            <div className="guide-icon purple">
              <CloudUpload size={18} />
            </div>
            <div>
              <h3>1. Upload or Load Datasets</h3>
              <p>
                Upload any CSV file (up to 10 MB, 20,000 rows) or click <b>Load Demo Data</b> to
                store sample datasets directly in SQLite.
              </p>
            </div>
          </div>

          <div className="guide-item">
            <div className="guide-icon teal">
              <BarChart3 size={18} />
            </div>
            <div>
              <h3>2. Interactive Visualizations</h3>
              <p>
                Switch dynamically between <b>Bar</b>, <b>Line</b>, <b>Pie</b>, and <b>Donut</b>{" "}
                charts, choose X/Y axes, and change aggregations (Sum, Average, Count, or Raw).
              </p>
            </div>
          </div>

          <div className="guide-item">
            <div className="guide-icon orange">
              <Database size={18} />
            </div>
            <div>
              <h3>3. Search & Sort Explorer</h3>
              <p>
                Inspect column types, search across all columns, sort any column ascending or
                descending, and paginate through stored database records.
              </p>
            </div>
          </div>

          <div className="guide-item">
            <div className="guide-icon pink">
              <Download size={18} />
            </div>
            <div>
              <h3>4. Export Clean CSVs</h3>
              <p>
                Export the complete dataset from the top bar, or export only your filtered search
                results directly from the Data Explorer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
