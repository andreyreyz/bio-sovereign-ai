import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/hooks/use-wallet";
import { useLang } from "@/hooks/use-language";
import {
  useGetCurrentVitals,
  getGetCurrentVitalsQueryKey,
  useAnalyzeVitals,
  useClaimReward,
  getGetRewardsHistoryQueryKey,
  useHealthCheck
} from "@workspace/api-client-react";
import { AiVerdict } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Activity, Heart, Footprints, Moon, BrainCircuit,
  ShieldCheck, AlertTriangle, ArrowRight, Loader2, RefreshCw,
  ExternalLink, Zap, Link as LinkIcon
} from "lucide-react";

interface ClaimResult { signature: string; explorerUrl: string; }

/* ── Animated Beam Component ──────────────────────────────────── */
function AnimatedBeam({ active }: { active: boolean }) {
  return (
    <div className="relative w-full h-10 overflow-hidden my-1 flex items-center justify-center">
      <svg width="100%" height="40" viewBox="0 0 400 40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#00ff41" stopOpacity={0} />
            <stop offset="40%"  stopColor="#00ff41" stopOpacity={0.9} />
            <stop offset="60%"  stopColor="#00c8ff" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#00c8ff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="beamGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#00ff41" stopOpacity={0} />
            <stop offset="50%"  stopColor="#00ff80" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#00ff41" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Static dim track */}
        <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(0,255,65,0.06)" strokeWidth="1" />
        {active && (
          <>
            <line x1="0" y1="20" x2="400" y2="20"
              stroke="url(#beamGlowGrad)" strokeWidth="6"
              className="beam-glow" style={{ filter: "blur(4px)" }}
            />
            <line x1="0" y1="20" x2="400" y2="20"
              stroke="url(#beamGrad)" strokeWidth="1.5"
              className="beam-path"
            />
          </>
        )}
      </svg>
      {/* Labels */}
      <div className="absolute left-2 flex items-center gap-1">
        <BrainCircuit className="w-3 h-3 text-primary/50" />
        <span className="text-[8px] font-mono text-primary/40 uppercase tracking-widest">AI</span>
      </div>
      <div className="absolute right-2 flex items-center gap-1">
        <span className="text-[8px] font-mono text-cyan-400/40 uppercase tracking-widest">Chain</span>
        <LinkIcon className="w-3 h-3 text-cyan-400/50" />
      </div>
    </div>
  );
}

/* ── Vital Card ───────────────────────────────────────────────── */
function VitalCard({
  label, value, unit, icon: Icon, iconColor, delay = 0, isLoading
}: {
  label: string; value: string | number | undefined; unit: string;
  icon: any; iconColor: string; delay?: number; isLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className="glass-card rounded-2xl p-5 flex flex-col relative overflow-hidden group"
    >
      {/* Background watermark icon */}
      <div className="absolute -bottom-2 -right-2 opacity-[0.04] pointer-events-none">
        <Icon className="w-20 h-20" />
      </div>
      {/* Top glow line */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-center justify-between mb-5 relative z-10">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.12em]">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${iconColor}12` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
        </div>
      </div>

      <div className="mt-auto relative z-10">
        {isLoading ? (
          <div className="h-9 w-20 bg-white/5 rounded-lg animate-pulse" />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: delay + 0.1 }}
            className="flex items-baseline gap-2"
          >
            <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">{value}</span>
            <span className="text-xs text-muted-foreground font-mono">{unit}</span>
          </motion.div>
        )}
      </div>

      {/* Subtle hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 100%, ${iconColor}06, transparent 70%)` }} />
    </motion.div>
  );
}

/* ── Score Circle ─────────────────────────────────────────────── */
function ScoreCircle({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 100;
  const color = score >= 80 ? "#00ff41" : score >= 50 ? "#eab308" : "#f43f5e";

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
        <motion.circle
          cx="64" cy="64" r={r}
          fill="transparent"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Glow ring */}
        <motion.circle
          cx="64" cy="64" r={r}
          fill="transparent"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `blur(4px)`, opacity: 0.5 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {score}
        </motion.span>
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">/100</span>
      </div>
    </div>
  );
}

/* ── Main Dashboard ───────────────────────────────────────────── */
export default function Dashboard() {
  const { address, connect } = useWallet();
  const { t } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verdict, setVerdict] = useState<AiVerdict | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  const { data: vitals, isLoading: isLoadingVitals } = useGetCurrentVitals({
    query: { refetchInterval: 3000, queryKey: getGetCurrentVitalsQueryKey() }
  });
  const { data: healthStatus } = useHealthCheck();
  const analyzeMutation = useAnalyzeVitals();
  const claimMutation = useClaimReward();

  const isAnalyzing = analyzeMutation.isPending;
  const beamActive = isAnalyzing || !!verdict;

  const handleAnalyze = () => {
    if (!vitals) return;
    setClaimResult(null);
    analyzeMutation.mutate({
      data: {
        steps: vitals.steps, heartRate: vitals.heartRate,
        sleepQuality: vitals.sleepQuality, sleepHours: vitals.sleepHours,
        walletAddress: address || undefined
      }
    }, { onSuccess: (data) => setVerdict(data) });
  };

  const handleClaim = () => {
    if (!address || !verdict) return;
    claimMutation.mutate({
      data: { walletAddress: address, healthScore: verdict.score, aiExplanation: verdict.explanation }
    }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetRewardsHistoryQueryKey() });
        setClaimResult({ signature: data.signature, explorerUrl: data.explorerUrl });
        toast({ title: t.tx_success, description: `${t.tx_desc}${data.signature.substring(0, 16)}...` });
      }
    });
  };

  const vitalsData = [
    { label: t.heart_rate, value: vitals?.heartRate, unit: "BPM", icon: Heart, iconColor: "#f43f5e", delay: 0 },
    { label: t.daily_steps, value: vitals?.steps.toLocaleString(), unit: "STEPS", icon: Footprints, iconColor: "#22d3ee", delay: 0.08 },
    { label: t.sleep_quality, value: vitals?.sleepQuality, unit: "/100", icon: Moon, iconColor: "#818cf8", delay: 0.16 },
  ];

  return (
    <div className="container mx-auto px-4 max-w-6xl">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground neon-text mb-1">
            {t.page_title}
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">{t.page_subtitle}</p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-center gap-2.5 glass-card px-4 py-2.5 rounded-xl"
        >
          <div className={`w-2 h-2 rounded-full ${healthStatus ? 'bg-primary animate-pulse' : 'bg-destructive'}`} />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{t.system_status}</span>
          <span className="text-xs font-mono font-bold text-foreground">{healthStatus ? t.operational : t.offline}</span>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-8 space-y-5">

          {/* Section label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono font-bold tracking-tight">{t.live_telemetry}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary bg-primary/8 px-2.5 py-1 rounded-full border border-primary/15">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t.syncing}
            </div>
          </motion.div>

          {/* Vital cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vitalsData.map((v) => (
              <VitalCard key={v.label} {...v} isLoading={isLoadingVitals} />
            ))}
          </div>

          {/* ── AI Oracle Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-card rounded-2xl overflow-hidden relative"
          >
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Scan animation overlay when analyzing */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-2xl"
                >
                  <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={isAnalyzing ? { scale: [1, 1.05, 1], opacity: [1, 0.8, 1] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center border border-primary/20"
                >
                  <BrainCircuit className="w-6 h-6 text-primary" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-base tracking-tight">{t.ai_oracle}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{t.ai_oracle_sub}</p>
                </div>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!vitals || isAnalyzing}
                className="w-full md:w-auto font-mono font-bold bg-primary text-black hover:bg-primary/90 rounded-xl px-6 glow-btn"
                data-testid="button-analyze"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.analyzing}</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" />{t.analyze_btn}</>
                )}
              </Button>
            </div>
          </motion.div>

          {/* ── Animated Beam (AI → Blockchain) ── */}
          <AnimatedBeam active={beamActive} />

        </div>

        {/* ── Right: Verdict Column ── */}
        <div className="lg:col-span-4">
          <div className="sticky top-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-4"
            >
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono font-bold tracking-tight">{t.verdict_title}</span>
            </motion.div>

            <AnimatePresence mode="wait">
              {verdict ? (
                <motion.div
                  key="verdict"
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
                  className={`glass-card rounded-2xl overflow-hidden relative ${
                    verdict.eligible
                      ? 'border-primary/20 shadow-[0_0_40px_rgba(0,200,80,0.08)]'
                      : 'border-destructive/20'
                  }`}
                >
                  {/* Top gradient line */}
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                    verdict.eligible ? 'via-primary/60' : 'via-destructive/60'
                  } to-transparent`} />

                  <div className="p-5">
                    {/* Score circle */}
                    <div className="mb-5 text-center">
                      <ScoreCircle score={verdict.score} />
                      <motion.h3
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className={`font-bold text-lg tracking-tight mt-3 ${verdict.eligible ? 'text-primary' : 'text-destructive'}`}
                      >
                        {verdict.verdict}
                      </motion.h3>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2 text-xs font-mono border"
                        style={{
                          background: verdict.eligible ? 'rgba(0,200,80,0.06)' : 'rgba(239,68,68,0.06)',
                          borderColor: verdict.eligible ? 'rgba(0,200,80,0.25)' : 'rgba(239,68,68,0.25)',
                        }}
                      >
                        {verdict.eligible
                          ? <><ShieldCheck className="w-3 h-3 text-primary" /><span className="text-primary">{t.reward_granted}</span></>
                          : <><AlertTriangle className="w-3 h-3 text-destructive" /><span className="text-destructive">{t.reward_denied}</span></>
                        }
                      </motion.div>
                    </div>

                    {/* Explanation */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-3 mb-4"
                    >
                      <div>
                        <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">{t.ai_reasoning}</p>
                        <p
                          className="text-xs bg-black/30 p-3 rounded-xl border border-white/5 font-mono leading-relaxed text-muted-foreground"
                          data-testid="text-verdict-explanation"
                        >
                          {verdict.explanation}
                        </p>
                      </div>

                      {verdict.recommendations.length > 0 && (
                        <div>
                          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">{t.directives}</p>
                          <ul className="space-y-1.5">
                            {verdict.recommendations.map((rec, i) => (
                              <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.07 }}
                                className="flex gap-2 text-xs font-mono text-muted-foreground bg-black/20 p-2 rounded-lg border border-white/5"
                              >
                                <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                {rec}
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>

                    {/* TX result */}
                    <AnimatePresence>
                      {claimResult && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mb-3 p-3.5 rounded-xl bg-primary/6 border border-primary/25"
                        >
                          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">{t.tx_id_label}</p>
                          <p className="text-[10px] font-mono text-primary/80 break-all mb-3" data-testid="text-tx-signature">
                            {claimResult.signature}
                          </p>
                          <a
                            href={claimResult.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-primary/12 border border-primary/30 hover:bg-primary/20 transition-all glow-btn text-xs font-mono font-bold text-primary tracking-wider uppercase"
                            data-testid="link-explorer"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            {t.verify_onchain ?? "Verify on-chain"}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Claim button */}
                    {verdict.eligible && !claimResult && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="pt-3 border-t border-white/5"
                      >
                        {!address ? (
                          <Button onClick={connect} variant="secondary" className="w-full font-mono rounded-xl" data-testid="button-connect-claim">
                            {t.connect_to_claim}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleClaim}
                            disabled={claimMutation.isPending}
                            className="w-full font-mono font-bold bg-primary text-black hover:bg-primary/90 rounded-xl glow-btn"
                            data-testid="button-claim"
                          >
                            {claimMutation.isPending
                              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.claiming}</>
                              : t.claim_btn
                            }
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-card rounded-2xl border border-dashed border-white/8 flex flex-col items-center justify-center text-center p-10 h-[400px]"
                >
                  <motion.div
                    animate={{ scale: [1, 1.04, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-2xl bg-white/3 flex items-center justify-center mb-4"
                  >
                    <BrainCircuit className="w-8 h-8 text-muted-foreground/40" />
                  </motion.div>
                  <p className="font-bold text-muted-foreground/60 text-sm tracking-tight mb-1">{t.awaiting}</p>
                  <p className="text-xs font-mono text-muted-foreground/30 max-w-[180px] leading-relaxed">{t.awaiting_sub}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
