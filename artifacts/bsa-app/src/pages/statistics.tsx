import { useState } from "react";
import { useLang } from "@/hooks/use-language";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { BarChart3, TrendingUp, TrendingDown, BrainCircuit, Loader2, Star, AlertCircle } from "lucide-react";
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

const CHART_COLORS = {
  score:  "#00ff80",
  steps:  "#22d3ee",
  sleep:  "#818cf8",
  heart:  "#f43f5e",
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

  const handleInsight = () => {
    if (!summary) return;
    insightMutation.mutate({
      period,
      avgScore: summary.avgScore,
      trend: summary.trend,
      lang,
    });
  };

  const periods: { key: Period; label: string }[] = [
    { key: "day",   label: t.period_day },
    { key: "week",  label: t.period_week },
    { key: "month", label: t.period_month },
  ];

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
        {/* Period filter */}
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
        {/* Steps */}
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

        {/* Sleep */}
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

        {/* Heart Rate */}
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
