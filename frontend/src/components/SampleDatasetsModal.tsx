import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";
import { SAMPLE_DATASETS } from "../data/sampleDatasets";
import { fetchSampleDatasets, getSampleDownloadUrl } from "../services/api";
import { SampleDatasetInfo } from "../types/dataset";

interface SampleDatasetsModalProps {
  open: boolean;
  onClose: () => void;
  onLoadSample: (sampleId: string) => void;
}

export function SampleDatasetsModal({
  open,
  onClose,
  onLoadSample
}: SampleDatasetsModalProps) {
  const [samples, setSamples] = useState<SampleDatasetInfo[]>(SAMPLE_DATASETS);

  useEffect(() => {
    if (!open) return;
    fetchSampleDatasets()
      .then(list => {
        if (Array.isArray(list) && list.length > 0) {
          setSamples(list);
        }
      })
      .catch(() => {
        // Keep bundled fallback metadata if backend sample list is unreachable
      });
  }, [open]);

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
        className="sample-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-modal-title"
      >
        <div className="sample-modal-header">
          <div>
            <h2 id="sample-modal-title">Explore Sample Datasets</h2>
            <p>
              Load a pre-built dataset into SQLite to test interactive charts, axis selection, and
              data exploration immediately.
            </p>
          </div>
          <button
            type="button"
            className="sample-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sample-grid">
          {samples.map(sample => (
            <div key={sample.id} className="sample-card">
              <span className="sample-badge">{sample.category}</span>
              <h3>{sample.name}</h3>
              <p>{sample.description}</p>
              <div className="sample-meta">
                <span>{sample.rowCount} records</span>
                <span>{sample.columns.length} columns</span>
              </div>
              <div className="sample-columns">
                <b>Columns:</b> {sample.columns.join(", ")}
              </div>
              <div className="sample-actions">
                <a
                  className="btn btn-outline"
                  href={getSampleDownloadUrl(sample.id)}
                  download={sample.filename}
                  title={`Download ${sample.filename}`}
                  style={{ textDecoration: "none" }}
                >
                  <Download size={14} /> Download CSV
                </a>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onLoadSample(sample.id)}
                >
                  <Sparkles size={14} /> Load Dataset
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
