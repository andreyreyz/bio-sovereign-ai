import { useState, useEffect, useRef } from "react";
import { useLang } from "@/hooks/use-language";
import { useWallet } from "@/hooks/use-wallet";
import { useDevice, DeviceBrand } from "@/hooks/use-device";
import { useGetRewardsStats, useGetRewardsHistory } from "@workspace/api-client-react";
import {
  User, Shield, Wallet, RefreshCw, Loader2, CheckCircle2,
  Zap, Battery, Clock, Bluetooth, BluetoothOff, Lock, Unlock,
  TrendingUp, FlaskConical, Dna, Calculator, Coins, AlertTriangle,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru, kk, enUS } from "date-fns/locale";

const LOCALE_MAP = { ru, kz: kk, en: enUS };

const DEVICES: { id: DeviceBrand; name: string; model: string; icon: string; color: string }[] = [
  { id: "apple",   name: "Apple Watch",    model: "Series 9",       icon: "⌚", color: "text-white" },
  { id: "samsung", name: "Samsung",        model: "Galaxy Watch 6", icon: "📱", color: "text-blue-400" },
  { id: "garmin",  name: "Garmin",         model: "Fenix 7",        icon: "🏃", color: "text-cyan-400" },
  { id: "fitbit",  name: "Fitbit",         model: "Sense 2",        icon: "💪", color: "text-rose-400" },
  { id: "xiaomi",  name: "Xiaomi",         model: "Mi Band 8",      icon: "🔴", color: "text-orange-400" },
];

const QTM_TESTS = [
  { icon: "🩸", name: "Глюкоза крови", value: "4.8 ммоль/л", status: "норма", boost: +2, date: "02 апр" },
  { icon: "🫀", name: "Холестерин", value: "4.2 ммоль/л", status: "норма", boost: +3, date: "01 апр" },
  { icon: "🫁", name: "SpO₂", value: "98%", status: "отлично", boost: +4, date: "03 апр" },
  { icon: "⚡", name: "ЭКГ", value: "Синус ритм", status: "норма", boost: +2, date: "30 мар" },
  { icon: "🔆", name: "Витамин D", value: "38 нг/мл", status: "норма", boost: +1, date: "28 мар" },
];

function calcDiscount(avgScore: number, totalRewards: number): number {
  if (totalRewards === 0) return 0;
  const base = Math.max(0, (avgScore - 50) / 50);
  return Math.round(Math.min(30, base * 30));
}

function getLevel(avgScore: number): { name: "bronze" | "silver" | "gold"; multiplier: number; color: string; glow: string } {
  if (avgScore >= 80) return { name: "gold",   multiplier: 2.0, color: "#facc15", glow: "shadow-[0_0_20px_rgba(250,204,21,0.4)]" };
  if (avgScore >= 60) return { name: "silver", multiplier: 1.5, color: "#94a3b8", glow: "shadow-[0_0_20px_rgba(148,163,184,0.3)]" };
  return               { name: "bronze", multiplier: 1.0, color: "#cd7f32", glow: "shadow-[0_0_20px_rgba(205,127,50,0.3)]" };
}

function formatTimer(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (d > 0) return `${d}д ${h}ч ${m}м`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const STAKE_DURATION = 7 * 24 * 3600; // 7 days in seconds (demo uses real timer)

export default function Profile() {
  const { t, lang } = useLang();
  const { address, connect } = useWallet();
  const { device, connecting, connect: connectDevice, disconnect: disconnectDevice, syncNow, syncing } = useDevice();
  const [pulsomaSync, setPulsomaSync] = useState<"idle" | "syncing" | "done">("idle");
  const [qtmActive, setQtmActive] = useState(false);
  const [qtmLoading, setQtmLoading] = useState(false);
  const [stakeActive, setStakeActive] = useState(false);
  const [stakeTimer, setStakeTimer] = useState(STAKE_DURATION);
  const [stakeClaimed, setStakeClaimed] = useState(false);
  const [lastSync] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() - 2);
    return d;
  });
  const [simulateLocked, setSimulateLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locale = LOCALE_MAP[lang];

  const { data: stats } = useGetRewardsStats();
  const { data: history } = useGetRewardsHistory();

  const avgScore = stats?.averageHealthScore || 88;
  const totalRewards = stats?.totalRewards || 3;
  const totalSol = stats?.totalSolPaid || 0;
  const discount = calcDiscount(avgScore, totalRewards);
  const level = getLevel(avgScore);
  const levelName = lang === "kz"
    ? (level.name === "gold" ? t.level_gold : level.name === "silver" ? t.level_silver : t.level_bronze)
    : (level.name === "gold" ? t.level_gold : level.name === "silver" ? t.level_silver : t.level_bronze);

  const hoursWithoutSync = Math.floor((Date.now() - lastSync.getTime()) / 3600000);
  const smartLockBurned = simulateLocked || hoursWithoutSync >= 48;
  const hoursLeft = Math.max(0, 48 - hoursWithoutSync);

  const qtmBoost = qtmActive ? QTM_TESTS.reduce((a, t) => a + t.boost, 0) : 0;
  const effectiveScore = Math.min(100, avgScore + qtmBoost);

  // Yearly calculator
  const yearlySOL = (level.multiplier * 0.1 * 52).toFixed(2);
  const yearlySavings = Math.round((discount / 100) * 12 * 15000);

  // Stake timer
  useEffect(() => {
    if (stakeActive && !stakeClaimed) {
      timerRef.current = setInterval(() => {
        setStakeTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stakeActive, stakeClaimed]);

  const handleStake = () => {
    setStakeActive(true);
    setStakeTimer(STAKE_DURATION);
    setStakeClaimed(false);
  };

  const handleStakeClaim = () => {
    setStakeClaimed(true);
    setStakeActive(false);
  };

  const handlePulsoma = () => {
    setPulsomaSync("syncing");
    setTimeout(() => setPulsomaSync("done"), 2500);
  };

  const handleQtm = () => {
    setQtmLoading(true);
    setTimeout(() => { setQtmLoading(false); setQtmActive(true); }, 2000);
  };

  const phantomBalance = address ? (2.847 + (totalSol || 0)).toFixed(3) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tighter neon-text mb-2 flex items-center gap-3">
          <User className="w-8 h-8 text-primary" />
          {t.profile_title}
        </h1>
        <p className="text-muted-foreground font-mono text-sm">{t.profile_subtitle}</p>
      </div>

      {/* Phantom notification */}
      {address && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3 animate-in fade-in duration-300">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-base">👻</span>
          </div>
          <div className="flex-1">
            <p className="font-mono text-sm text-indigo-300 font-bold mb-0.5">{t.phantom_balance}</p>
            <p className="font-mono text-xs text-muted-foreground">{t.phantom_connected_msg}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono font-bold text-lg text-indigo-300">{phantomBalance} SOL</div>
            <div className="text-[10px] font-mono text-muted-foreground">Devnet mirror</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* === USER LEVEL + MULTIPLIER === */}
        <div className={`glass-panel p-6 rounded-xl border relative overflow-hidden ${level.glow}`}
          style={{ borderColor: level.color + "40" }}>
          <div className="absolute top-0 left-0 w-full h-1"
            style={{ background: `linear-gradient(90deg, transparent, ${level.color}80, transparent)` }} />
          <h3 className="font-mono font-bold flex items-center gap-2 mb-5" style={{ color: level.color }}>
            <Coins className="w-5 h-5" style={{ color: level.color }} />
            {t.level_title}
          </h3>

          <div className="flex items-center gap-5 mb-5">
            {/* Level Badge */}
            <div className="w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center flex-shrink-0"
              style={{ borderColor: level.color, background: level.color + "15" }}>
              <span className="text-2xl font-bold font-mono" style={{ color: level.color }}>
                {level.name === "gold" ? "🥇" : level.name === "silver" ? "🥈" : "🥉"}
              </span>
              <span className="text-xs font-mono font-bold mt-1" style={{ color: level.color }}>{levelName}</span>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">{t.reward_multiplier}</div>
                <div className="text-3xl font-bold font-mono" style={{ color: level.color }}>×{level.multiplier.toFixed(1)}</div>
                <div className="text-xs font-mono text-muted-foreground">
                  = {(level.multiplier * 0.1).toFixed(2)} SOL / reward
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Health Score</div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${effectiveScore}%`, background: level.color, boxShadow: `0 0 8px ${level.color}80` }} />
                </div>
                <div className="text-xs font-mono mt-1" style={{ color: level.color }}>
                  {effectiveScore}/100 {qtmBoost > 0 && <span className="text-primary">(+{qtmBoost} QTM)</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Level tiers */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "bronze", label: t.level_bronze, range: "0–59", mult: "1.0×", score: 0,  color: "#cd7f32" },
              { key: "silver", label: t.level_silver, range: "60–79", mult: "1.5×", score: 60, color: "#94a3b8" },
              { key: "gold",   label: t.level_gold,   range: "80+",   mult: "2.0×", score: 80, color: "#facc15" },
            ].map(({ key, label, range, mult, color }) => (
              <div key={key} className={`p-2 rounded-lg border text-center text-xs font-mono transition-all ${
                level.name === key ? "scale-105" : "opacity-50"
              }`}
                style={{
                  borderColor: level.name === key ? color : color + "30",
                  background: level.name === key ? color + "15" : "transparent",
                  color: level.name === key ? color : "#6b7a72",
                }}>
                <div className="font-bold">{label}</div>
                <div>{range}</div>
                <div className="text-[10px] mt-0.5">{mult}</div>
              </div>
            ))}
          </div>
        </div>

        {/* === INSURANCE POLICY + SMART LOCK === */}
        <div className="glass-panel p-6 rounded-xl border border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <h3 className="font-mono font-bold flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            {t.insurance_title}
          </h3>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm font-mono text-muted-foreground">{t.insurance_status}</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-fast" />
                <span className="text-sm font-mono text-primary font-bold">{t.insurance_active}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm font-mono text-muted-foreground">{t.insurance_discount}</span>
              <div className="text-right">
                <div className={`text-3xl font-bold font-mono ${smartLockBurned ? "text-destructive line-through" : "text-primary"}`}>
                  {smartLockBurned ? "0%" : `${discount}%`}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {t.insurance_based_on} {totalRewards} {t.insurance_verdicts}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
                <span>{t.avg_score_label}</span>
                <span className="text-primary font-bold">{Math.round(avgScore)}/100</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${avgScore}%`, boxShadow: "0 0 8px rgba(0,255,128,0.6)" }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: t.level_bronze, range: "1–10%", active: discount >= 1 && discount < 11 },
                { label: t.level_silver, range: "11–20%", active: discount >= 11 && discount < 21 },
                { label: t.level_gold, range: "21–30%", active: discount >= 21 },
              ].map(({ label, range, active }) => (
                <div key={label} className={`p-2 rounded-lg border text-center text-xs font-mono transition-colors ${
                  active ? "border-primary/50 bg-primary/10 text-primary" : "border-border/30 text-muted-foreground/50"
                }`}>
                  <div className="font-bold">{label}</div>
                  <div>{range}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Lock */}
          <div className={`p-3 rounded-lg border flex items-start gap-3 ${
            smartLockBurned
              ? "bg-destructive/10 border-destructive/40"
              : "bg-primary/5 border-primary/20"
          }`}>
            {smartLockBurned
              ? <Lock className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              : <Unlock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs font-bold mb-0.5">
                {t.smart_lock_title}
              </div>
              <div className={`font-mono text-xs ${smartLockBurned ? "text-destructive" : "text-muted-foreground"}`}>
                {smartLockBurned
                  ? t.smart_lock_burned
                  : `${t.smart_lock_ok} · ${hoursLeft}${lang === "ru" ? " ч" : lang === "kz" ? " сағ" : "h"} left`
                }
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSimulateLocked(p => !p)}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              {simulateLocked ? "↺ Reset" : "⚡ Sim 48h"}
            </Button>
          </div>
        </div>

        {/* === PHANTOM WALLET === */}
        <div className="glass-panel p-6 rounded-xl border border-cyan-500/20">
          <h3 className="font-mono font-bold flex items-center gap-2 mb-5">
            <Wallet className="w-5 h-5 text-cyan-400" />
            {t.wallet_title}
          </h3>

          {address ? (
            <div className="space-y-4">
              <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                <div className="text-xs font-mono text-muted-foreground mb-1">WALLET ADDRESS</div>
                <div className="font-mono text-xs text-primary break-all">{address}</div>
              </div>

              {/* Phantom Mirror Balance */}
              <div className="bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-indigo-400 uppercase">👻 {t.phantom_balance}</div>
                  <div className="font-mono font-bold text-xl text-indigo-300">{phantomBalance} SOL</div>
                </div>
                <div className="text-right">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse mx-auto mb-1" />
                  <div className="text-[10px] font-mono text-indigo-400">DEVNET</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t.wallet_earned, value: totalSol.toFixed(2), unit: "SOL", note: "BSA rewards" },
                  { label: t.wallet_txs, value: totalRewards, unit: "tx", note: "total" },
                  { label: t.reward_multiplier, value: `×${level.multiplier.toFixed(1)}`, unit: "", note: levelName },
                ].map(({ label, value, unit, note }) => (
                  <div key={label} className="bg-black/30 rounded-lg p-3 border border-white/5 text-center">
                    <div className="text-xs font-mono text-muted-foreground mb-1">{label}</div>
                    <div className="text-lg font-bold font-mono text-foreground">{value}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{unit} {note}</div>
                  </div>
                ))}
              </div>

              {history && history.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Последние начисления</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {history.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-xs font-mono bg-black/20 rounded p-2 border border-white/5">
                        <span className="text-muted-foreground">
                          {format(new Date(r.createdAt), "d MMM, HH:mm", { locale })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-bold">+{r.amount} SOL</span>
                          {r.txSignature && (
                            <a
                              href={`https://explorer.solana.com/tx/${r.txSignature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                              title={t.verify_onchain}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Wallet className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
              <p className="font-mono text-sm text-muted-foreground mb-4">{t.connect_wallet}</p>
              <Button onClick={connect} className="font-mono bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-primary-foreground">
                <Wallet className="w-4 h-4 mr-2" />{t.connect_wallet}
              </Button>
            </div>
          )}
        </div>

        {/* === HEALTH STAKE === */}
        <div className="glass-panel p-6 rounded-xl border border-violet-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
          <h3 className="font-mono font-bold flex items-center gap-2 mb-2 text-violet-300">
            <Coins className="w-5 h-5 text-violet-400" />
            {t.stake_title}
          </h3>
          <p className="text-xs font-mono text-muted-foreground mb-5">
            Stake SOL · ИИ проверяет Health Score через 7 дней · Если score &gt; 80 → +10% бонус
          </p>

          {stakeClaimed ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🎉</div>
              <div className="font-mono font-bold text-xl text-primary mb-1">{t.stake_claimed}</div>
              <div className="font-mono text-sm text-muted-foreground">+0.55 SOL возвращено (0.5 + 10%)</div>
              <Button
                className="mt-4 font-mono text-xs"
                variant="outline"
                onClick={() => { setStakeClaimed(false); setStakeActive(false); setStakeTimer(STAKE_DURATION); }}
              >
                Снова стейкнуть
              </Button>
            </div>
          ) : stakeActive ? (
            <div className="space-y-4">
              <div className="bg-violet-500/10 rounded-xl border border-violet-500/30 p-4 text-center">
                <div className="text-xs font-mono text-violet-400 uppercase mb-2">{t.stake_timer}</div>
                <div className="text-3xl font-bold font-mono text-violet-300">{formatTimer(stakeTimer)}</div>
                <div className="text-xs font-mono text-muted-foreground mt-1">0.5 SOL locked</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${100 - (stakeTimer / STAKE_DURATION) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-violet-400">
                  {Math.round((1 - stakeTimer / STAKE_DURATION) * 100)}%
                </span>
              </div>

              {stakeTimer === 0 && (
                <Button
                  onClick={handleStakeClaim}
                  className="w-full font-mono bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30"
                  variant="outline"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />{t.stake_return}
                </Button>
              )}

              {/* Demo: simulate complete */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStakeTimer(0)}
                className="w-full text-[10px] font-mono text-muted-foreground/50"
              >
                ⚡ Demo: fast forward
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Стейк", value: "0.5 SOL", color: "text-violet-300" },
                  { label: "Бонус при 80+", value: "+10%", color: "text-primary" },
                  { label: "Возврат", value: "0.55 SOL", color: "text-cyan-400" },
                  { label: "Период", value: "7 дней", color: "text-muted-foreground" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-black/30 rounded-lg p-3 border border-white/5">
                    <div className="text-xs font-mono text-muted-foreground">{label}</div>
                    <div className={`font-mono font-bold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleStake}
                className="w-full font-mono bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                variant="outline"
              >
                <Coins className="w-4 h-4 mr-2" />{t.stake_btn} {lang === "ru" ? "на дисциплину" : lang === "kz" ? "тәртіп үшін" : "for Discipline"}
              </Button>
            </div>
          )}
        </div>

        {/* === QTM DIGITAL PASSPORT === */}
        <div className="glass-panel p-6 rounded-xl border border-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          <h3 className="font-mono font-bold flex items-center gap-2 mb-2">
            <Dna className="w-5 h-5 text-emerald-400" />
            {t.qtm_title}
          </h3>
          <p className="text-xs font-mono text-muted-foreground mb-5">
            Pulsoma Medical · Анализы подтверждены лабораторией
          </p>

          {qtmActive ? (
            <div className="space-y-3 animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-emerald-400 font-bold">ПАСПОРТ АКТИВЕН</span>
                <span className="text-xs font-mono text-primary">+{qtmBoost} {t.qtm_boost}</span>
              </div>
              {QTM_TESTS.map(({ icon, name, value, status, boost, date }) => (
                <div key={name} className="flex items-center gap-3 p-2 bg-black/30 rounded-lg border border-white/5">
                  <span className="text-lg flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-bold">{name}</div>
                    <div className="font-mono text-xs text-emerald-400">{value} · {status}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-xs text-primary font-bold">+{boost}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{date}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {["🩸 Глюкоза", "🫀 ЭКГ", "🫁 SpO₂", "⚡ Холестерин"].map(item => (
                  <div key={item} className="flex items-center gap-2 p-2 bg-black/20 rounded border border-dashed border-border/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                    <span className="text-xs font-mono text-muted-foreground/60">{item}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleQtm}
                disabled={qtmLoading}
                className="w-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                variant="outline"
              >
                {qtmLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Загружаем паспорт...</>
                  : <><FlaskConical className="w-4 h-4 mr-2" />Подключить QTM паспорт</>
                }
              </Button>
            </div>
          )}
        </div>

        {/* === PULSOMA SYNC === */}
        <div className="glass-panel p-6 rounded-xl border border-indigo-500/20">
          <h3 className="font-mono font-bold flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            {t.pulsoma_title}
          </h3>
          <p className="text-xs font-mono text-muted-foreground mb-5">{t.pulsoma_desc}</p>

          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
              pulsomaSync === "done"
                ? "border-primary bg-primary/10"
                : "border-indigo-500/40 bg-indigo-500/10"
            }`}>
              {pulsomaSync === "done"
                ? <CheckCircle2 className="w-8 h-8 text-primary" />
                : pulsomaSync === "syncing"
                ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                : <Zap className="w-8 h-8 text-indigo-400" />
              }
            </div>

            <div className="flex-1">
              <div className="font-mono font-bold text-sm mb-1">
                {pulsomaSync === "done" ? t.pulsoma_synced : "Pulsoma Medical"}
              </div>
              <div className="text-xs font-mono text-muted-foreground mb-3">
                {pulsomaSync === "done" ? "✓ ЭКГ, давление, O₂ синхронизированы" : t.pulsoma_desc}
              </div>
              <Button
                onClick={handlePulsoma}
                disabled={pulsomaSync === "syncing" || pulsomaSync === "done"}
                size="sm"
                className={`font-mono text-xs ${
                  pulsomaSync === "done"
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30"
                }`}
                variant="outline"
              >
                {pulsomaSync === "syncing" ? (
                  <><Loader2 className="w-3 h-3 mr-2 animate-spin" />{t.pulsoma_syncing}</>
                ) : pulsomaSync === "done" ? (
                  <><CheckCircle2 className="w-3 h-3 mr-2" />{t.pulsoma_synced}</>
                ) : (
                  <><RefreshCw className="w-3 h-3 mr-2" />{t.pulsoma_btn}</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* === BENEFIT CALCULATOR === */}
        <div className="glass-panel p-6 rounded-xl border border-cyan-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="font-mono font-bold flex items-center gap-2 mb-2">
            <Calculator className="w-5 h-5 text-cyan-400" />
            {t.calculator_title}
          </h3>
          <p className="text-xs font-mono text-muted-foreground mb-5">{t.calculator_subtitle}</p>

          <div className="space-y-4">
            {/* Main result */}
            <div className="bg-black/40 rounded-xl border border-primary/20 p-5 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <div className="relative">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">При индексе 90+ ({levelName} · ×{level.multiplier})</div>
                <div className="text-4xl font-bold font-mono text-primary neon-text">{yearlySOL} SOL</div>
                <div className="text-sm font-mono text-muted-foreground mt-1">{t.calculator_sol_rewards} {t.calculator_per_year}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono text-muted-foreground uppercase">SOL</span>
                </div>
                <div className="font-mono font-bold text-xl text-primary">{yearlySOL}</div>
                <div className="text-xs font-mono text-muted-foreground">52 недели × {(level.multiplier * 0.1).toFixed(2)}</div>
              </div>

              <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono text-muted-foreground uppercase">KZT</span>
                </div>
                <div className="font-mono font-bold text-xl text-cyan-400">
                  {yearlySavings.toLocaleString()}₸
                </div>
                <div className="text-xs font-mono text-muted-foreground">{t.calculator_insurance}</div>
              </div>
            </div>

            {/* Level progression */}
            <div className="bg-black/20 rounded-lg p-3 border border-white/5">
              <div className="text-xs font-mono text-muted-foreground mb-2 uppercase">Прогресс по уровням</div>
              {[
                { name: t.level_bronze, mult: 1.0, sol: "5.2", color: "#cd7f32" },
                { name: t.level_silver, mult: 1.5, sol: "7.8", color: "#94a3b8" },
                { name: t.level_gold,   mult: 2.0, sol: "10.4", color: "#facc15" },
              ].map(({ name, mult, sol, color }) => (
                <div key={name} className="flex items-center gap-3 py-1.5">
                  <div className="w-12 text-xs font-mono" style={{ color }}>{name}</div>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(mult / 2) * 100}%`, background: color }} />
                  </div>
                  <div className="text-xs font-mono font-bold" style={{ color }}>{sol} SOL/yr</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === CONNECTED DEVICES === */}
        <div className="glass-panel p-6 rounded-xl border border-border lg:col-span-2">
          <h3 className="font-mono font-bold flex items-center gap-2 mb-5">
            <Bluetooth className="w-5 h-5 text-cyan-400" />
            {t.device_title}
          </h3>

          {device && (
            <div className="mb-5 p-4 bg-primary/5 rounded-xl border border-primary/30 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{device.icon}</div>
                  <div>
                    <div className="font-mono font-bold text-sm text-primary">{device.name} {device.model}</div>
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Battery className="w-3 h-3" />{device.battery}%</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(device.lastSync, "HH:mm")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing}
                    className="font-mono text-xs border-primary/30 text-primary hover:bg-primary/10">
                    {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    <span className="ml-1">{t.device_sync}</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={disconnectDevice}
                    className="font-mono text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
                    <BluetoothOff className="w-3 h-3 mr-1" />{t.device_disconnect}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {DEVICES.map(({ id, name, model, icon, color }) => {
              const isConnected = device?.id === id;
              const isConnecting = connecting && !device;
              return (
                <div key={id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isConnected ? "border-primary/40 bg-primary/5" : "border-border/30 hover:border-border/60"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <div className={`font-mono text-sm font-bold ${color}`}>{name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{model}</div>
                    </div>
                  </div>
                  {isConnected ? (
                    <div className="flex items-center gap-2 text-xs font-mono text-primary">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse-fast" />
                      {t.device_connected}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => connectDevice(id)}
                      disabled={!!device || connecting}
                      className="font-mono text-xs"
                    >
                      {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bluetooth className="w-3 h-3 mr-1" />}
                      {connecting && !device ? t.device_connecting : t.device_connect}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
