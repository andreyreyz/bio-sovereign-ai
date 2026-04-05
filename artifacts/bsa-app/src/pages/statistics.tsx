import { useState } from "react";
import { useLang } from "@/hooks/use-language";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Cell
} from "recharts";
import {
  BarChart3, TrendingUp, TrendingDown, BrainCircuit,
  Loader2, Star, AlertCircle, Activity, ShieldAlert, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Period = "day" | "week" | "month";

const API = "/api";

async function fetchHistory(period: Period) {
  const r = await fetch(`${API}/statistics/history?period=${period}`);
  return r.json();
}
async function fetchSummary() {
  const r = await fetch(`${API}/statistics/summary`);
  return r.json();
}
async function fetchInsight(payload: { period: string; avgScore: number; trend: number; lang: string }) {
  const r = await fetch(`${API}/statistics/ai-insight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}
async function fetchRiskForecast(payload: { weekData: any[]; avgScore: number; lang: string }) {
  const r = await fetch(`${API}/statistics/risk-forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}

const CHART_COLORS = {
  score:  "#00ff80",
  steps:  "#22d3ee",
  sleep:  "#818cf8",
  heart:  "#f43f5e",
};

const RISK_CONFIG = {
  low:    { color: "#00ff80", bg: "bg-primary/10",      border: "border-primary/40",      icon: ShieldCheck,   label_key: "forecast_risk_low"    },
  medium: { color: "#eab308", bg: "bg-yellow-500/10",   border: "border-yellow-500/40",   icon: ShieldAlert,   label_key: "forecast_risk_medium" },
  high:   { color: "#f43f5e", bg: "bg-destructive/10",  border: "border-destructive/40",  icon: AlertCircle,   label_key: "forecast_risk_high"   },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/90 border border-primary/30 rounded-lg p-3 font-mono text-xs">
      <p className="text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function Statistics() {
  const { t, lang } = useLang();
  const [period, setPeriod] = useState<Period>("week");
  const [insight, setInsight] = useState<string>("");
  const [forecast, setForecast] = useState<any>(null);

  const { data: history = [], isLoading: histLoading } = useQuery({
    queryKey: ["stats-history", period],
    queryFn: () => fetchHistory(period),
  });

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ["stats-summary"],
    queryFn: fetchSummary,
  });

  const insightMutation = useMutation({
    mutationFn: fetchInsight,
    onSuccess: (data) => setInsight(data.insight || ""),
  });

  const forecastMutation = useMutation({
    mutationFn: fetchRiskForecast,
    onSuccess: (data) => setForecast(data),
  });

  const handleInsight = () => {
    if (!summary) return;
    insightMutation.mutate({ period, avgScore: summary.avgScore, trend: summary.trend, lang });
  };

  const handleForecast = () => {
    if (!history.length || !summary) return;
    forecastMutation.mutate({ weekData: history.slice(0, 7), avgScore: summary.avgScore, lang });
  };

  const periods: { key: Period; label: string }[] = [
    { key: "day",   label: t.period_day },
    { key: "week",  label: t.period_week },
    { key: "month", label: t.period_month },
  ];

  const riskCfg = forecast ? RISK_CONFIG[forecast.overallRisk as keyof typeof RISK_CONFIG] || RISK_CONFIG.low : null;
  const RiskIcon = riskCfg?.icon;

  const trendColors: Record<string, string> = {
    growing: "text-destructive",
    stable: "text-yellow-400",
    declining: "text-primary",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tighter neon-text mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            {t.stats_title}
          </h1>
          <p className="text-muted-foreground font-mono text-sm">{t.stats_subtitle}</p>
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg border border-border p-1">
          {periods.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-4 py-1.5 rounded text-sm font-mono font-bold transition-colors ${
                period === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.avg_score_label, value: sumLoading ? "--" : summary?.avgScore, unit: "/100", color: "text-primary" },
          {
            label: t.trend_label,
            value: sumLoading ? "--" : (summary?.trend > 0 ? "+" : "") + summary?.trend,
            unit: "pts",
            color: summary?.trend >= 0 ? "text-primary" : "text-destructive",
            icon: summary?.trend >= 0 ? TrendingUp : TrendingDown,
          },
          { label: t.best_label,  value: sumLoading ? "--" : summary?.bestScore,  unit: "/100", color: "text-cyan-400" },
          { label: t.worst_label, value: sumLoading ? "--" : summary?.worstScore, unit: "/100", color: "text-rose-400" },
        ].map(({ label, value, unit, color, icon: Icon }) => (
          <div key={label} className="glass-panel p-4 rounded-xl">
            <p className="text-xs font-mono text-muted-foreground uppercase mb-1">{label}</p>
            <div className="flex items-center gap-2">
              {Icon && <Icon className={`w-4 h-4 ${color}`} />}
              <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
              <span className="text-xs text-muted-foreground font-mono">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Health Score Chart */}
      <div className="glass-panel p-6 rounded-xl">
        <h3 className="font-mono font-bold text-sm mb-4 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          {t.chart_score}
        </h3>
        {histLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground font-mono text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" /> LOADING...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff80" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "monospace", fill: "#6b7a72" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: "monospace", fill: "#6b7a72" }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" name={t.chart_score} stroke={CHART_COLORS.score} fill="url(#scoreGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Steps + Sleep + Heart Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl">
          <h3 className="font-mono font-bold text-xs mb-4 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS.steps }}></div>
            {t.chart_steps}
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={history} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: "monospace", fill: "#6b7a72" }} />
              <YAxis tick={{ fontSize: 9, fontFamily: "monospace", fill: "#6b7a72" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="steps" name={t.chart_steps} fill={CHART_COLORS.steps} radius={[3, 3, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <h3 className="font-mono font-bold text-xs mb-4 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS.sleep }}></div>
            {t.chart_sleep}
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: "monospace", fill: "#6b7a72" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontFamily: "monospace", fill: "#6b7a72" }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="sleepQuality" name={t.chart_sleep} stroke={CHART_COLORS.sleep} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <h3 className="font-mono font-bold text-xs mb-4 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS.heart }}></div>
            {t.chart_heart}
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={history} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="heartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.heart} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.heart} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: "monospace", fill: "#6b7a72" }} />
              <YAxis tick={{ fontSize: 9, fontFamily: "monospace", fill: "#6b7a72" }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="heartRate" name={t.chart_heart} stroke={CHART_COLORS.heart} fill="url(#heartGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== AI RISK FORECAST ===== */}
      <div className="glass-panel p-6 rounded-xl border border-yellow-500/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <h3 className="font-mono font-bold text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-yellow-400" />
            {t.forecast_title}
          </h3>
          <Button
            onClick={handleForecast}
            disabled={forecastMutation.isPending || !summary || histLoading}
            className="font-mono bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30"
            variant="outline"
          >
            {forecastMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.forecast_loading}</>
            ) : (
              <><Activity className="w-4 h-4 mr-2" />{t.forecast_btn}</>
            )}
          </Button>
        </div>

        {forecast && riskCfg && RiskIcon ? (
          <div className="animate-in fade-in duration-500 space-y-5">
            {/* Overall Risk */}
            <div className={`flex items-center gap-4 p-4 rounded-xl ${riskCfg.bg} border ${riskCfg.border}`}>
              <div className="w-16 h-16 relative flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ value: forecast.riskScore, fill: riskCfg.color }]} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "rgba(255,255,255,0.05)" }}>
                      <Cell fill={riskCfg.color} />
                    </RadialBar>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono font-bold text-xs" style={{ color: riskCfg.color }}>{forecast.riskScore}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="font-mono font-bold text-xl mb-1" style={{ color: riskCfg.color }}>
                  {t[riskCfg.label_key as keyof typeof t]}
                </div>
                <p className="text-xs font-mono text-muted-foreground leading-relaxed">{forecast.forecast7days}</p>
              </div>
              <RiskIcon className="w-8 h-8 flex-shrink-0" style={{ color: riskCfg.color }} />
            </div>

            {/* Disease Risks */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase mb-3">Прогноз по направлениям</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(forecast.diseases || []).map((d: any, i: number) => (
                  <div key={i} className="bg-black/30 rounded-lg p-3 border border-white/5 flex items-center gap-3">
                    <span className="text-2xl">{d.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-bold truncate">{d.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${d.probability}%`,
                              background: d.probability < 30 ? "#00ff80" : d.probability < 60 ? "#eab308" : "#f43f5e"
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold" style={{
                          color: d.probability < 30 ? "#00ff80" : d.probability < 60 ? "#eab308" : "#f43f5e"
                        }}>{d.probability}%</span>
                      </div>
                    </div>
                    <span className={`text-xs font-mono ${trendColors[d.trend] || "text-muted-foreground"}`}>
                      {d.trend === "growing" ? "↑" : d.trend === "declining" ? "↓" : "→"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prevention Tip */}
            {forecast.preventionTip && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs font-mono text-foreground leading-relaxed">{forecast.preventionTip}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-black/20 rounded-lg p-6 border border-dashed border-yellow-500/20 text-center">
            <Activity className="w-8 h-8 text-yellow-500/30 mx-auto mb-2" />
            <p className="text-xs font-mono text-muted-foreground">{t.forecast_btn} →</p>
          </div>
        )}
      </div>

      {/* AI Insight */}
      <div className="glass-panel p-6 rounded-xl border border-primary/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="font-mono font-bold flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            {t.ai_insight_title}
          </h3>
          <Button
            onClick={handleInsight}
            disabled={insightMutation.isPending || !summary}
            className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,128,0.3)]"
          >
            {insightMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.ai_insight_loading}</>
            ) : (
              <><Star className="w-4 h-4 mr-2" />{t.ai_insight_btn}</>
            )}
          </Button>
        </div>
        {insight ? (
          <div className="bg-black/40 rounded-lg p-4 border border-white/5 font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground animate-in fade-in duration-500">
            {insight}
          </div>
        ) : (
          <div className="bg-black/20 rounded-lg p-6 border border-dashed border-border text-center">
            <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs font-mono text-muted-foreground">{t.ai_insight_btn} →</p>
          </div>
        )}
      </div>
    </div>
  );
}
