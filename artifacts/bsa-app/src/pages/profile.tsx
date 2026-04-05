import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useLang } from "@/hooks/use-language";
import { useWallet } from "@/hooks/use-wallet";
import { useDevice, DeviceBrand } from "@/hooks/use-device";
import { useGetRewardsStats, useGetRewardsHistory } from "@workspace/api-client-react";
import {
  Shield, Wallet, RefreshCw, Loader2, CheckCircle2,
  Zap, Battery, Clock, Bluetooth, BluetoothOff, Lock, Unlock,
  FlaskConical, Dna, Calculator, Coins, ExternalLink,
  ChevronDown, ChevronRight, Send, ArrowDownToLine, AlertTriangle, TrendingDown,
  HeartPulse, Tag, Sparkles, Building2, Star, ArrowRight, RotateCcw, Stethoscope
} from "lucide-react";
import { CLINICS } from "@/data/clinics";
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

// ── Realistic earnings constants ────────────────────────────────────────────
// Max 200,000 KZT/year at Gold ×2.0
// 200,000 KZT / 470 USD/KZT / 150 SOL/USD = 2.836 SOL/year / 52 wks = 0.0546 SOL/wk
const WEEKLY_BASE_SOL = 0.0273;  // Bronze ×1.0 base
const STAKE_AMOUNT_SOL = 0.5;
const STAKE_DURATION_SEC = 7 * 24 * 3600;
const SOL_USD = 150;
const USD_KZT = 470;

// ── Accordion ───────────────────────────────────────────────────────────────
function Section({
  open, onToggle, icon, title, badge, badgeColor = "text-primary", accent, children
}: {
  open: boolean; onToggle: () => void;
  icon: React.ReactNode; title: string;
  badge?: string; badgeColor?: string;
  accent?: string; children: React.ReactNode;
}) {
  return (
    <div className={`glass-panel rounded-xl border overflow-hidden ${accent || "border-white/8"}`}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-white/5 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <span className="font-mono font-bold text-sm truncate">{title}</span>
          {badge && <span className={`text-xs font-mono font-bold flex-shrink-0 ${badgeColor}`}>{badge}</span>}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
               : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

// ── API helper ───────────────────────────────────────────────────────────────
function useApiBase() {
  const d = (window as any).__REPLIT_DEV_DOMAIN__;
  return d ? `https://${d}` : "";
}

export default function Profile() {
  const { t, lang } = useLang();
  const { address } = useWallet();
  const { device, connecting, connect: connectDevice, disconnect: disconnectDevice, syncNow, syncing } = useDevice();
  const base = useApiBase();

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }));
  const locale = LOCALE_MAP[lang];

  // ── Wallet balance ──────────────────────────────────────────────────────
  const [walletSol, setWalletSol] = useState<number | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);

  const fetchBalance = useCallback(async (silent = false) => {
    if (!silent) setBalanceLoading(true); else setBalanceRefreshing(true);
    try {
      const r = await fetch(`${base}/api/wallet/balance`);
      if (r.ok) { const d = await r.json(); setWalletSol(d.sol); setWalletAddress(d.address); }
    } catch {}
    setBalanceLoading(false); setBalanceRefreshing(false);
  }, [base]);

  useEffect(() => {
    fetchBalance();
    const iv = setInterval(() => fetchBalance(true), 30000);
    return () => clearInterval(iv);
  }, [fetchBalance]);

  // ── Rewards ─────────────────────────────────────────────────────────────
  const { data: stats } = useGetRewardsStats();
  const { data: history } = useGetRewardsHistory();
  const avgScore     = stats?.averageHealthScore || 88;
  const totalRewards = stats?.totalRewards || 3;
  const totalSol     = stats?.totalSolPaid || 0;
  const level        = getLevel(avgScore);
  const levelName    = level.name === "gold" ? t.level_gold : level.name === "silver" ? t.level_silver : t.level_bronze;

  // ── QTM Passport ────────────────────────────────────────────────────────
  const [qtmActive, setQtmActive]   = useState(false);
  const [qtmLoading, setQtmLoading] = useState(false);
  const qtmBoost = qtmActive ? QTM_TESTS.reduce((a,x) => a + x.boost, 0) : 0;
  const effectiveScore = Math.min(100, avgScore + qtmBoost);

  // ── Insurance Smart Lock ─────────────────────────────────────────────────
  const [simulateLocked, setSimulateLocked] = useState(false);
  const hoursWithoutSync = 2;
  const smartLockBurned = simulateLocked || hoursWithoutSync >= 48;
  const discount = Math.round(Math.min(30, Math.max(0, (avgScore - 50) / 50) * 30));

  // ── Pulsoma Sync ─────────────────────────────────────────────────────────
  const [pulsomaSync, setPulsomaSync] = useState<"idle"|"syncing"|"done">("idle");

  // ── Currency calc ────────────────────────────────────────────────────────
  const [calcCurrency, setCalcCurrency] = useState<"SOL"|"USD"|"KZT">("KZT");
  const weeklySOL = parseFloat((WEEKLY_BASE_SOL * level.multiplier).toFixed(4));
  const yearlySOL = parseFloat((weeklySOL * 52).toFixed(3));
  const yearlyUSD = Math.round(yearlySOL * SOL_USD);
  const yearlyKZT = Math.round(yearlyUSD * USD_KZT);
  const monthlySOL = parseFloat((yearlySOL / 12).toFixed(3));
  const monthlyKZT = Math.round(yearlyKZT / 12);

  function fmtCur(sol: number) {
    if (calcCurrency === "SOL") return `${sol.toFixed(3)} SOL`;
    if (calcCurrency === "USD") return `$${Math.round(sol * SOL_USD).toLocaleString()}`;
    return `${Math.round(sol * SOL_USD * USD_KZT).toLocaleString()}₸`;
  }

  // ── CLINIC PAYMENT (replaces send) ────────────────────────────────────────
  const CLINIC_SERVICES: Record<string, { name: string; priceKzt: number }[]> = {
    tibora: [
      { name: "Первичная консультация", priceKzt: 15000 },
      { name: "Акупунктура (5 сеансов)", priceKzt: 45000 },
      { name: "Аюрведическая диагностика", priceKzt: 25000 },
      { name: "Реабилитационная программа", priceKzt: 80000 },
    ],
    c1: [
      { name: "Консультация кардиолога", priceKzt: 12000 },
      { name: "ЭКГ + расшифровка", priceKzt: 8000 },
      { name: "Холтер-мониторинг 24ч", priceKzt: 20000 },
      { name: "Эхокардиография (ЭхоКГ)", priceKzt: 15000 },
    ],
    c2: [
      { name: "Консультация невролога", priceKzt: 9500 },
      { name: "МРТ головного мозга", priceKzt: 35000 },
      { name: "Нейробиологическая стимуляция", priceKzt: 18000 },
    ],
    c3: [
      { name: "Консультация эндокринолога", priceKzt: 8000 },
      { name: "УЗИ щитовидной железы", priceKzt: 6000 },
      { name: "Анализ на гормоны (7 показателей)", priceKzt: 12000 },
    ],
    c4: [
      { name: "Консультация ортопеда", priceKzt: 7500 },
      { name: "МРТ сустава", priceKzt: 28000 },
      { name: "PRP-терапия (1 сеанс)", priceKzt: 22000 },
    ],
    c5: [
      { name: "Консультация пульмонолога", priceKzt: 7000 },
      { name: "Спирометрия", priceKzt: 5000 },
      { name: "Бодиплетизмография", priceKzt: 10000 },
    ],
    c6: [
      { name: "Консультация гастроэнтеролога", priceKzt: 6500 },
      { name: "ФГДС (гастроскопия)", priceKzt: 18000 },
      { name: "УЗИ органов брюшной полости", priceKzt: 5000 },
    ],
  };

  const [payClinicId, setPayClinicId] = useState("tibora");
  const [payServiceIdx, setPayServiceIdx] = useState(0);
  const [payState, setPayState] = useState<"idle"|"paying"|"ok"|"err">("idle");
  const [payResult, setPayResult] = useState<any>(null);

  const selectedClinic = CLINICS.find(c => c.id === payClinicId) || CLINICS[0];
  const selectedServices = CLINIC_SERVICES[payClinicId] || [];
  const selectedService = selectedServices[payServiceIdx] || selectedServices[0];
  const clinicDisc = selectedClinic.medDiscount || 0;
  const fullPriceKzt = selectedService?.priceKzt || 0;
  const bsaPriceKzt  = Math.round(fullPriceKzt * (1 - clinicDisc / 100));
  const userPaysSol  = parseFloat((bsaPriceKzt / USD_KZT / SOL_USD).toFixed(4));
  const bsaLeadFeeSol = parseFloat((fullPriceKzt * (clinicDisc / 100) / USD_KZT / SOL_USD).toFixed(4));

  async function doPayClinic() {
    if (!selectedService || payState === "paying") return;
    setPayState("paying");
    try {
      const r = await fetch(`${base}/api/finance/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAddress: displayAddress,  // routes through BSA pool wallet
          amount: userPaysSol,
          memo: `BSA_CLINIC:${payClinicId}:${selectedService.name}`,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setPayResult({ ...d, clinic: selectedClinic, service: selectedService, userPaysSol, bsaLeadFeeSol, clinicDisc });
        setPayState("ok");
        fetchBalance(true);
      } else {
        setPayResult(d);
        setPayState("err");
      }
    } catch (e: any) {
      setPayResult({ error: e.message });
      setPayState("err");
    }
  }

  // ── STAKE (real API) ──────────────────────────────────────────────────────
  const [stakeData, setStakeData]   = useState<any>(null);
  const [stakeLoading, setStakeLoading] = useState(false);
  const [stakeTimer, setStakeTimer]  = useState(0);
  const [stakeAction, setStakeAction] = useState<"idle"|"claiming">("idle");
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const fetchStake = useCallback(async () => {
    const r = await fetch(`${base}/api/finance/stake/status`);
    if (r.ok) { const d = await r.json(); setStakeData(d); }
  }, [base]);

  useEffect(() => { fetchStake(); }, [fetchStake]);

  useEffect(() => {
    const active = stakeData?.active;
    if (active) {
      const ms = new Date(active.endsAt).getTime() - Date.now();
      setStakeTimer(Math.max(0, Math.floor(ms / 1000)));
      timerRef.current = setInterval(() => {
        setStakeTimer(p => Math.max(0, p - 1));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stakeData?.active]);

  async function startStake() {
    setStakeLoading(true);
    try {
      const r = await fetch(`${base}/api/finance/stake/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ healthScore: effectiveScore }),
      });
      if (r.ok) { await fetchStake(); fetchBalance(true); }
    } catch {}
    setStakeLoading(false);
  }

  async function claimStake() {
    setStakeAction("claiming");
    try {
      const r = await fetch(`${base}/api/finance/stake/claim`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ healthScore: effectiveScore }),
      });
      if (r.ok) { await fetchStake(); fetchBalance(true); }
    } catch {}
    setStakeAction("idle");
  }

  // ── MONTHLY EARNINGS ──────────────────────────────────────────────────────
  const [monthly, setMonthly] = useState<any>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawState, setWithdrawState] = useState<"idle"|"sending"|"ok"|"err">("idle");
  const [withdrawResult, setWithdrawResult] = useState<any>(null);

  const fetchMonthly = useCallback(async () => {
    const r = await fetch(`${base}/api/finance/monthly`);
    if (r.ok) { const d = await r.json(); setMonthly(d); }
  }, [base]);

  useEffect(() => { fetchMonthly(); }, [fetchMonthly]);

  async function doWithdraw() {
    if (!withdrawAddr) return;
    setWithdrawState("sending");
    try {
      const r = await fetch(`${base}/api/finance/monthly/withdraw`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toAddress: withdrawAddr }),
      });
      const d = await r.json();
      if (r.ok) { setWithdrawResult(d); setWithdrawState("ok"); fetchMonthly(); fetchBalance(true); }
      else { setWithdrawResult(d); setWithdrawState("err"); }
    } catch (e: any) { setWithdrawResult({ error: e.message }); setWithdrawState("err"); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  const displaySol = walletSol !== null ? walletSol : 0;
  const displayAddress = walletAddress || address;

  return (
    <div className="max-w-lg mx-auto space-y-3 animate-in fade-in duration-300 pb-8">

      {/* ════════════════════════════════════════════════════════════════════
          BANK CARD — реальный баланс
          ════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,255,128,0.15)]"
        style={{ background: "linear-gradient(135deg,#0a1a12 0%,#0d2318 50%,#0a1a12 100%)" }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage:"linear-gradient(rgba(0,255,128,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,128,0.3) 1px,transparent 1px)", backgroundSize:"32px 32px" }} />
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full opacity-5"
          style={{ background:"radial-gradient(circle,#00ff80,transparent)", transform:"translate(30%,30%)" }} />

        <div className="relative p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-sm">◎</div>
              <span className="font-mono text-xs text-primary font-bold tracking-widest">BSA · SOLANA</span>
            </div>
            <div className="flex items-center gap-2">
              {balanceRefreshing && <Loader2 className="w-3 h-3 text-primary/60 animate-spin" />}
              <button onClick={() => fetchBalance(true)} className="text-primary/40 hover:text-primary transition-colors p-1">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-mono text-primary">DEVNET</span>
              </div>
            </div>
          </div>

          {/* Balance */}
          {balanceLoading ? (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="font-mono text-muted-foreground text-sm">Подключение к Devnet RPC...</span>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                Баланс кошелька · Solana Devnet
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-mono text-primary neon-text tracking-tight">
                  {displaySol.toFixed(4)}
                </span>
                <span className="text-xl font-mono text-primary/60">SOL</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] font-mono text-muted-foreground">≈ ${(displaySol * SOL_USD).toFixed(2)}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-[11px] font-mono text-muted-foreground">{Math.round(displaySol * SOL_USD * USD_KZT).toLocaleString()}₸</span>
              </div>
              {displayAddress && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-mono text-muted-foreground/50 truncate max-w-[200px]">
                    {displayAddress.slice(0,8)}...{displayAddress.slice(-8)}
                  </span>
                  <a href={`https://explorer.solana.com/address/${displayAddress}?cluster=devnet`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-cyan-400/50 hover:text-cyan-400 flex-shrink-0 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "BSA наград",  value: `${totalSol.toFixed(2)} SOL`, sub: `${totalRewards} tx` },
              { label: levelName,     value: level.emoji,                   sub: `×${level.multiplier}` },
              { label: "Скидка",      value: smartLockBurned ? "0%" : `${discount}%`, sub: "страховка" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-black/40 rounded-xl p-2.5 border border-white/5 text-center">
                <div className="text-[9px] font-mono text-muted-foreground uppercase mb-1">{label}</div>
                <div className="font-mono font-bold text-sm">{value}</div>
                <div className="text-[9px] font-mono text-muted-foreground mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          {walletSol !== null && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 text-[11px] font-mono text-primary/70 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              Реальный баланс с Devnet · обновляется каждые 30с
            </div>
          )}

          {/* Tx history */}
          {history && history.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Последние начисления</p>
              {history.slice(0,3).map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-1.5 border border-white/5">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {format(new Date(r.createdAt), "d MMM HH:mm", { locale })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-primary">+{r.amount} SOL</span>
                    {r.txSignature && (
                      <a href={`https://explorer.solana.com/tx/${r.txSignature}?cluster=devnet`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-cyan-400/60 hover:text-cyan-400">
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

      {/* ════════════════════════════════════════════════════════════════════
          АККОРДЕОН — все секции
          ════════════════════════════════════════════════════════════════════ */}

      {/* ─ Оплата приёма в клинике ─ */}
      <Section open={!!open.send} onToggle={() => toggle("send")}
        icon={<Stethoscope className="w-4 h-4 text-primary" />}
        title="Оплата приёма"
        badge={payState === "ok" ? "✓ Оплачено" : selectedClinic ? `−${clinicDisc}% · ${userPaysSol} SOL` : "Выберите клинику"}
        badgeColor={payState === "ok" ? "text-primary" : "text-primary/70"}
        accent="border-primary/20"
      >
        <div className="pt-3 space-y-3">

          {/* ── Круговая экономика BSA ── */}
          <div className="bg-black/30 border border-primary/15 rounded-xl p-3">
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2 text-center">Как работает BSA-экономика</p>
            <div className="flex items-center justify-between gap-1">
              {[
                { icon: "💪", label: "Майнишь", sub: "здоровьем", color: "text-primary" },
                { icon: "→",  label: "",         sub: "",          color: "text-muted-foreground/40" },
                { icon: "🏥", label: "Платишь",  sub: "50% клинике", color: "text-cyan-400" },
                { icon: "→",  label: "",         sub: "",          color: "text-muted-foreground/40" },
                { icon: "💰", label: "Клиника",  sub: "→ BSA лид", color: "text-amber-400" },
                { icon: "→",  label: "",         sub: "",          color: "text-muted-foreground/40" },
                { icon: "🔄", label: "Пул BSA",  sub: "растёт",   color: "text-rose-400" },
              ].map((s, i) => s.icon === "→" ? (
                <ArrowRight key={i} className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
              ) : (
                <div key={i} className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <span className="text-base">{s.icon}</span>
                  <span className={`text-[8px] font-mono font-bold ${s.color}`}>{s.label}</span>
                  <span className="text-[7px] font-mono text-muted-foreground/60 text-center leading-tight">{s.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {payState === "ok" && payResult ? (
            /* ── Чек об оплате ── */
            <div className="space-y-3">
              <div className="relative rounded-xl border border-primary/40 overflow-hidden"
                style={{ background: "linear-gradient(135deg,#050f08 0%,#0a1812 100%)" }}>
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
                <div className="p-4 space-y-3">
                  <div className="text-center">
                    <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="font-mono font-bold text-primary text-lg">Приём оплачен</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{payResult.service?.name}</div>
                  </div>

                  {/* Flow receipt */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2.5 border border-white/5">
                      <span className="text-sm">💪</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-muted-foreground">Ты потратил (50% цены)</div>
                        <div className="font-mono font-bold text-sm text-foreground">{payResult.userPaysSol} SOL</div>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground text-right">
                        ≈ {Math.round(payResult.userPaysSol * SOL_USD * USD_KZT).toLocaleString()}₸
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 rotate-90" />
                    </div>
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2.5 border border-white/5">
                      <span className="text-sm">🏥</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-muted-foreground">{payResult.clinic?.name} получила</div>
                        <div className="font-mono font-bold text-sm text-cyan-400">{payResult.userPaysSol} SOL</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 rotate-90" />
                    </div>
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2.5 border border-amber-500/20">
                      <span className="text-sm">💰</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-muted-foreground">Клиника платит BSA (лид-фи)</div>
                        <div className="font-mono font-bold text-sm text-amber-400">+{payResult.bsaLeadFeeSol} SOL → пул</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 rotate-90" />
                    </div>
                    <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                      <span className="text-sm">🔄</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-primary/70">BSA пул пополнен</div>
                        <div className="font-mono font-bold text-sm text-primary">Цикл замкнут ✓</div>
                      </div>
                    </div>
                  </div>

                  {payResult.explorerUrl && (
                    <a href={payResult.explorerUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 text-cyan-400/70 text-[10px] font-mono hover:text-cyan-400 transition-colors">
                      <ExternalLink className="w-3 h-3" />Просмотр в Solana Explorer
                    </a>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full font-mono text-xs"
                onClick={() => { setPayState("idle"); setPayResult(null); }}>
                <RotateCcw className="w-3 h-3 mr-1.5" />Оплатить ещё один приём
              </Button>
            </div>

          ) : payState === "err" ? (
            <div className="space-y-2">
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center">
                <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-1" />
                <div className="text-xs font-mono text-destructive">{payResult?.error || "Ошибка транзакции"}</div>
              </div>
              <Button size="sm" variant="outline" className="w-full font-mono text-xs"
                onClick={() => { setPayState("idle"); setPayResult(null); }}>
                Попробовать снова
              </Button>
            </div>

          ) : (
            /* ── Форма оплаты ── */
            <>
              {/* Выбор клиники */}
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 block">Клиника-партнёр</label>
                <div className="space-y-1.5">
                  {CLINICS.slice(0, 4).map(c => (
                    <button key={c.id} onClick={() => { setPayClinicId(c.id); setPayServiceIdx(0); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                        payClinicId === c.id
                          ? c.flagship ? "border-amber-500/50 bg-amber-500/8" : "border-primary/50 bg-primary/8"
                          : "border-white/8 bg-black/20 hover:border-white/20"
                      }`}>
                      <span className="text-base flex-shrink-0">{c.flagship ? "🌿" : "🏥"}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-mono text-xs font-bold truncate ${c.flagship ? "text-amber-200" : "text-foreground"}`}>
                          {c.name}
                          {c.flagship && <span className="text-[8px] text-amber-400/70 ml-1">· Флагман</span>}
                        </div>
                        <div className="text-[9px] font-mono text-muted-foreground">{c.city || "Алматы"} · {c.mainSpec}</div>
                      </div>
                      <div className={`font-mono font-bold text-sm flex-shrink-0 ${c.flagship ? "text-amber-300" : "text-primary"}`}>
                        −{c.medDiscount}%
                      </div>
                    </button>
                  ))}
                  {CLINICS.length > 4 && (
                    <Link href="/clinics" className="block text-center text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground py-1">
                      + ещё {CLINICS.length - 4} клиники →
                    </Link>
                  )}
                </div>
              </div>

              {/* Выбор услуги */}
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 block">Услуга</label>
                <div className="space-y-1">
                  {selectedServices.map((svc, i) => (
                    <button key={svc.name} onClick={() => setPayServiceIdx(i)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                        payServiceIdx === i ? "border-primary/40 bg-primary/5" : "border-white/8 bg-black/20 hover:border-white/15"
                      }`}>
                      <span className="font-mono text-xs truncate flex-1 mr-2">{svc.name}</span>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-xs text-muted-foreground line-through">{svc.priceKzt.toLocaleString()}₸</div>
                        <div className="font-mono text-xs font-bold text-primary">{Math.round(svc.priceKzt * (1 - clinicDisc / 100)).toLocaleString()}₸</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Итого */}
              {selectedService && (
                <div className="relative rounded-xl border border-primary/25 overflow-hidden"
                  style={{ background: "linear-gradient(135deg,#050f08 0%,#0a1214 100%)" }}>
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  <div className="p-3 space-y-2">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Расчёт оплаты</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                        <div className="text-[9px] font-mono text-muted-foreground">Стандартная цена</div>
                        <div className="font-mono text-sm font-bold text-muted-foreground line-through">{fullPriceKzt.toLocaleString()}₸</div>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-2 border border-primary/20">
                        <div className="text-[9px] font-mono text-primary/70">Ваша цена BSA</div>
                        <div className="font-mono text-sm font-bold text-primary">{bsaPriceKzt.toLocaleString()}₸</div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-[10px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Вы платите SOL</span>
                        <span className="font-bold text-foreground">{userPaysSol} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Скидка (медбаланс)</span>
                        <span className="font-bold text-primary">−{clinicDisc}% = {bsaLeadFeeSol} SOL</span>
                      </div>
                      <div className="h-px bg-white/5" />
                      <div className="flex justify-between">
                        <span className="text-amber-400/70">Клиника → BSA лид-фи</span>
                        <span className="font-bold text-amber-400">+{bsaLeadFeeSol} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/60">Ваша экономия</span>
                        <span className="text-rose-400 font-bold">{(fullPriceKzt - bsaPriceKzt).toLocaleString()}₸</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={doPayClinic}
                disabled={payState === "paying" || !selectedService || displaySol < userPaysSol}
                className="w-full font-mono bg-primary text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,128,0.3)]">
                {payState === "paying"
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Обработка...</>
                  : displaySol < userPaysSol ? "Недостаточно SOL"
                  : <><Stethoscope className="w-4 h-4 mr-2" />Оплатить {userPaysSol} SOL · {bsaPriceKzt.toLocaleString()}₸</>}
              </Button>
              <p className="text-[10px] font-mono text-muted-foreground/50 text-center">
                SOL → Пул BSA → клиника получает подтверждение · Devnet
              </p>
            </>
          )}
        </div>
      </Section>

      {/* ─ Ежемесячные заработки + вывод ─ */}
      <Section open={!!open.monthly} onToggle={() => toggle("monthly")}
        icon={<ArrowDownToLine className="w-4 h-4 text-emerald-400" />}
        title="Ежемесячный доход"
        badge={monthly?.canWithdraw ? `↓ ${monthly?.net} SOL доступно` : monthly?.current?.withdrawn ? "✓ Выведено" : `${monthly?.current?.compliancePct || 0}% комплаенс`}
        badgeColor={monthly?.canWithdraw ? "text-emerald-400" : monthly?.current?.withdrawn ? "text-primary" : "text-muted-foreground"}
        accent="border-emerald-500/20"
      >
        <div className="pt-3 space-y-3">
          {/* Rules banner */}
          <div className="bg-black/30 rounded-xl border border-white/5 p-3 space-y-1.5">
            <p className="text-[10px] font-mono text-muted-foreground font-bold uppercase tracking-wider mb-2">Правила вывода</p>
            {[
              { icon: "📅", text: "Вывод 1 раз в месяц" },
              { icon: "💪", text: "Держать Health Score ≥80% весь месяц" },
              { icon: "⬇️", text: "Неделя ниже 80% → пропорциональный минус" },
              { icon: "💸", text: "Макс до 200 000₸/год при Gold уровне" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2 text-[10px] font-mono text-muted-foreground">
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>

          {monthly ? (
            <>
              {/* Compliance meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Комплаенс за {monthly.month}</span>
                  <span className={monthly.current.compliancePct >= 80 ? "text-primary" : "text-destructive"}>
                    {monthly.current.compliancePct}% ({monthly.current.weeksCompliant}/{monthly.current.totalWeeks} нед)
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${monthly.current.compliancePct}%`,
                      background: monthly.current.compliancePct >= 80 ? "#00ff80" : "#ef4444" }} />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground/50">
                  <span>0%</span>
                  <span className="text-yellow-500/60">80% мин</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Earnings breakdown */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Начислено", value: `${monthly.current.earnedSol} SOL`, color: "text-foreground" },
                  { label: "Штраф",     value: `-${monthly.current.penaltyAmountSol.toFixed(4)} SOL`, color: "text-destructive" },
                  { label: "К выводу",  value: `${monthly.net} SOL`, color: "text-emerald-400" },
                  { label: "≈ в KZT",   value: `${Math.round((monthly.net||0) * SOL_USD * USD_KZT).toLocaleString()}₸`, color: "text-cyan-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                    <div className="text-[9px] font-mono text-muted-foreground mb-1">{label}</div>
                    <div className={`font-mono font-bold text-sm ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Withdraw form or result */}
              {monthly.current.withdrawn ? (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center">
                  <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="font-mono text-xs text-primary">Выведено в {monthly.month}</div>
                  {monthly.current.withdrawSignature && (
                    <a href={`https://explorer.solana.com/tx/${monthly.current.withdrawSignature}?cluster=devnet`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-cyan-400 text-[10px] font-mono flex items-center justify-center gap-1 mt-1 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Explorer
                    </a>
                  )}
                </div>
              ) : !monthly.canWithdraw ? (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-[10px] font-mono text-destructive">
                    Нужно ≥80% комплаенс для вывода. Сейчас {monthly.current.compliancePct}%.
                    Держите Health Score выше 80 каждую неделю до конца месяца.
                  </div>
                </div>
              ) : withdrawState === "ok" && withdrawResult ? (
                <div className="space-y-2">
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center">
                    <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1" />
                    <div className="font-mono font-bold text-primary">{withdrawResult.amount} SOL выведено!</div>
                  </div>
                  <a href={withdrawResult.explorerUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-cyan-400 text-xs font-mono hover:underline">
                    <ExternalLink className="w-3 h-3" /> Solana Explorer
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Адрес для вывода</label>
                    <input value={withdrawAddr} onChange={e => setWithdrawAddr(e.target.value)}
                      placeholder={displayAddress || "Ваш Solana адрес..."}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                  </div>
                  <Button onClick={doWithdraw} disabled={withdrawState === "sending" || !withdrawAddr}
                    className="w-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]" variant="outline">
                    {withdrawState === "sending"
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Вывод...</>
                      : <><ArrowDownToLine className="w-4 h-4 mr-2" />Вывести {monthly.net} SOL</>}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4"><Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" /></div>
          )}
        </div>
      </Section>

      {/* ─ Целевой медицинский баланс ─ */}
      <Section open={!!open.medbal} onToggle={() => toggle("medbal")}
        icon={<HeartPulse className="w-4 h-4 text-rose-400" />}
        title="Целевой медбаланс"
        badge={`${(displaySol * 0.16).toFixed(3)} SOL заморожено`}
        badgeColor="text-rose-400"
        accent="border-rose-500/25"
      >
        <div className="pt-3 space-y-3">
          {/* Hero card */}
          <div className="relative rounded-xl overflow-hidden"
            style={{ background: "linear-gradient(135deg,#1a0808 0%,#0f1218 50%,#0a100f 100%)" }}>
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-mono text-rose-400/70 uppercase tracking-widest mb-1">Заморожено на медицину</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-rose-300">
                      {(displaySol * 0.16).toFixed(3)}
                    </span>
                    <span className="font-mono text-rose-400/60">SOL</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      ≈ {Math.round(displaySol * 0.16 * SOL_USD * USD_KZT).toLocaleString()}₸
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-rose-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                  <div className="text-[9px] font-mono text-muted-foreground mb-1">Можно потратить</div>
                  <div className="font-mono font-bold text-sm text-rose-300">Только клиники</div>
                  <div className="text-[9px] font-mono text-muted-foreground">партнёры BSA</div>
                </div>
                <div className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                  <div className="text-[9px] font-mono text-muted-foreground mb-1">Ваша скидка</div>
                  <div className="font-mono font-bold text-sm text-primary">до 50%</div>
                  <div className="text-[9px] font-mono text-muted-foreground">при оплате SOL</div>
                </div>
              </div>

              <div className="bg-rose-500/8 border border-rose-500/20 rounded-lg p-2.5 text-[10px] font-mono text-rose-300/80 flex items-start gap-2">
                <Lock className="w-3 h-3 flex-shrink-0 mt-0.5" />
                SOL заморожены смарт-контрактом — нельзя вывести или потратить вне клиник-партнёров BSA.
                Это гарантирует целевое использование средств.
              </div>
            </div>
          </div>

          {/* Partner clinics with discounts */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
              Скидка при оплате медбалансом
            </p>
            <div className="space-y-1.5">
              {/* Tibora — flagship */}
              <div className="relative flex items-center gap-3 p-3 rounded-xl border border-amber-500/50 overflow-hidden"
                style={{ background: "linear-gradient(135deg,#1a1200 0%,#0f0f0a 100%)" }}>
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-lg">
                  🌿
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-xs font-bold text-amber-200">Tibora</span>
                    <span className="text-[8px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1 py-0.5 flex items-center gap-0.5">
                      <Sparkles className="w-2 h-2" />ФЛАГМАН
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground">Центр вост. медицины · Астана</div>
                </div>
                <div className="text-center flex-shrink-0">
                  <div className="font-mono font-bold text-xl text-amber-300">50%</div>
                  <div className="text-[8px] font-mono text-amber-400/60">скидка</div>
                </div>
              </div>

              {/* Other partners */}
              {[
                { name: "Cardio Life Premium", icon: "🫀", spec: "Кардиология", discount: 30, color: "primary" },
                { name: "NeuroBalance Clinic", icon: "🧠", spec: "Неврология",   discount: 25, color: "primary" },
                { name: "EndoMed Center",       icon: "💉", spec: "Эндокринология", discount: 20, color: "primary" },
                { name: "PulmoVita",            icon: "🫁", spec: "Пульмонология", discount: 20, color: "primary" },
                { name: "OrthoSport Clinic",    icon: "🦴", spec: "Ортопедия",     discount: 15, color: "primary" },
                { name: "GastroComfort",        icon: "🏥", spec: "Гастроэнтерология", discount: 10, color: "primary" },
              ].map(({ name, icon, spec, discount }) => (
                <div key={name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-black/30 border border-white/5">
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-bold truncate">{name}</div>
                    <div className="text-[9px] font-mono text-muted-foreground">{spec}</div>
                  </div>
                  <div className="font-mono font-bold text-sm text-primary flex-shrink-0">−{discount}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Example calculation */}
          <div className="bg-black/20 border border-white/5 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-mono text-muted-foreground uppercase">Пример расчёта · Tibora</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <div className="text-[9px] font-mono text-muted-foreground">Стоимость приёма</div>
                <div className="font-mono font-bold text-sm">15,000₸</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] font-mono text-muted-foreground">С медбалансом BSA</div>
                <div className="font-mono font-bold text-sm text-primary">7,500₸</div>
              </div>
            </div>
            <div className="h-0.5 bg-white/5 rounded-full" />
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-muted-foreground">Ваша экономия за приём</span>
              <span className="text-primary font-bold">7,500₸ (~0.106 SOL)</span>
            </div>
          </div>

          <Link href="/clinics">
            <Button className="w-full font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 shadow-[0_0_15px_rgba(244,63,94,0.15)]" variant="outline">
              <Building2 className="w-4 h-4 mr-2" />Использовать в клинике-партнёре
            </Button>
          </Link>
        </div>
      </Section>

      {/* ─ Health Stake (реальный) ─ */}
      <Section open={!!open.stake} onToggle={() => toggle("stake")}
        icon={<Coins className="w-4 h-4 text-violet-400" />}
        title={t.stake_title || "Health Stake"}
        badge={stakeData?.active ? formatTimer(stakeTimer) : stakeData?.history?.[0]?.status === "claimed" ? "✓ Завершён" : `${STAKE_AMOUNT_SOL} SOL → +10%`}
        badgeColor={stakeData?.active ? "text-violet-400" : "text-muted-foreground"}
        accent="border-violet-500/20"
      >
        <div className="pt-3">
          {!stakeData ? (
            <div className="text-center py-4"><Loader2 className="w-5 h-5 text-violet-400 animate-spin mx-auto" /></div>
          ) : stakeData.active ? (
            <div className="space-y-3">
              {/* Timer card */}
              <div className="bg-violet-500/10 rounded-xl border border-violet-500/30 p-4 text-center">
                <div className="text-[10px] font-mono text-violet-400 uppercase mb-1">Осталось</div>
                <div className="text-3xl font-bold font-mono text-violet-300">{formatTimer(stakeTimer)}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">
                  0.5 SOL · +10% если Health ≥80
                </div>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(0, 100 - (stakeTimer / STAKE_DURATION_SEC) * 100)}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-black/30 rounded-lg border border-white/5">
                  <div className="text-[9px] font-mono text-muted-foreground">Стейк</div>
                  <div className="font-mono font-bold text-sm text-violet-300">{stakeData.active.amountSol} SOL</div>
                </div>
                <div className="text-center p-2 bg-black/30 rounded-lg border border-white/5">
                  <div className="text-[9px] font-mono text-muted-foreground">Возврат</div>
                  <div className="font-mono font-bold text-sm text-primary">
                    {(stakeData.active.amountSol * 1.1).toFixed(2)} SOL
                  </div>
                </div>
              </div>
              {stakeTimer === 0 ? (
                <Button onClick={claimStake} disabled={stakeAction === "claiming"}
                  className="w-full font-mono bg-violet-500/30 text-violet-200 border border-violet-500/50 hover:bg-violet-500/40" variant="outline">
                  {stakeAction === "claiming"
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Забираем...</>
                    : <><CheckCircle2 className="w-4 h-4 mr-2" />Забрать стейк</>}
                </Button>
              ) : (
                <Button onClick={claimStake} disabled={stakeAction === "claiming"}
                  variant="outline" size="sm"
                  className="w-full font-mono text-[10px] text-destructive/60 border-destructive/20">
                  ⚠️ Досрочно (−20% штраф)
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {/* Last stake result */}
              {stakeData.history?.[0] && stakeData.history[0].status !== "active" && (
                <div className={`p-2.5 rounded-lg border text-[10px] font-mono ${
                  stakeData.history[0].status === "claimed" ? "bg-primary/5 border-primary/20 text-primary"
                  : "bg-destructive/5 border-destructive/20 text-destructive"
                }`}>
                  Последний: {stakeData.history[0].status === "claimed" ? "✓ Успешно" : "⚠️ Штраф"} ·
                  {stakeData.history[0].returnAmountSol?.toFixed(3)} SOL получено
                </div>
              )}
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Стейк",        value: `${STAKE_AMOUNT_SOL} SOL`, color: "text-violet-300" },
                  { label: "Бонус если ≥80", value: "+10%",                  color: "text-primary" },
                  { label: "Штраф если <80", value: "−50%",                  color: "text-destructive" },
                  { label: "Период",        value: "7 дней",                 color: "text-muted-foreground" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                    <div className="text-[9px] font-mono text-muted-foreground">{label}</div>
                    <div className={`font-mono font-bold text-sm ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 text-[10px] font-mono text-muted-foreground space-y-1">
                <p>✓ При Health Score ≥80% весь период → возврат + 10% бонус</p>
                <p>✗ Если за неделю Health упадёт → 50% штраф от суммы стейка</p>
                <p>✗ Досрочный выход → 20% штраф от суммы стейка</p>
              </div>
              <Button onClick={startStake} disabled={stakeLoading || displaySol < STAKE_AMOUNT_SOL + 0.01}
                className="w-full font-mono bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]" variant="outline">
                {stakeLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Запуск...</>
                  : displaySol < STAKE_AMOUNT_SOL + 0.01 ? "Недостаточно баланса"
                  : <><Coins className="w-4 h-4 mr-2" />Стейкнуть {STAKE_AMOUNT_SOL} SOL</>}
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* ─ Реалистичный калькулятор ─ */}
      <Section open={!!open.calc} onToggle={() => toggle("calc")}
        icon={<Calculator className="w-4 h-4 text-cyan-400" />}
        title="Калькулятор дохода"
        badge={calcCurrency === "KZT" ? `${yearlyKZT.toLocaleString()}₸/год`
          : calcCurrency === "USD" ? `$${yearlyUSD}/год`
          : `${yearlySOL} SOL/год`}
        badgeColor="text-cyan-400"
      >
        <div className="pt-3 space-y-3">
          {/* Currency toggle */}
          <div className="flex gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
            {(["KZT","USD","SOL"] as const).map(cur => (
              <button key={cur} onClick={() => setCalcCurrency(cur)}
                className={`flex-1 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                  calcCurrency === cur
                    ? cur === "KZT" ? "bg-cyan-500 text-black"
                      : cur === "USD" ? "bg-emerald-500 text-black"
                      : "bg-primary text-black"
                    : "text-muted-foreground"
                }`}>
                {cur === "KZT" ? "₸ KZT" : cur === "USD" ? "$ USD" : "◎ SOL"}
              </button>
            ))}
          </div>

          {/* Main number */}
          <div className="bg-black/40 rounded-xl border border-white/10 p-4 text-center">
            <div className="text-[10px] font-mono text-muted-foreground uppercase mb-2 tracking-widest">
              {levelName} · ×{level.multiplier} · при Health ≥80%
            </div>
            <div className="flex items-baseline gap-2 justify-center mb-1">
              <span className={`text-4xl font-bold font-mono ${
                calcCurrency === "KZT" ? "text-cyan-400" : calcCurrency === "USD" ? "text-emerald-400" : "text-primary"
              }`}>
                {calcCurrency === "KZT" ? yearlyKZT.toLocaleString()
                  : calcCurrency === "USD" ? yearlyUSD.toLocaleString()
                  : yearlySOL}
              </span>
              <span className="text-lg font-mono opacity-50">
                {calcCurrency === "KZT" ? "₸" : calcCurrency === "USD" ? "USD" : "SOL"}
              </span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">в год</div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "В неделю",    sol: weeklySOL },
              { label: "В месяц",     sol: monthlySOL },
              { label: "В год",       sol: yearlySOL },
              { label: "Максимум",    sol: 0.0546 * 52 },
            ].map(({ label, sol }) => (
              <div key={label} className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                <div className="text-[9px] font-mono text-muted-foreground">{label}</div>
                <div className="font-mono font-bold text-sm text-foreground">{fmtCur(sol)}</div>
              </div>
            ))}
          </div>

          {/* Level comparison */}
          <div className="bg-black/20 rounded-lg p-3 border border-white/5">
            <div className="text-[10px] font-mono text-muted-foreground mb-2 uppercase">Сравнение уровней</div>
            {[
              { name: t.level_bronze, sol: WEEKLY_BASE_SOL * 1.0 * 52, color: "#cd7f32" },
              { name: t.level_silver, sol: WEEKLY_BASE_SOL * 1.5 * 52, color: "#94a3b8" },
              { name: t.level_gold,   sol: WEEKLY_BASE_SOL * 2.0 * 52, color: "#facc15" },
            ].map(({ name, sol, color }) => {
              const pct = (sol / (WEEKLY_BASE_SOL * 2.0 * 52)) * 100;
              const val = calcCurrency === "SOL" ? `${sol.toFixed(2)} SOL`
                : calcCurrency === "USD" ? `$${Math.round(sol * SOL_USD)}`
                : `${Math.round(sol * SOL_USD * USD_KZT / 1000).toFixed(0)}K₸`;
              return (
                <div key={name} className="flex items-center gap-2 py-1">
                  <div className="w-10 text-[10px] font-mono flex-shrink-0" style={{ color }}>{name}</div>
                  <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="text-[10px] font-mono font-bold w-14 text-right flex-shrink-0" style={{ color }}>{val}</div>
                </div>
              );
            })}
            <div className="mt-2 pt-2 border-t border-white/5 text-[9px] font-mono text-muted-foreground/60">
              * Только при Health Score ≥80% каждую неделю. При снижении — штраф.
            </div>
          </div>
        </div>
      </Section>

      {/* ─ Уровень + Страховка ─ */}
      <Section open={!!open.level} onToggle={() => toggle("level")}
        icon={<Coins className="w-4 h-4" style={{ color: level.color }} />}
        title="Уровень и страховка"
        badge={`${level.emoji} ${levelName} · ×${level.multiplier}`}
        badgeColor="text-foreground/70"
      >
        <div className="pt-3 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-4 flex flex-col items-center justify-center flex-shrink-0"
              style={{ borderColor: level.color, background: level.color + "15" }}>
              <span className="text-xl">{level.emoji}</span>
            </div>
            <div className="flex-1 space-y-1.5">
              <div>
                <div className="text-[10px] font-mono text-muted-foreground">Множитель · Health Score</div>
                <div className="text-2xl font-bold font-mono" style={{ color: level.color }}>×{level.multiplier.toFixed(1)}</div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                  <span>Score</span>
                  <span style={{ color: level.color }}>{effectiveScore}/100</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${effectiveScore}%`, background: level.color }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: "bronze", label: t.level_bronze, range: "0–59", color: "#cd7f32" },
              { key: "silver", label: t.level_silver, range: "60–79", color: "#94a3b8" },
              { key: "gold",   label: t.level_gold,   range: "80+",  color: "#facc15" },
            ].map(({ key, label, range, color }) => (
              <div key={key} className="p-2 rounded-lg border text-center text-[10px] font-mono transition-all"
                style={{
                  borderColor: level.name === key ? color : color + "30",
                  background:  level.name === key ? color + "15" : "transparent",
                  color: level.name === key ? color : "#4b5563",
                }}>
                <div className="font-bold">{label}</div>
                <div>{range}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Скидка на страховку</span>
              <span className={`text-xl font-bold font-mono ${smartLockBurned ? "text-destructive" : "text-primary"}`}>
                {smartLockBurned ? "0%" : `${discount}%`}
              </span>
            </div>
            <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-mono ${
              smartLockBurned ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-primary/5 border-primary/20 text-primary"}`}>
              {smartLockBurned ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="flex-1">{smartLockBurned ? "Smart Lock: скидка заморожена" : `Smart Lock: данные актуальны · ${Math.max(0, 48 - hoursWithoutSync)}ч`}</span>
              <button onClick={() => setSimulateLocked(p => !p)}
                className="text-[10px] opacity-40 hover:opacity-100 border border-current/30 rounded px-1.5 py-0.5">
                {simulateLocked ? "↺" : "⚡sim"}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* ─ QTM Паспорт ─ */}
      <Section open={!!open.qtm} onToggle={() => toggle("qtm")}
        icon={<Dna className="w-4 h-4 text-emerald-400" />}
        title="Цифровой паспорт QTM"
        badge={qtmActive ? `+${qtmBoost} Health Score` : "Pulsoma Medical"}
        badgeColor={qtmActive ? "text-emerald-400" : "text-muted-foreground"}
      >
        <div className="pt-3 space-y-2">
          {qtmActive ? QTM_TESTS.map(({ icon, name, value, status, boost, date }) => (
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
          )) : (
            <Button onClick={() => { setQtmLoading(true); setTimeout(() => { setQtmLoading(false); setQtmActive(true); }, 2000); }}
              disabled={qtmLoading}
              className="w-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" variant="outline">
              {qtmLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Загрузка...</>
                : <><FlaskConical className="w-4 h-4 mr-2" />Подключить QTM паспорт</>}
            </Button>
          )}
        </div>
      </Section>

      {/* ─ Pulsoma Sync ─ */}
      <Section open={!!open.pulsoma} onToggle={() => toggle("pulsoma")}
        icon={<Zap className="w-4 h-4 text-indigo-400" />}
        title="Pulsoma Sync"
        badge={pulsomaSync === "done" ? "✓ Синхронизировано" : "Pulsoma Medical"}
        badgeColor={pulsomaSync === "done" ? "text-primary" : "text-muted-foreground"}
      >
        <div className="pt-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 flex-shrink-0 ${
            pulsomaSync === "done" ? "border-primary bg-primary/10" : "border-indigo-500/40 bg-indigo-500/10"}`}>
            {pulsomaSync === "done" ? <CheckCircle2 className="w-5 h-5 text-primary" />
              : pulsomaSync === "syncing" ? <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              : <Zap className="w-5 h-5 text-indigo-400" />}
          </div>
          <div className="flex-1">
            <div className="font-mono text-xs font-bold mb-1">
              {pulsomaSync === "done" ? "ЭКГ, давление, SpO₂ — синхронизированы" : "Синхронизация с медицинской картой"}
            </div>
            <Button onClick={() => { setPulsomaSync("syncing"); setTimeout(() => setPulsomaSync("done"), 2500); }}
              disabled={pulsomaSync !== "idle"} size="sm" variant="outline"
              className={`font-mono text-xs ${pulsomaSync === "done"
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"}`}>
              {pulsomaSync === "syncing" ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Синхронизация...</>
                : pulsomaSync === "done" ? <><CheckCircle2 className="w-3 h-3 mr-1" />Синхронизировано</>
                : <><RefreshCw className="w-3 h-3 mr-1" />Синхронизировать</>}
            </Button>
          </div>
        </div>
      </Section>

      {/* ─ Устройства ─ */}
      <Section open={!!open.devices} onToggle={() => toggle("devices")}
        icon={<Bluetooth className="w-4 h-4 text-cyan-400" />}
        title="Подключённые устройства"
        badge={device ? `${device.name} · ${device.battery}%` : "Нет устройств"}
        badgeColor={device ? "text-primary" : "text-muted-foreground"}
      >
        <div className="pt-3 space-y-2">
          {device && (
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/30 flex items-center gap-3 mb-1">
              <span className="text-xl">{device.icon}</span>
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
            const isConn = device?.id === id;
            return (
              <div key={id} className={`flex items-center justify-between p-2.5 rounded-lg border ${isConn ? "border-primary/40 bg-primary/5" : "border-white/5"}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{icon}</span>
                  <div>
                    <div className={`font-mono text-xs font-bold ${color}`}>{name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{model}</div>
                  </div>
                </div>
                {isConn ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Подключён
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => connectDevice(id)}
                    disabled={!!device || connecting}
                    className="font-mono text-[10px] px-2.5 py-1 h-auto">
                    {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bluetooth className="w-3 h-3 mr-1" />}
                    Подключить
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
