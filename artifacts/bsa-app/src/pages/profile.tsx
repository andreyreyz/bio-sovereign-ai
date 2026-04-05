import { useState, useEffect, useRef } from "react";
import { useLang } from "@/hooks/use-language";
import { useWallet } from "@/hooks/use-wallet";
import { useDevice, DeviceBrand } from "@/hooks/use-device";
import { useGetRewardsStats, useGetRewardsHistory } from "@workspace/api-client-react";
import {
  User, Shield, Wallet, RefreshCw, Loader2, CheckCircle2,
  Zap, Battery, Clock, Bluetooth, BluetoothOff, Lock, Unlock,
  FlaskConical, Dna, Calculator, Coins, ExternalLink,
  ChevronDown, ChevronRight, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru, kk, enUS } from "date-fns/locale";

const LOCALE_MAP = { ru, kz: kk, en: enUS };

const DEVICES: { id: DeviceBrand; name: string; model: string; icon: string; color: string }[] = [
  { id: "apple",   name: "Apple Watch",  model: "Series 9",       icon: "⌚", color: "text-white" },
  { id: "samsung", name: "Samsung",      model: "Galaxy Watch 6", icon: "📱", color: "text-blue-400" },
  { id: "garmin",  name: "Garmin",       model: "Fenix 7",        icon: "🏃", color: "text-cyan-400" },
  { id: "fitbit",  name: "Fitbit",       model: "Sense 2",        icon: "💪", color: "text-rose-400" },
  { id: "xiaomi",  name: "Xiaomi",       model: "Mi Band 8",      icon: "🔴", color: "text-orange-400" },
];

const QTM_TESTS = [
  { icon: "🩸", name: "Глюкоза крови",  value: "4.8 ммоль/л", status: "норма",   boost: +2, date: "02 апр" },
  { icon: "🫀", name: "Холестерин",      value: "4.2 ммоль/л", status: "норма",   boost: +3, date: "01 апр" },
  { icon: "🫁", name: "SpO₂",           value: "98%",         status: "отлично", boost: +4, date: "03 апр" },
  { icon: "⚡", name: "ЭКГ",            value: "Синус ритм",  status: "норма",   boost: +2, date: "30 мар" },
  { icon: "🔆", name: "Витамин D",      value: "38 нг/мл",    status: "норма",   boost: +1, date: "28 мар" },
];

function calcDiscount(avgScore: number, totalRewards: number): number {
  if (totalRewards === 0) return 0;
  return Math.round(Math.min(30, Math.max(0, (avgScore - 50) / 50) * 30));
}

function getLevel(avgScore: number) {
  if (avgScore >= 80) return { name: "gold",   multiplier: 2.0, color: "#facc15", emoji: "🥇" };
  if (avgScore >= 60) return { name: "silver", multiplier: 1.5, color: "#94a3b8", emoji: "🥈" };
  return               { name: "bronze", multiplier: 1.0, color: "#cd7f32", emoji: "🥉" };
}

function formatTimer(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (d > 0) return `${d}д ${h}ч ${m}м`;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

const STAKE_DURATION = 7 * 24 * 3600;
const SOL_USD = 150;
const USD_KZT = 470;

// ── Accordion wrapper ────────────────────────────────────────────
function Section({
  id, open, onToggle, icon, title, badge, badgeColor = "text-primary", children
}: {
  id: string; open: boolean; onToggle: () => void;
  icon: React.ReactNode; title: string;
  badge?: string; badgeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-xl border border-white/8 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <span className="font-mono font-bold text-sm">{title}</span>
          {badge && (
            <span className={`text-xs font-mono font-bold ${badgeColor}`}>{badge}</span>
          )}
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { t, lang } = useLang();
  const { address, connect } = useWallet();
  const { device, connecting, connect: connectDevice, disconnect: disconnectDevice, syncNow, syncing } = useDevice();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }));

  const [pulsomaSync, setPulsomaSync] = useState<"idle"|"syncing"|"done">("idle");
  const [qtmActive, setQtmActive] = useState(false);
  const [qtmLoading, setQtmLoading] = useState(false);
  const [stakeActive, setStakeActive] = useState(false);
  const [stakeTimer, setStakeTimer] = useState(STAKE_DURATION);
  const [stakeClaimed, setStakeClaimed] = useState(false);
  const [simulateLocked, setSimulateLocked] = useState(false);
  const [calcCurrency, setCalcCurrency] = useState<"SOL"|"USD"|"KZT">("SOL");
  const [walletSol, setWalletSol] = useState<number | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const locale = LOCALE_MAP[lang];

  function getBase() {
    const d = (window as any).__REPLIT_DEV_DOMAIN__;
    if (d) return `https://${d}`;
    return "";
  }

  async function fetchBalance(silent = false) {
    if (!silent) setBalanceLoading(true);
    else setBalanceRefreshing(true);
    try {
      const res = await fetch(`${getBase()}/api/wallet/balance`);
      if (res.ok) {
        const data = await res.json();
        setWalletSol(data.sol);
        setWalletAddress(data.address);
      }
    } catch {}
    setBalanceLoading(false);
    setBalanceRefreshing(false);
  }

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(() => fetchBalance(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: stats } = useGetRewardsStats();
  const { data: history } = useGetRewardsHistory();

  const avgScore  = stats?.averageHealthScore || 88;
  const totalRewards = stats?.totalRewards || 3;
  const totalSol  = stats?.totalSolPaid || 0;
  const discount  = calcDiscount(avgScore, totalRewards);
  const level     = getLevel(avgScore);
  const levelName = level.name === "gold" ? t.level_gold : level.name === "silver" ? t.level_silver : t.level_bronze;
  const qtmBoost  = qtmActive ? QTM_TESTS.reduce((a,x) => a + x.boost, 0) : 0;
  const effectiveScore = Math.min(100, avgScore + qtmBoost);
  const hoursWithoutSync = 2;
  const smartLockBurned = simulateLocked || hoursWithoutSync >= 48;
  const hoursLeft = Math.max(0, 48 - hoursWithoutSync);

  const yearlySOL = parseFloat((level.multiplier * 0.1 * 52).toFixed(2));
  const yearlyUSD = Math.round(yearlySOL * SOL_USD);
  const yearlyKZT = Math.round(yearlyUSD * USD_KZT);
  const yearlySavings = Math.round((discount / 100) * 12 * 15000);

  function fmtCur(sol: number) {
    if (calcCurrency === "SOL") return `${sol.toFixed(2)} SOL`;
    if (calcCurrency === "USD") return `$${Math.round(sol * SOL_USD).toLocaleString()}`;
    return `${Math.round(sol * SOL_USD * USD_KZT / 1000).toFixed(0)}K₸`;
  }

  useEffect(() => {
    if (stakeActive && !stakeClaimed) {
      timerRef.current = setInterval(() => {
        setStakeTimer(p => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stakeActive, stakeClaimed]);

  const displaySol = walletSol !== null ? walletSol : (totalSol || 0);
  const displayAddress = walletAddress || address;

  return (
    <div className="max-w-lg mx-auto space-y-3 animate-in fade-in duration-300 pb-8">

      {/* ══════════════════════════════════════════
          BANK CARD — реальный баланс с Devnet
          ══════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,255,128,0.15)]"
        style={{ background: "linear-gradient(135deg, #0a1a12 0%, #0d2318 50%, #0a1a12 100%)" }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(0,255,128,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,128,0.3) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #00ff80, transparent)", transform: "translate(30%, 30%)" }} />

        <div className="relative p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs">◎</div>
              <span className="font-mono text-xs text-primary font-bold tracking-widest">BSA · SOLANA</span>
            </div>
            <div className="flex items-center gap-2">
              {balanceRefreshing && <Loader2 className="w-3 h-3 text-primary/60 animate-spin" />}
              <button onClick={() => fetchBalance(true)} className="text-primary/50 hover:text-primary transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-mono text-primary">DEVNET</span>
              </div>
            </div>
          </div>

          {/* Balance — always shown */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
              Баланс кошелька · Solana Devnet
            </p>
            {balanceLoading ? (
              <div className="flex items-center gap-3 py-2">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="font-mono text-muted-foreground text-sm">Подключение к Devnet RPC...</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold font-mono text-primary neon-text tracking-tight">
                    {displaySol.toFixed(4)}
                  </span>
                  <span className="text-xl font-mono text-primary/60">SOL</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    ≈ ${(displaySol * SOL_USD).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {Math.round(displaySol * SOL_USD * USD_KZT).toLocaleString()}₸
                  </span>
                </div>
                {displayAddress && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[220px]">
                      {displayAddress.slice(0, 8)}...{displayAddress.slice(-8)}
                    </span>
                    <a href={`https://explorer.solana.com/address/${displayAddress}?cluster=devnet`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-cyan-400/60 hover:text-cyan-400 flex-shrink-0 transition-colors">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: "BSA наград", value: `${totalSol.toFixed(2)} SOL`, sub: `${totalRewards} tx` },
              { label: levelName, value: level.emoji, sub: `×${level.multiplier}` },
              { label: "Скидка", value: smartLockBurned ? "0%" : `${discount}%`, sub: "страховка" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-black/40 rounded-xl p-2.5 border border-white/5 text-center">
                <div className="text-[9px] font-mono text-muted-foreground uppercase mb-1">{label}</div>
                <div className="font-mono font-bold text-sm text-foreground">{value}</div>
                <div className="text-[9px] font-mono text-muted-foreground mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          {walletSol !== null && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 text-[11px] font-mono text-primary/80 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Реальный баланс · синхронизируется каждые 30с
            </div>
          )}

          {/* Tx history mini */}
          {address && history && history.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Последние начисления</p>
              {history.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 border border-white/5">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {format(new Date(r.createdAt), "d MMM HH:mm", { locale })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-primary">+{r.amount} SOL</span>
                    {r.txSignature && (
                      <a href={`https://explorer.solana.com/tx/${r.txSignature}?cluster=devnet`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ACCORDION SECTIONS
          ══════════════════════════════════════════ */}

      {/* ─ Level + Insurance ─ */}
      <Section id="level" open={!!open.level} onToggle={() => toggle("level")}
        icon={<Coins className="w-4 h-4" style={{ color: level.color }} />}
        title={t.level_title}
        badge={`${level.emoji} ${levelName} · ×${level.multiplier}`}
        badgeColor="text-foreground/70"
      >
        <div className="pt-3 space-y-4">
          {/* Level badge */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center flex-shrink-0"
              style={{ borderColor: level.color, background: level.color + "15" }}>
              <span className="text-2xl">{level.emoji}</span>
              <span className="text-[10px] font-mono font-bold" style={{ color: level.color }}>{levelName}</span>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase">{t.reward_multiplier}</div>
                <div className="text-2xl font-bold font-mono" style={{ color: level.color }}>×{level.multiplier.toFixed(1)}</div>
                <div className="text-[11px] font-mono text-muted-foreground">= {(level.multiplier * 0.1).toFixed(2)} SOL / reward</div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                  <span>Health Score</span>
                  <span style={{ color: level.color }}>{effectiveScore}/100 {qtmBoost > 0 && `(+${qtmBoost} QTM)`}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${effectiveScore}%`, background: level.color }} />
                </div>
              </div>
            </div>
          </div>

          {/* Level tiers */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: "bronze", label: t.level_bronze, range: "0–59", mult: "1.0×", color: "#cd7f32" },
              { key: "silver", label: t.level_silver, range: "60–79", mult: "1.5×", color: "#94a3b8" },
              { key: "gold",   label: t.level_gold,   range: "80+",   mult: "2.0×", color: "#facc15" },
            ].map(({ key, label, range, mult, color }) => (
              <div key={key} className="p-2 rounded-lg border text-center text-[10px] font-mono transition-all"
                style={{
                  borderColor: level.name === key ? color : color + "30",
                  background:  level.name === key ? color + "15" : "transparent",
                  color:       level.name === key ? color : "#4b5563",
                  transform:   level.name === key ? "scale(1.03)" : "scale(1)",
                }}>
                <div className="font-bold">{label}</div>
                <div>{range}</div>
                <div className="opacity-70">{mult}</div>
              </div>
            ))}
          </div>

          {/* Insurance */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">{t.insurance_discount}</span>
              <span className={`text-2xl font-bold font-mono ${smartLockBurned ? "text-destructive line-through" : "text-primary"}`}>
                {smartLockBurned ? "0%" : `${discount}%`}
              </span>
            </div>
            <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-mono ${
              smartLockBurned ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-primary/5 border-primary/20 text-primary"
            }`}>
              {smartLockBurned ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="flex-1">{smartLockBurned ? t.smart_lock_burned : `${t.smart_lock_ok} · ${hoursLeft}ч left`}</span>
              <button onClick={() => setSimulateLocked(p => !p)}
                className="text-[10px] opacity-50 hover:opacity-100 border border-current/30 rounded px-1.5 py-0.5">
                {simulateLocked ? "↺" : "⚡48h"}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* ─ Калькулятор выгоды ─ */}
      <Section id="calc" open={!!open.calc} onToggle={() => toggle("calc")}
        icon={<Calculator className="w-4 h-4 text-cyan-400" />}
        title={t.calculator_title}
        badge={calcCurrency === "SOL" ? `${yearlySOL} SOL/yr` : calcCurrency === "USD" ? `$${yearlyUSD}/yr` : `${(yearlyKZT/1000).toFixed(0)}K₸/yr`}
        badgeColor="text-cyan-400"
      >
        <div className="pt-3 space-y-3">
          {/* Currency toggle */}
          <div className="flex gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
            {(["SOL","USD","KZT"] as const).map(cur => (
              <button key={cur} onClick={() => setCalcCurrency(cur)}
                className={`flex-1 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                  calcCurrency === cur
                    ? cur === "SOL" ? "bg-primary text-black"
                      : cur === "USD" ? "bg-emerald-500 text-black"
                      : "bg-cyan-500 text-black"
                    : "text-muted-foreground"
                }`}>
                {cur === "SOL" ? "◎ SOL" : cur === "USD" ? "$ USD" : "₸ KZT"}
              </button>
            ))}
          </div>

          {/* Main number */}
          <div className="bg-black/40 rounded-xl border border-white/10 p-4 text-center">
            <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">
              {levelName} · ×{level.multiplier} · 52 {lang === "en" ? "wks" : "нед"}
            </div>
            <div className="flex items-baseline gap-2 justify-center">
              {calcCurrency === "SOL" && <>
                <span className="text-4xl font-bold font-mono text-primary neon-text">{yearlySOL}</span>
                <span className="text-lg font-mono text-primary/60">SOL</span>
              </>}
              {calcCurrency === "USD" && <>
                <span className="text-4xl font-bold font-mono text-emerald-400">${yearlyUSD.toLocaleString()}</span>
                <span className="text-sm font-mono text-emerald-400/60">USD</span>
              </>}
              {calcCurrency === "KZT" && <>
                <span className="text-4xl font-bold font-mono text-cyan-400">{(yearlyKZT/1000).toFixed(0)}K</span>
                <span className="text-lg font-mono text-cyan-400/60">₸</span>
              </>}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">{t.calculator_per_year}</div>
          </div>

          {/* All 3 currencies always */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { cur: "SOL", val: `${yearlySOL}`, color: "text-primary" },
              { cur: "USD", val: `$${yearlyUSD}`, color: "text-emerald-400" },
              { cur: "KZT", val: `${(yearlyKZT/1000).toFixed(0)}K₸`, color: "text-cyan-400" },
            ].map(({ cur, val, color }) => (
              <div key={cur} className="bg-black/30 rounded-lg p-2 border border-white/5 text-center">
                <div className="text-[9px] font-mono text-muted-foreground">{cur}/год</div>
                <div className={`font-mono font-bold text-sm ${color}`}>{val}</div>
              </div>
            ))}
          </div>

          {/* Level bars */}
          <div className="space-y-1.5">
            {[
              { name: t.level_bronze, mult: 1.0, sol: 5.2,  color: "#cd7f32" },
              { name: t.level_silver, mult: 1.5, sol: 7.8,  color: "#94a3b8" },
              { name: t.level_gold,   mult: 2.0, sol: 10.4, color: "#facc15" },
            ].map(({ name, mult, sol, color }) => {
              const v = calcCurrency === "SOL" ? `${sol} SOL`
                : calcCurrency === "USD" ? `$${Math.round(sol*SOL_USD)}`
                : `${Math.round(sol*SOL_USD*USD_KZT/1000)}K₸`;
              return (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-10 text-[10px] font-mono flex-shrink-0" style={{ color }}>{name}</div>
                  <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(mult/2)*100}%`, background: color }} />
                  </div>
                  <div className="text-[10px] font-mono font-bold w-14 text-right flex-shrink-0" style={{ color }}>{v}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ─ Health Stake ─ */}
      <Section id="stake" open={!!open.stake} onToggle={() => toggle("stake")}
        icon={<Coins className="w-4 h-4 text-violet-400" />}
        title={t.stake_title}
        badge={stakeActive ? t.stake_active : stakeClaimed ? t.stake_claimed : "0.5 SOL → +10%"}
        badgeColor={stakeClaimed ? "text-primary" : stakeActive ? "text-violet-400" : "text-muted-foreground"}
      >
        <div className="pt-3">
          {stakeClaimed ? (
            <div className="text-center py-4 space-y-2">
              <div className="text-3xl">🎉</div>
              <div className="font-mono font-bold text-primary">{t.stake_claimed}</div>
              <div className="text-xs font-mono text-muted-foreground">+0.55 SOL возвращено (0.5 + 10%)</div>
              <Button size="sm" variant="outline" className="font-mono text-xs mt-2"
                onClick={() => { setStakeClaimed(false); setStakeActive(false); setStakeTimer(STAKE_DURATION); }}>
                Снова стейкнуть
              </Button>
            </div>
          ) : stakeActive ? (
            <div className="space-y-3">
              <div className="bg-violet-500/10 rounded-xl border border-violet-500/30 p-4 text-center">
                <div className="text-[10px] font-mono text-violet-400 uppercase mb-1">{t.stake_timer}</div>
                <div className="text-2xl font-bold font-mono text-violet-300">{formatTimer(stakeTimer)}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${100 - (stakeTimer/STAKE_DURATION)*100}%` }} />
                </div>
                <span className="text-[10px] font-mono text-violet-400">
                  {Math.round((1 - stakeTimer/STAKE_DURATION)*100)}%
                </span>
              </div>
              {stakeTimer === 0
                ? <Button onClick={() => { setStakeClaimed(true); setStakeActive(false); }}
                    className="w-full font-mono bg-violet-500/20 text-violet-300 border border-violet-500/40" variant="outline">
                    <CheckCircle2 className="w-4 h-4 mr-2" />{t.stake_return}
                  </Button>
                : <Button size="sm" variant="ghost" onClick={() => setStakeTimer(0)}
                    className="w-full text-[10px] font-mono text-muted-foreground/40">
                    ⚡ Demo: fast forward
                  </Button>
              }
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Стейк",        value: "0.5 SOL", color: "text-violet-300" },
                  { label: "Бонус при 80+", value: "+10%",   color: "text-primary" },
                  { label: "Возврат",       value: "0.55 SOL", color: "text-cyan-400" },
                  { label: "Период",        value: "7 дней", color: "text-muted-foreground" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                    <div className="text-[10px] font-mono text-muted-foreground">{label}</div>
                    <div className={`font-mono font-bold text-sm ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
              <Button onClick={() => { setStakeActive(true); setStakeTimer(STAKE_DURATION); }}
                className="w-full font-mono bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.25)]" variant="outline">
                <Coins className="w-4 h-4 mr-2" />{t.stake_btn}
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* ─ QTM Цифровой паспорт ─ */}
      <Section id="qtm" open={!!open.qtm} onToggle={() => toggle("qtm")}
        icon={<Dna className="w-4 h-4 text-emerald-400" />}
        title={t.qtm_title}
        badge={qtmActive ? `+${qtmBoost} Health Score` : "Pulsoma Medical"}
        badgeColor={qtmActive ? "text-emerald-400" : "text-muted-foreground"}
      >
        <div className="pt-3 space-y-2">
          {qtmActive ? (
            <>
              {QTM_TESTS.map(({ icon, name, value, status, boost, date }) => (
                <div key={name} className="flex items-center gap-2.5 p-2.5 bg-black/30 rounded-lg border border-white/5">
                  <span className="text-lg flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-bold truncate">{name}</div>
                    <div className="font-mono text-[10px] text-emerald-400">{value} · {status}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-xs text-primary font-bold">+{boost}</div>
                    <div className="text-[9px] font-mono text-muted-foreground">{date}</div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <Button onClick={() => { setQtmLoading(true); setTimeout(() => { setQtmLoading(false); setQtmActive(true); }, 2000); }}
              disabled={qtmLoading}
              className="w-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30" variant="outline">
              {qtmLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Загрузка паспорта...</>
                : <><FlaskConical className="w-4 h-4 mr-2" />Подключить QTM паспорт</>
              }
            </Button>
          )}
        </div>
      </Section>

      {/* ─ Pulsoma Sync ─ */}
      <Section id="pulsoma" open={!!open.pulsoma} onToggle={() => toggle("pulsoma")}
        icon={<Zap className="w-4 h-4 text-indigo-400" />}
        title={t.pulsoma_title}
        badge={pulsomaSync === "done" ? "✓ Синхронизировано" : "Pulsoma Medical"}
        badgeColor={pulsomaSync === "done" ? "text-primary" : "text-muted-foreground"}
      >
        <div className="pt-3 flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 flex-shrink-0 ${
            pulsomaSync === "done" ? "border-primary bg-primary/10"
            : "border-indigo-500/40 bg-indigo-500/10"
          }`}>
            {pulsomaSync === "done" ? <CheckCircle2 className="w-6 h-6 text-primary" />
              : pulsomaSync === "syncing" ? <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              : <Zap className="w-6 h-6 text-indigo-400" />}
          </div>
          <div className="flex-1">
            <div className="font-mono text-xs font-bold mb-0.5">
              {pulsomaSync === "done" ? "✓ ЭКГ, давление, O₂ синхронизированы" : t.pulsoma_desc}
            </div>
            <Button onClick={() => { setPulsomaSync("syncing"); setTimeout(() => setPulsomaSync("done"), 2500); }}
              disabled={pulsomaSync !== "idle"} size="sm"
              className={`font-mono text-xs mt-1 ${
                pulsomaSync === "done" ? "bg-primary/10 text-primary border-primary/30"
                : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30"
              }`} variant="outline">
              {pulsomaSync === "syncing" ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />{t.pulsoma_syncing}</>
                : pulsomaSync === "done" ? <><CheckCircle2 className="w-3 h-3 mr-1" />{t.pulsoma_synced}</>
                : <><RefreshCw className="w-3 h-3 mr-1" />{t.pulsoma_btn}</>}
            </Button>
          </div>
        </div>
      </Section>

      {/* ─ Устройства ─ */}
      <Section id="devices" open={!!open.devices} onToggle={() => toggle("devices")}
        icon={<Bluetooth className="w-4 h-4 text-cyan-400" />}
        title={t.device_title}
        badge={device ? `${device.name} · ${device.battery}%` : t.device_none}
        badgeColor={device ? "text-primary" : "text-muted-foreground"}
      >
        <div className="pt-3 space-y-2">
          {device && (
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/30 flex items-center gap-3 mb-1">
              <span className="text-2xl">{device.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-bold text-primary truncate">{device.name}</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span><Battery className="w-3 h-3 inline mr-0.5" />{device.battery}%</span>
                  <span><Clock className="w-3 h-3 inline mr-0.5" />{format(device.lastSync,"HH:mm")}</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing}
                  className="font-mono text-[10px] border-primary/30 text-primary px-2">
                  {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                </Button>
                <Button size="sm" variant="outline" onClick={disconnectDevice}
                  className="font-mono text-[10px] border-destructive/30 text-destructive px-2">
                  <BluetoothOff className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          {DEVICES.map(({ id, name, model, icon, color }) => {
            const isConnected = device?.id === id;
            const isConnecting = connecting && !device;
            return (
              <div key={id} className={`flex items-center justify-between p-2.5 rounded-lg border ${
                isConnected ? "border-primary/40 bg-primary/5" : "border-white/5"
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{icon}</span>
                  <div>
                    <div className={`font-mono text-xs font-bold ${color}`}>{name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{model}</div>
                  </div>
                </div>
                {isConnected ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {t.device_connected}
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => connectDevice(id)}
                    disabled={!!device || connecting} className="font-mono text-[10px] px-2.5 py-1 h-auto">
                    {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bluetooth className="w-3 h-3 mr-1" />}
                    {t.device_connect}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Section>

    </div>
  );
}
