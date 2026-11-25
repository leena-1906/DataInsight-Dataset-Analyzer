import { AlertTriangle, CheckCircle2, Info, ShieldAlert, Sparkles } from "lucide-react";
import { AnalysisInsight } from "../../types/dataset";

interface AutoInsightsPanelProps {
  insights: AnalysisInsight[];
}

export function AutoInsightsPanel({ insights }: AutoInsightsPanelProps) {
  return (
    <section className="panel auto-insights-panel">
      <div className="panel-heading">
        <div className="insight-header-inline">
          <div className="insight-spark">
            <Sparkles size={19} />
          </div>
          <div>
            <h2>Automatic data insights</h2>
            <p>Generated dynamically from actual database records and calculated statistics.</p>
          </div>
        </div>
        <span className="field-count">{insights.length} findings</span>
      </div>

      <div className="auto-insights-grid">
        {insights.map(item => {
          const Icon =
            item.tone === "positive"
              ? CheckCircle2
              : item.tone === "warning"
                ? AlertTriangle
                : item.tone === "alert"
                  ? ShieldAlert
                  : Info;

          return (
            <article key={item.id} className={`auto-insight-card tone-${item.tone}`}>
              <div className="auto-insight-top">
                <span className="auto-insight-badge">
                  <Icon size={13} />
                  <span>{item.title}</span>
                </span>
                <strong className="auto-insight-metric">{item.metric}</strong>
              </div>
              <p>{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
