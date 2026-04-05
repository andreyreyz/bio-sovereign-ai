import { useState } from "react";
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
import { Activity, Heart, Footprints, Moon, BrainCircuit, ShieldCheck, AlertTriangle, ArrowRight, Loader2, RefreshCw, ExternalLink } from "lucide-react";

interface ClaimResult {
  signature: string;
  explorerUrl: string;
}

export default function Dashboard() {
  const { address, connect } = useWallet();
  const { t } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verdict, setVerdict] = useState<AiVerdict | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  const { data: vitals, isLoading: isLoadingVitals } = useGetCurrentVitals({
    query: {
      refetchInterval: 3000,
      queryKey: getGetCurrentVitalsQueryKey()
    }
  });

  const { data: healthStatus } = useHealthCheck();

  const analyzeMutation = useAnalyzeVitals();
  const claimMutation = useClaimReward();

  const handleAnalyze = () => {
    if (!vitals) return;
    setClaimResult(null);
    analyzeMutation.mutate({
      data: {
        steps: vitals.steps,
        heartRate: vitals.heartRate,
        sleepQuality: vitals.sleepQuality,
        sleepHours: vitals.sleepHours,
        walletAddress: address || undefined
      }
    }, {
      onSuccess: (data) => {
        setVerdict(data);
      }
    });
  };

  const handleClaim = () => {
    if (!address || !verdict) return;

    claimMutation.mutate({
      data: {
        walletAddress: address,
        healthScore: verdict.score,
        aiExplanation: verdict.explanation
      }
    }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetRewardsHistoryQueryKey() });
        setClaimResult({ signature: data.signature, explorerUrl: data.explorerUrl });
        toast({
          title: t.tx_success,
          description: `${t.tx_desc}${data.signature.substring(0, 16)}...`,
        });
      }
    });
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "var(--color-primary)" : score >= 50 ? "#eab308" : "var(--color-destructive)";

  return (
    <div className="container mx-auto px-4 max-w-6xl animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tighter text-foreground neon-text mb-2">
            {t.page_title}
          </h1>
          <p className="text-muted-foreground font-mono text-sm max-w-2xl">
            {t.page_subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-secondary/50 p-3 rounded-lg border border-border">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-mono uppercase">{t.system_status}</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${healthStatus ? 'bg-primary animate-pulse-fast' : 'bg-destructive'}`}></div>
              <span className="text-xs font-mono uppercase font-bold text-foreground">
                {healthStatus ? t.operational : t.offline}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vitals Section */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-mono font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {t.live_telemetry}
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-fast"></div>
              {t.syncing}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Heart Rate */}
            <div className="glass-panel p-5 rounded-xl flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Heart className="w-24 h-24" />
              </div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-sm font-mono text-muted-foreground uppercase">{t.heart_rate}</span>
                <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
              </div>
              <div className="mt-auto relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-mono text-foreground" data-testid="text-heart-rate">
                    {isLoadingVitals ? "--" : vitals?.heartRate}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">BPM</span>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="glass-panel p-5 rounded-xl flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Footprints className="w-24 h-24" />
              </div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-sm font-mono text-muted-foreground uppercase">{t.daily_steps}</span>
                <Footprints className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="mt-auto relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-mono text-foreground" data-testid="text-steps">
                    {isLoadingVitals ? "--" : vitals?.steps.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">STEPS</span>
                </div>
              </div>
            </div>

            {/* Sleep */}
            <div className="glass-panel p-5 rounded-xl flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Moon className="w-24 h-24" />
              </div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-sm font-mono text-muted-foreground uppercase">{t.sleep_quality}</span>
                <Moon className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-auto relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-mono text-foreground" data-testid="text-sleep">
                    {isLoadingVitals ? "--" : vitals?.sleepQuality}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">/100</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  {isLoadingVitals ? "--" : vitals?.sleepHours} {t.hrs_duration}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border-t border-primary/30 mt-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30">
                  <BrainCircuit className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-lg">{t.ai_oracle}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{t.ai_oracle_sub}</p>
                </div>
              </div>
              <Button 
                onClick={handleAnalyze} 
                disabled={!vitals || analyzeMutation.isPending}
                className="w-full md:w-auto font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,128,0.4)]"
                data-testid="button-analyze"
              >
                {analyzeMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.analyzing}</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> {t.analyze_btn}</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Verdict Section */}
        <div className="lg:col-span-4">
          <div className="sticky top-24">
            <h2 className="text-lg font-mono font-bold flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {t.verdict_title}
            </h2>
            
            {verdict ? (
              <div className={`glass-panel p-6 rounded-xl animate-in slide-in-from-bottom-4 fade-in duration-500 ${verdict.eligible ? 'border-primary/50 shadow-[0_0_30px_rgba(0,255,128,0.15)]' : 'border-destructive/50'}`}>
                <div className="flex flex-col items-center justify-center text-center mb-6">
                  <div className="relative mb-4">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                      <circle cx="64" cy="64" r="56" fill="transparent" stroke="hsl(var(--secondary))" strokeWidth="8" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="56" 
                        fill="transparent" 
                        stroke={scoreColor(verdict.score)}
                        strokeWidth="8" 
                        strokeDasharray={351.8} 
                        strokeDashoffset={351.8 - (351.8 * verdict.score) / 100}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-3xl font-bold font-mono">{verdict.score}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{t.score_label}</span>
                    </div>
                  </div>
                  
                  <h3 className={`font-mono font-bold text-xl mb-1 ${verdict.eligible ? 'text-primary' : 'text-destructive'}`}>
                    {verdict.verdict}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-xs font-mono border border-border">
                    {verdict.eligible ? (
                      <><ShieldCheck className="w-3.5 h-3.5 text-primary" /> {t.reward_granted}</>
                    ) : (
                      <><AlertTriangle className="w-3.5 h-3.5 text-destructive" /> {t.reward_denied}</>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="text-xs font-mono text-muted-foreground uppercase mb-1">{t.ai_reasoning}</h4>
                    <p className="text-sm bg-black/40 p-3 rounded border border-white/5 font-mono leading-relaxed" data-testid="text-verdict-explanation">
                      {verdict.explanation}
                    </p>
                  </div>
                  
                  {verdict.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono text-muted-foreground uppercase mb-1">{t.directives}</h4>
                      <ul className="text-xs bg-black/40 p-3 rounded border border-white/5 font-mono space-y-2">
                        {verdict.recommendations.map((rec, i) => (
                          <li key={i} className="flex gap-2">
                            <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Transaction Result */}
                {claimResult && (
                  <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 animate-in fade-in duration-500">
                    <p className="text-xs font-mono text-muted-foreground uppercase mb-1">{t.tx_id_label}</p>
                    <p className="text-xs font-mono text-primary break-all mb-2" data-testid="text-tx-signature">
                      {claimResult.signature}
                    </p>
                    <a
                      href={claimResult.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
                      data-testid="link-explorer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t.view_explorer}
                    </a>
                  </div>
                )}

                {verdict.eligible && !claimResult && (
                  <div className="pt-4 border-t border-border">
                    {!address ? (
                      <Button onClick={connect} className="w-full font-mono" variant="secondary" data-testid="button-connect-claim">
                        {t.connect_to_claim}
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleClaim}
                        disabled={claimMutation.isPending}
                        className="w-full font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,128,0.4)]"
                        data-testid="button-claim"
                      >
                        {claimMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.claiming}</>
                        ) : (
                          t.claim_btn
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel p-8 rounded-xl border border-border border-dashed flex flex-col items-center justify-center text-center h-[400px]">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 opacity-50">
                  <BrainCircuit className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-mono font-bold text-muted-foreground mb-2">{t.awaiting}</h3>
                <p className="text-xs font-mono text-muted-foreground/60 max-w-[200px]">
                  {t.awaiting_sub}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
