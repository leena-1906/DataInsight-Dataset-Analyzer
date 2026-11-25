import {
  Activity,
  BarChart3,
  ChevronRight,
  CircleHelp,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Sparkles,
  X
} from "lucide-react";
import { Dataset, WorkspaceTab } from "../types/dataset";
import { formatNumber } from "../utils/dataUtils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  datasets: Dataset[];
  activeDatasetId: number | null;
  onSelectDataset: (id: number) => void;
  onOpenSampleModal: () => void;
  onTriggerUpload: () => void;
  onOpenGuide: () => void;
}

const NAV_ITEMS: { name: WorkspaceTab; icon: typeof LayoutDashboard; badge?: string }[] = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Data analysis", icon: BarChart3, badge: "PRO" },
  { name: "Data explorer", icon: Database },
  { name: "Insights", icon: Sparkles }
];

export function Sidebar({
  open,
  onClose,
  activeTab,
  onSelectTab,
  datasets,
  activeDatasetId,
  onSelectDataset,
  onOpenSampleModal,
  onTriggerUpload,
  onOpenGuide
}: SidebarProps) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Workspace navigation">
      <div className="brand">
        <div className="brand-mark">
          <Activity size={20} />
        </div>
        <span>
          data<span className="brand-light">insight</span>
        </span>
        <button className="mobile-close" onClick={onClose} aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>

      <div className="workspace-label">WORKSPACE</div>
      <nav>
        {NAV_ITEMS.map(item => (
          <button
            key={item.name}
            type="button"
            className={`nav-item ${activeTab === item.name ? "selected" : ""}`}
            onClick={() => {
              onSelectTab(item.name);
              onClose();
            }}
          >
            <item.icon size={18} />
            <span>{item.name}</span>
            {item.badge && <span className="new-pill">{item.badge}</span>}
          </button>
        ))}
      </nav>

      <div className="side-divider" />

      <div className="workspace-label dataset-heading">
        <span>YOUR DATASETS ({datasets.length})</span>
        <div className="dataset-heading-actions">
          <button type="button" title="Try sample datasets" onClick={onOpenSampleModal}>
            <Sparkles size={13} />
          </button>
          <button type="button" title="Upload CSV dataset" onClick={onTriggerUpload}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="dataset-list">
        {datasets.length === 0 ? (
          <div className="dataset-empty-hint">No datasets stored yet</div>
        ) : (
          datasets.map(d => (
            <button
              key={d.id}
              type="button"
              className={`dataset-item ${activeDatasetId === d.id ? "current" : ""}`}
              onClick={() => {
                onSelectDataset(d.id);
                onClose();
              }}
              title={`${d.name} (${formatNumber(d.rowCount)} rows)`}
            >
              <FileSpreadsheet size={16} />
              <span>{d.name}</span>
              <small>{formatNumber(d.rowCount)}</small>
            </button>
          ))
        )}
      </div>

      <div className="sidebar-bottom">
        <button type="button" className="help-card" onClick={onOpenGuide}>
          <div className="help-icon">
            <CircleHelp size={17} />
          </div>
          <div>
            <b>Need a hand?</b>
            <span>Explore the quick guide</span>
          </div>
          <ChevronRight size={16} />
        </button>
        <div className="profile">
          <div className="avatar">L</div>
          <div className="profile-copy">
            <b>Leena</b>
            <span>SQLite Workspace</span>
          </div>
          <MoreHorizontal size={19} />
        </div>
      </div>
    </aside>
  );
}
