import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/hooks/use-language";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Cell
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
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}
async function fetchRiskForecast(payload: { weekData: any[]; avgScore: number; lang: string }) {
  const r = await fetch(`${API}/statistics/risk-forecast`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}

const COLORS = { score: "#00ff41", steps: "#22d3ee", sleep: "#818cf8", heart: "#f43f5e" };

const RISK_CONFIG = {
  low:    { color: "#00ff41", bg: "rgba(0,255,65,0.04)",    border: "rgba(0,255,65,0.2)",    icon: ShieldCheck,  label_key: "forecast_risk_low"    },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.04)",   border: "rgba(234,179,8,0.2)",   icon: ShieldAlert,  label_key: "forecast_risk_medium" },
  high:   { color: "#f43f5e", bg: "rgba(244,63,94,0.04)",   border: "rgba(244,63,94,0.2)",   icon: AlertCircle,  label_key: "forecast_risk_high"   },
};

/* ── Minimal tooltip ── */
const MinimalTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 border border-white/8 font-mono text-xs shadow-xl">
      <p className="text-muted-foreground mb-1.5 text-[10px] uppercase tracking-wider">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

/* ── Stat card ── */
function StatCard({ label, value, unit, color, icon: Icon, delay = 0 }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className="glass-card rounded-2xl p-4 relative overflow-hidden"
    >
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />}
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{value ?? "--"}</span>
        <span className="text-xs text-muted-foreground font-mono">{unit}</span>
      </div>
    </motion.div>
  );
}

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

  const insightMutation = useMutation({ mutationFn: fetchInsight, onSuccess: (d) => setInsight(d.insight || "") });
  const forecastMutation = useMutation({ mutationFn: fetchRiskForecast, onSuccess: (d) => setForecast(d) });

  const handleInsight  = () => summary && insightMutation.mutate({ period, avgScore: summary.avgScore, trend: summary.trend, lang });
  const handleForecast = () => history.length && summary && forecastMutation.mutate({ weekData: history.slice(0, 7), avgScore: summary.avgScore, lang });

  const periods: { key: Period; label: string }[] = [
    { key: "day", label: t.period_day },
    { key: "week", label: t.period_week },
    { key: "month", label: t.period_month },
  ];

  const riskCfg = forecast ? RISK_CONFIG[forecast.overallRisk as keyof typeof RISK_CONFIG] || RISK_CONFIG.low : null;
  const RiskIcon = riskCfg?.icon;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight neon-text mb-1 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            {t.stats_title}
          </h1>
          <p className="text-muted-foreground text-sm">{t.stats_subtitle}</p>
        </div>
        <div className="flex items-center gap-1 glass-card rounded-xl border-none p-1">
          {periods.map(({ key, label }) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-mono font-bold transition-all duration-200 ${
                period === key
                  ? "bg-primary text-black shadow-[0_0_12px_rgba(0,200,80,0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t.avg_score_label} value={sumLoading ? null : summary?.avgScore} unit="/100" color={COLORS.score} delay={0} />
        <StatCard
          label={t.trend_label}
          value={sumLoading ? null : (summary?.trend > 0 ? "+" : "") + summary?.trend}
          unit="pts" color={summary?.trend >= 0 ? COLORS.score : "#f43f5e"}
          icon={summary?.trend >= 0 ? TrendingUp : TrendingDown} delay={0.06}
        />
        <StatCard label={t.best_label}  value={sumLoading ? null : summary?.bestScore}  unit="/100" color={COLORS.steps}  delay={0.12} />
        <StatCard label={t.worst_label} value={sumLoading ? null : summary?.worstScore} unit="/100" color={COLORS.heart}  delay={0.18} />
      </div>

      {/* ── Health Score Area Chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest">{t.chart_score}</span>
        </div>
        {histLoading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={COLORS.score} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={COLORS.score} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<MinimalTooltip />} />
              <Area type="monotone" dataKey="score" name={t.chart_score}
                stroke={COLORS.score} fill="url(#scoreGrad)"
                strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* ── Steps / Sleep / Heart ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: t.chart_steps, color: COLORS.steps, delay: 0.25,
            chart: (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={history} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <Tooltip content={<MinimalTooltip />} />
                  <Bar dataKey="steps" name={t.chart_steps} fill={COLORS.steps} radius={[4, 4, 0, 0]} opacity={0.75} />
                </BarChart>
              </ResponsiveContainer>
            ),
          },
          {
            title: t.chart_sleep, color: COLORS.sleep, delay: 0.32,
            chart: (
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={history} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <Tooltip content={<MinimalTooltip />} />
                  <Line type="monotone" dataKey="sleepQuality" name={t.chart_sleep}
                    stroke={COLORS.sleep} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ),
          },
          {
            title: t.chart_heart, color: COLORS.heart, delay: 0.39,
            chart: (
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={history} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="heartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={COLORS.heart} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={COLORS.heart} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={<MinimalTooltip />} />
                  <Area type="monotone" dataKey="heartRate" name={t.chart_heart}
                    stroke={COLORS.heart} fill="url(#heartGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ),
          },
        ].map(({ title, color, delay, chart }) => (
          <motion.div key={title}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="glass-card rounded-2xl p-4 relative overflow-hidden"
          >
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
            </div>
            {histLoading
              ? <div className="h-[130px] flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary/50" /></div>
              : chart
            }
          </motion.div>
        ))}
      </div>

      {/* ── AI Risk Forecast ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl p-6 relative overflow-hidden"
        style={{ borderColor: "rgba(234,179,8,0.15)" }}
      >
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <h3 className="font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-yellow-400" />
            {t.forecast_title}
          </h3>
          <Button onClick={handleForecast}
            disabled={forecastMutation.isPending || !summary || histLoading}
            className="font-mono text-sm rounded-xl"
            style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", color: "#fde047" }}
          >
            {forecastMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.forecast_loading}</>
              : <><Activity className="w-4 h-4 mr-2" />{t.forecast_btn}</>
            }
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {forecast && riskCfg && RiskIcon ? (
            <motion.div key="forecast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-xl border"
                style={{ background: riskCfg.bg, borderColor: riskCfg.border }}>
                <div className="w-14 h-14 relative flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="60%" outerRadius="100%"
                      data={[{ value: forecast.riskScore, fill: riskCfg.color }]}
                      startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "rgba(255,255,255,0.04)" }}>
                        <Cell fill={riskCfg.color} />
                      </RadialBar>
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono font-bold text-xs" style={{ color: riskCfg.color }}>{forecast.riskScore}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xl mb-1 tracking-tight" style={{ color: riskCfg.color }}>
                    {t[riskCfg.label_key as keyof typeof t]}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">{forecast.forecast7days}</p>
                </div>
                <RiskIcon className="w-7 h-7 flex-shrink-0" style={{ color: riskCfg.color }} />
              </div>

              {(forecast.diseases || []).length > 0 && (
                <div>
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Прогноз по направлениям</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {(forecast.diseases || []).map((d: any, i: number) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="bg-black/25 rounded-xl p-3 border border-white/5 flex items-center gap-3"
                      >
                        <span className="text-xl">{d.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs font-bold truncate mb-1">{d.name}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${d.probability}%` }}
                                transition={{ duration: 0.8, delay: 0.3 + i * 0.06 }}
                                className="h-full rounded-full"
                                style={{ background: d.probability < 30 ? COLORS.score : d.probability < 60 ? "#eab308" : COLORS.heart }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold tabular-nums w-8 text-right" style={{
                              color: d.probability < 30 ? COLORS.score : d.probability < 60 ? "#eab308" : COLORS.heart
                            }}>{d.probability}%</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {d.trend === "growing" ? "↑" : d.trend === "declining" ? "↓" : "→"}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {forecast.preventionTip && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-3.5 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">{forecast.preventionTip}</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-black/15 rounded-xl p-8 border border-dashed border-yellow-500/15 text-center">
              <Activity className="w-7 h-7 text-yellow-500/25 mx-auto mb-2" />
              <p className="text-xs font-mono text-muted-foreground/50">{t.forecast_btn} →</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── AI Insight ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48 }}
        className="glass-card rounded-2xl p-6 relative overflow-hidden"
        style={{ borderColor: "rgba(0,255,65,0.12)" }}
      >
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="font-bold tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-primary" />
            {t.ai_insight_title}
          </h3>
          <Button onClick={handleInsight} disabled={insightMutation.isPending || !summary}
            className="font-mono font-bold bg-primary text-black hover:bg-primary/90 rounded-xl glow-btn">
            {insightMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.ai_insight_loading}</>
              : <><Star className="w-4 h-4 mr-2" />{t.ai_insight_btn}</>
            }
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {insight ? (
            <motion.div key="insight"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-black/30 rounded-xl p-4 border border-white/5 font-mono text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {insight}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-black/15 rounded-xl p-8 border border-dashed border-white/8 text-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs font-mono text-muted-foreground/40">{t.ai_insight_btn} →</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
