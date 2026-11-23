import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Bell, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, CloudUpload, Database, Download, FileSpreadsheet, Filter, LayoutDashboard, Menu, MoreHorizontal, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SAMPLE_DATASETS, SampleDataset } from "./data/sampleDatasets";

type ColumnStat = { name:string; type:string; missing:number; unique:number; mean:number|null; median:number|null; mode:string; min:number|null; max:number|null };
type Dataset = { id:number; name:string; createdAt:string; rowCount:number; columnCount:number; columns:string[]; summary:{stats:ColumnStat[];missing:number;duplicates:number}; rows?:Record<string,string>[]; totalRows?:number };
const COLORS = ["#6c63ff","#35b7a4","#f5a94b","#e879a5","#4d9de0","#9b8af7"];
const fmt = (n:number) => new Intl.NumberFormat("en-IN").format(n);

function findCategoricalColumn(columns: string[], stats: ColumnStat[], rows: Record<string, string>[]): string | null {
  if (!columns.length) return null;

  // 1. Exact match for "Category" (case-insensitive)
  const exactCategory = columns.find(c => c.trim().toLowerCase() === "category");
  if (exactCategory) return exactCategory;

  // 2. Contains "category" or "categories" (case-insensitive)
  const containsCategory = columns.find(c => /category|categories/i.test(c.trim()));
  if (containsCategory) return containsCategory;

  // Patterns for columns that should NOT be used for categorical breakdown
  const DATE_NAME_REGEX = /(^|_|\b)(date|time|timestamp|datetime|day|month|year|created_?at|updated_?at)($|_|\b)/i;
  const ID_NAME_REGEX = /(^|_|\b)(id|uuid|guid|code|pk|fk|index|key|hash|token)($|_|\b)/i;
  const DATE_VAL_REGEX = /^\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?)?\s*$/i;

  const candidates = columns.filter(col => {
    const colTrimmed = col.trim();
    const stat = stats.find(s => s.name === col);

    // Exclude numeric columns
    if (stat && stat.type === "Numeric") return false;

    // Exclude date/time columns by header name
    if (DATE_NAME_REGEX.test(colTrimmed)) return false;

    // Exclude ID/key columns by header name
    if (ID_NAME_REGEX.test(colTrimmed)) return false;

    // Check row values: if majority look like dates, exclude
    const sampleValues = rows
      .map(r => String(r[col] ?? "").trim())
      .filter(v => v !== "")
      .slice(0, 30);
    if (sampleValues.length > 0) {
      const dateMatches = sampleValues.filter(v => DATE_VAL_REGEX.test(v)).length;
      if (dateMatches / sampleValues.length >= 0.5) return false;
    }

    // Exclude columns with 0 or 1 unique value
    if (stat && stat.unique <= 1) return false;

    // Exclude columns where every row has a unique value (identifier-like) if more than 3 rows
    if (stat && rows.length > 3 && stat.unique === rows.length) return false;

    return true;
  });

  if (!candidates.length) return null;

  // Prioritize typical categorical column names
  const CAT_KEYWORDS = /(^|_|\b)(type|segment|group|genre|status|department|class|tier|region|country|city|state|gender|brand|vendor|industry|priority|channel|role|grade|subject)($|_|\b)/i;
  const keywordMatch = candidates.find(c => CAT_KEYWORDS.test(c.trim()));
  if (keywordMatch) return keywordMatch;

  // Otherwise, sort by lowest unique count (cleanest categorical distribution)
  candidates.sort((a, b) => {
    const sA = stats.find(s => s.name === a)?.unique ?? 999;
    const sB = stats.find(s => s.name === b)?.unique ?? 999;
    return sA - sB;
  });

  return candidates[0] ?? null;
}

// Configurable API base URL: respects VITE_API_URL or VITE_BACKEND_URL.
// Defaults to the deployed Render backend in production and "/api" proxy in local dev.
const PRODUCTION_API_URL = "https://datainsight-dataset-analyzer.onrender.com";

const envUrl = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  ""
).trim().replace(/\/+$/, "");

const rawApiUrl = envUrl || (import.meta.env.PROD ? PRODUCTION_API_URL : "");

const API = rawApiUrl
  ? (rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`)
  : "/api";

export default function App() {
  const [datasets,setDatasets] = useState<Dataset[]>([]);
  const [active,setActive] = useState<Dataset|null>(null);
  const [rows,setRows] = useState<Record<string,string>[]>([]);
  const [loading,setLoading] = useState(true);
  const [uploading,setUploading] = useState(false);
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const [page,setPage] = useState(1);
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [activeTab,setActiveTab] = useState("Overview");
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pageSize = 8;

  useEffect(() => {
    if (!sampleModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSampleModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sampleModalOpen]);

  async function loadSample(sample: SampleDataset) {
    setSampleModalOpen(false);
    const file = new File([sample.csvContent.trim()], sample.filename, { type: "text/csv" });
    await uploadFile(file);
  }

  function downloadSample(e: React.MouseEvent, sample: SampleDataset) {
    e.stopPropagation();
    const blob = new Blob([sample.csvContent.trim()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sample.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadDatasets(preferredId?:number, isRetry = false) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/datasets`);
      if (!res.ok) throw new Error("Unable to connect to the dataset API.");
      const list:Dataset[] = await res.json();
      if (!Array.isArray(list)) throw new Error("Invalid dataset response format.");
      setDatasets(list);
      setError("");
      const chosen = list.find(d=>d.id===preferredId) || list[0];
      if (chosen) await selectDataset(chosen.id, list);
      else { setActive(null); setRows([]); }
    } catch {
      if (import.meta.env.PROD && !isRetry) {
        setTimeout(() => loadDatasets(preferredId, true), 3000);
        return;
      }
      setError(
        import.meta.env.PROD
          ? "Can't connect to the backend server. Render may take 30–50s to wake up on free tier—please retry or refresh."
          : "Can't connect to the API. Start the backend with npm run dev."
      );
    }
    finally { setLoading(false); }
  }
  async function selectDataset(id:number, list=datasets) {
    try {
      setError("");
      const detail = await fetch(`${API}/datasets/${id}`).then(r=>{if(!r.ok) throw new Error("Unable to load dataset"); return r.json();});
      setActive(detail); setRows(detail.rows || []); setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load dataset");
    }
  }
  useEffect(()=>{ loadDatasets(); },[]);
  async function uploadFile(file?:File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Please upload a .csv file."); return; }
    setUploading(true); setError("");
    const body = new FormData(); body.append("file",file);
    try {
      const response = await fetch(`${API}/datasets`,{method:"POST",body});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      await loadDatasets(data.id); setActiveTab("Overview");
    } catch(e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); if(fileRef.current) fileRef.current.value=""; }
  }
  async function deleteDataset() {
    if (!active || !confirm(`Delete "${active.name}" permanently?`)) return;
    try {
      const res = await fetch(`${API}/datasets/${active.id}`,{method:"DELETE"});
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || "Delete failed");
      }
      await loadDatasets();
    } catch(e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }
  const stats = active?.summary.stats || [];
  const numericStats = stats.filter(s=>s.type==="Numeric");
  const mainNumeric = numericStats[0];
  const chartData = useMemo(()=>{
    if (!active) return [];
    const num = numericStats[0]?.name;
    const label = active.columns.find(c=>!numericStats.some(s=>s.name===c)) || active.columns[0];
    return rows.slice(0,30).map((r,i)=>({ label:String(r[label] || `Row ${i+1}`), value:Number(String(r[num||""]).replace(/,/g,"")) || 0 }));
  },[active,rows]);
  const categoryColumn = useMemo(() => {
    if (!active) return null;
    return findCategoricalColumn(active.columns, stats, rows);
  }, [active, stats, rows]);
  const categoryData = useMemo(() => {
    if (!active || !categoryColumn) return [];
    const counts = new Map<string, number>();
    rows.forEach(r => {
      const val = String(r[categoryColumn] ?? "").trim();
      const key = val || "Missing";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [active, categoryColumn, rows]);
  const filtered = useMemo(()=>rows.filter(r=>active?.columns.some(c=>String(r[c]??"").toLowerCase().includes(query.toLowerCase()))),[rows,query,active]);
  const totalPages = Math.max(1,Math.ceil(filtered.length/pageSize));
  const pageRows = filtered.slice((page-1)*pageSize,page*pageSize);
  const completeness = active && active.rowCount*active.columnCount ? Math.round((1-active.summary.missing/(active.rowCount*active.columnCount))*100) : 0;
  const nav = [{name:"Overview",icon:LayoutDashboard},{name:"Data explorer",icon:Database},{name:"Insights",icon:Sparkles}];
  const activeTitle = active?.name || "No dataset selected";

  return <div className="app-shell">
    {sidebarOpen && <div className="sidebar-backdrop" onClick={()=>setSidebarOpen(false)}/>}
    <aside className={`sidebar ${sidebarOpen?"open":""}`}>
      <div className="brand"><div className="brand-mark"><Activity size={20}/></div><span>data<span className="brand-light">insight</span></span><button className="mobile-close" onClick={()=>setSidebarOpen(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(item=><button key={item.name} className={`nav-item ${activeTab===item.name?"selected":""}`} onClick={()=>{setActiveTab(item.name);setSidebarOpen(false);}}><item.icon size={18}/><span>{item.name}</span>{item.name==="Insights"&&<span className="new-pill">NEW</span>}</button>)}</nav>
      <div className="side-divider"/>
      <div className="workspace-label dataset-heading"><span>YOUR DATASETS</span><div className="dataset-heading-actions"><button title="Try sample datasets" onClick={()=>setSampleModalOpen(true)}><Sparkles size={13}/></button><button title="Upload dataset" onClick={()=>fileRef.current?.click()}><Plus size={15}/></button></div></div>
      <div className="dataset-list">{datasets.map(d=><button key={d.id} className={`dataset-item ${active?.id===d.id?"current":""}`} onClick={()=>selectDataset(d.id)}><FileSpreadsheet size={16}/><span>{d.name}</span><small>{d.rowCount}</small></button>)}</div>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><div><b>Need a hand?</b><span>Explore the quick guide</span></div><ChevronRight size={16}/></div><div className="profile"><div className="avatar">L</div><div className="profile-copy"><b>Leena</b><span>Free workspace</span></div><MoreHorizontal size={19}/></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><button className="hamburger" onClick={()=>setSidebarOpen(true)}><Menu/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{activeTab}</b></div><div className="top-actions"><span className="status-dot"/> <span className="saved-label">All changes saved</span><button className="icon-button" title="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">L</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">DATA WORKSPACE <span> / </span> {activeTab.toUpperCase()}</div><h1>{activeTab==="Overview"?"Good afternoon, Leena":activeTab}</h1><p>{activeTab==="Overview"?"Here’s what’s happening with your data today.":activeTab==="Data explorer"?"Inspect, search and understand every row in your dataset.":"Discover patterns and useful takeaways from your data."}</p></div><div className="heading-actions"><button className="btn btn-outline" onClick={()=>setSampleModalOpen(true)}><Sparkles size={15}/> Load Demo Data</button><button className="btn btn-outline" onClick={()=>active&&window.open(`${API}/datasets/${active.id}/export`,"_blank")} disabled={!active}><Download size={16}/> Export CSV</button><button className="btn btn-primary" onClick={()=>fileRef.current?.click()}><CloudUpload size={17}/> Upload dataset</button><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e=>uploadFile(e.target.files?.[0])}/></div></div>
        {error&&<div className="alert"><span>{error}</span><div style={{display:"flex",gap:"8px",alignItems:"center"}}><button className="alert-retry" style={{border:0,background:"#fff",padding:"3px 9px",borderRadius:"5px",fontSize:"10px",fontWeight:700,cursor:"pointer",color:"#b75a50",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}} onClick={()=>loadDatasets()}>Retry</button><button onClick={()=>setError("")}><X size={16}/></button></div></div>}
        {uploading&&<div className="upload-progress"><span/> Uploading and analyzing your CSV…</div>}
        {loading?<div className="loading">Preparing your workspace…</div>:!active?<div className="empty-state"><div className="empty-icon"><FileSpreadsheet size={30}/></div><h2>Start with your first dataset</h2><p>Upload a CSV file or choose a realistic sample dataset to explore instant analytics.</p><div className="empty-actions"><button className="btn btn-outline" onClick={()=>setSampleModalOpen(true)}><Sparkles size={16}/> Try Sample Dataset</button><button className="btn btn-primary" onClick={()=>fileRef.current?.click()}><CloudUpload size={17}/> Upload CSV</button></div></div>:<>
          <div className="dataset-banner"><div className="file-icon"><FileSpreadsheet size={20}/></div><div className="dataset-meta"><b>{activeTitle}</b><span><span className="green-dot"/> Active dataset <span className="meta-sep">·</span> {active.columnCount} columns <span className="meta-sep">·</span> Updated {new Date(active.createdAt).toLocaleDateString()}</span></div><button className="select-dataset" onClick={()=>setActiveTab("Data explorer")}>Explore data <ChevronDown size={15}/></button><button className="more-dataset" onClick={deleteDataset} title="Delete dataset"><Trash2 size={17}/></button></div>
          {activeTab==="Overview"&&<Overview active={active} completeness={completeness} numericStats={numericStats} mainNumeric={mainNumeric} chartData={chartData} categoryData={categoryData} categoryColumn={categoryColumn} stats={stats}/>}
          {activeTab==="Data explorer"&&<section className="panel table-panel"><div className="panel-heading"><div><h2>Dataset preview</h2><p>Showing {fmt(filtered.length)} matching rows · {active.columnCount} columns</p></div><div className="table-tools"><div className="search-box"><Search size={16}/><input placeholder="Search all columns…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></div><button className="btn btn-outline small" onClick={()=>{setQuery("");setPage(1);}}><Filter size={15}/> Clear</button></div></div><div className="table-wrap"><table><thead><tr>{active.columns.map(c=><th key={c}>{c}<span className="column-type">{stats.find(s=>s.name===c)?.type==="Numeric"?"123":"Aa"}</span></th>)}</tr></thead><tbody>{pageRows.length>0?pageRows.map((r,i)=><tr key={i}>{active.columns.map(c=><td key={c}>{String(r[c]??"")||<span className="missing">Missing</span>}</td>)}</tr>):<tr><td colSpan={active.columns.length} style={{textAlign:"center",padding:"28px",color:"#969bad",fontStyle:"italic"}}>No records found{query?` matching "${query}"`:""}.</td></tr>}</tbody></table></div><div className="table-footer"><span>Page {page} of {totalPages}</span><div><button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/></button><button className="page-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={16}/></button></div></div></section>}
          {activeTab==="Insights"&&<Insights stats={stats} active={active} completeness={completeness}/>}
        </>}
        <footer>© 2026 DataInsight <span>Built for curious minds.</span><a href="https://www.papaparse.com/" target="_blank" rel="noreferrer">CSV parsing powered by PapaParse</a></footer>
      </div>
    </main>
    {sampleModalOpen && (
      <div className="modal-backdrop" onClick={()=>setSampleModalOpen(false)}>
        <div className="sample-modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sample-modal-title">
          <div className="sample-modal-header">
            <div>
              <h2 id="sample-modal-title">Explore Sample Datasets</h2>
              <p>Select a pre-built realistic dataset to test analytics, charts, and data explorer instantly.</p>
            </div>
            <button className="sample-close-btn" onClick={()=>setSampleModalOpen(false)} aria-label="Close dialog">
              <X size={18}/>
            </button>
          </div>
          <div className="sample-grid">
            {SAMPLE_DATASETS.map(sample => (
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
                  <button
                    className="btn btn-outline"
                    title={`Download ${sample.filename}`}
                    onClick={(e)=>downloadSample(e, sample)}
                  >
                    <Download size={14}/> Download CSV
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={()=>loadSample(sample)}
                  >
                    <Sparkles size={14}/> Load Dataset
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>;
}

function Overview({active,completeness,numericStats,mainNumeric,chartData,categoryData,categoryColumn,stats}:{active:Dataset;completeness:number;numericStats:ColumnStat[];mainNumeric?:ColumnStat;chartData:any[];categoryData:any[];categoryColumn?:string|null;stats:ColumnStat[]}) {
  const [chartMode,setChartMode] = useState("line");
  return <>
    <div className="section-title"><div><h2>Dataset at a glance</h2><p>A quick overview of your data health and key metrics.</p></div><span className="date-chip"> <Activity size={14}/> Live analysis</span></div>
    <div className="metrics-grid">
      <Metric icon={<Database/>} label="Total records" value={fmt(active.rowCount)} note="Rows in this dataset" tone="purple"/>
      <Metric icon={<LayoutDashboard/>} label="Total columns" value={fmt(active.columnCount)} note={`${numericStats.length} numeric fields`} tone="teal"/>
      <Metric icon={<Filter/>} label="Missing values" value={fmt(active.summary.missing)} note={active.summary.missing?"Needs attention":"No missing data found"} tone="orange"/>
      <Metric icon={<Check/>} label="Data completeness" value={`${completeness}%`} note="Based on non-empty cells" tone="pink"/>
    </div>
    <div className="chart-grid">
      <section className="panel trend-panel"><div className="panel-heading"><div><h2>Data distribution</h2><p>{mainNumeric?`Trend across ${mainNumeric.name}`:"Your first column values"}</p></div><div className="segmented"><button className={chartMode==="line"?"on":""} onClick={()=>setChartMode("line")}>Line</button><button className={chartMode==="bar"?"on":""} onClick={()=>setChartMode("bar")}>Bar</button></div></div>
        <div className="chart-legend"><span><i/> {mainNumeric?.name||"Value"}</span><small>First 30 records</small></div>
        <div className="chart-area">{chartData.length && mainNumeric ? <ResponsiveContainer width="100%" height="100%">{chartMode==="line"?<LineChart data={chartData} margin={{top:10,right:10,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f6"/><XAxis dataKey="label" tick={{fontSize:11,fill:"#9098aa"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#9098aa"}} axisLine={false} tickLine={false} width={48}/><Tooltip contentStyle={{border:"1px solid #edf0f6",borderRadius:12,fontSize:12}}/><Line type="monotone" dataKey="value" stroke="#7068ed" strokeWidth={3} dot={{r:3,fill:"#7068ed",strokeWidth:2,stroke:"#fff"}} activeDot={{r:6}}/></LineChart>:<BarChart data={chartData} margin={{top:10,right:10,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f6"/><XAxis dataKey="label" tick={{fontSize:11,fill:"#9098aa"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#9098aa"}} axisLine={false} tickLine={false} width={48}/><Tooltip/><Bar dataKey="value" fill="#7068ed" radius={[5,5,0,0]}/></BarChart>}</ResponsiveContainer>:<div className="chart-empty">No numeric data available for a trend chart.</div>}</div>
      </section>
      <section className="panel category-panel"><div className="panel-heading"><div><h2>Category breakdown</h2><p>{categoryColumn?`Distribution across ${categoryColumn}`:"Distribution of values in a text field"}</p></div><button className="dots"><MoreHorizontal size={19}/></button></div><div className="pie-area">{categoryData.length?<><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={91} paddingAngle={3} stroke="none">{categoryData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{border:"1px solid #edf0f6",borderRadius:12,fontSize:12}} formatter={(value: any) => [`${value} records`, "Count"]} /></PieChart></ResponsiveContainer><div className="pie-center"><b>{fmt(active.rowCount)}</b><span>records</span></div></>:<div className="chart-empty">No suitable categories found for breakdown.</div>}</div><div className="legend-list">{categoryData.slice(0,4).map((c,i)=><div key={c.name} title={`${c.name}: ${c.value} records`}><span><i style={{background:COLORS[i%COLORS.length]}}/>{c.name}</span><b>{c.value} ({Math.round(c.value/(active.rowCount||1)*100)}%)</b></div>)}</div></section>
    </div>
    <section className="panel fields-panel"><div className="panel-heading"><div><h2>Column insights</h2><p>Statistical summary for each field in your dataset.</p></div><span className="field-count">{stats.length} fields</span></div><div className="fields-table-wrap"><table className="fields-table"><thead><tr><th>Column name</th><th>Type</th><th>Missing</th><th>Unique</th><th>Mean</th><th>Median</th><th>Mode</th></tr></thead><tbody>{stats.map(s=><tr key={s.name}><td><b>{s.name}</b></td><td><span className={`type-tag ${s.type.toLowerCase()}`}>{s.type==="Numeric"?"123":"Aa"} {s.type}</span></td><td>{s.missing? <span className="warn-number">{s.missing}</span>:"—"}</td><td>{fmt(s.unique)}</td><td>{s.mean===null?"—":s.mean.toLocaleString("en-IN",{maximumFractionDigits:2})}</td><td>{s.median===null?"—":s.median.toLocaleString("en-IN",{maximumFractionDigits:2})}</td><td className="mode-cell">{s.mode}</td></tr>)}</tbody></table></div></section>
  </>;
}

function Metric({icon,label,value,note,tone}:{icon:React.ReactNode;label:string;value:string;note:string;tone:string}) {return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}>{icon}</div></div><strong>{value}</strong><small>{note}</small></div>}

function Insights({stats,active,completeness}:{stats:ColumnStat[];active:Dataset;completeness:number}) {
  const numeric=stats.filter(s=>s.type==="Numeric");
  return <div className="insights-grid"><section className="panel insight-main"><div className="insight-header"><div className="insight-spark"><Sparkles size={20}/></div><div><h2>Analysis summary</h2><p>Automated observations from your dataset</p></div></div><div className="insight-item"><span className="insight-number">01</span><div><b>Dataset structure</b><p><strong>{fmt(active.rowCount)} records</strong> across <strong>{active.columnCount} columns</strong>. We identified {numeric.length} numeric fields and {stats.length-numeric.length} text or categorical fields.</p></div></div><div className="insight-item"><span className="insight-number">02</span><div><b>Data quality</b><p>Your dataset is <strong>{completeness}% complete</strong>, with {active.summary.missing} missing cells and {active.summary.duplicates} duplicate rows.</p></div></div>{numeric.map((s,i)=><div className="insight-item" key={s.name}><span className="insight-number">{String(i+3).padStart(2,"0")}</span><div><b>{s.name} · numeric summary</b><p>Values range from <strong>{s.min?.toLocaleString("en-IN")}</strong> to <strong>{s.max?.toLocaleString("en-IN")}</strong>, with an average of <strong>{s.mean?.toLocaleString("en-IN",{maximumFractionDigits:2})}</strong>.</p></div></div>)}</section><section className="panel quality-panel"><h2>Data quality score</h2><p>Percentage of cells containing a value.</p><div className="quality-ring" style={{background:`conic-gradient(#35b7a4 ${completeness*3.6}deg,#edf0f6 0deg)`}}><div><b>{completeness}%</b><span>Complete</span></div></div><div className="quality-row"><span>Missing cells</span><b>{fmt(active.summary.missing)}</b></div><div className="quality-row"><span>Duplicate rows</span><b>{fmt(active.summary.duplicates)}</b></div><div className="quality-row"><span>Numeric columns</span><b>{numeric.length}</b></div></section></div>;
}
