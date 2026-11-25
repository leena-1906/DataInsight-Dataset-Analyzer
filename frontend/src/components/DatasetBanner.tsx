import { ChevronDown, Database, FileSpreadsheet, Trash2 } from "lucide-react";
import { Dataset } from "../types/dataset";
import { formatNumber } from "../utils/dataUtils";

interface DatasetBannerProps {
  datasets: Dataset[];
  active: Dataset;
  switching: boolean;
  onSelectDataset: (id: number) => void;
  onOpenExplorer: () => void;
  onDelete: () => void;
}

export function DatasetBanner({
  datasets,
  active,
  switching,
  onSelectDataset,
  onOpenExplorer,
  onDelete
}: DatasetBannerProps) {
  return (
    <div className="dataset-banner">
      <div className="file-icon">
        <FileSpreadsheet size={20} />
      </div>

      <div className="dataset-meta">
        <b>{active.name}</b>
        <span>
          <span className="green-dot" />
          Active dataset
          <span className="meta-sep">·</span>
          {formatNumber(active.rowCount)} records
          <span className="meta-sep">·</span>
          {active.columnCount} columns
          <span className="meta-sep">·</span>
          Updated {new Date(active.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="dataset-banner-controls">
        <label className="dataset-select-wrap" aria-label="Select active dataset">
          <Database size={14} className="select-prefix-icon" />
          <select
            className="dataset-dropdown"
            value={active.id}
            disabled={switching}
            onChange={e => onSelectDataset(Number(e.target.value))}
            aria-label="Dataset selection dropdown"
          >
            {datasets.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({formatNumber(d.rowCount)} rows · {d.columnCount} cols)
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="select-chevron" />
        </label>

        <button type="button" className="select-dataset" onClick={onOpenExplorer}>
          Explore data
        </button>

        <button
          type="button"
          className="more-dataset"
          onClick={onDelete}
          title="Delete dataset"
          aria-label="Delete active dataset"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}
