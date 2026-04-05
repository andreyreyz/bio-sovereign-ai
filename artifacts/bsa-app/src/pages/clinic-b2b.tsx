import { useState } from "react";
import { Link } from "wouter";
import {
  Building2, BarChart3, Users, Coins, TrendingUp, ArrowLeft,
  Shield, CheckCircle2, Loader2, Eye, EyeOff, ExternalLink,
  AlertTriangle, RefreshCw, Plus, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLINICS } from "@/data/clinics";

const DEMO_LOGIN = { email: "manager@cardiolife.kz", password: "bsa2026" };

const SOL_USD = 150;
const USD_KZT = 470;

function useApiBase() {
  const d = (window as any).__REPLIT_DEV_DOMAIN__;
  return d ? `https://${d}` : "";
}

export default function ClinicB2B() {
  const base = useApiBase();
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Use Cardio Life as the demo clinic
  const clinic = CLINICS[0];

  // Budget top-up
  const [topupAmt, setTopupAmt] = useState("");
  const [topupState, setTopupState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [topupResult, setTopupResult] = useState<any>(null);

  function doLogin() {
    setLoginLoading(true);
    setLoginError("");
    setTimeout(() => {
      if (email === DEMO_LOGIN.email && password === DEMO_LOGIN.password) {
        setLoggedIn(true);
      } else {
        setLoginError("Неверный email или пароль. Демо: manager@cardiolife.kz / bsa2026");
      }
      setLoginLoading(false);
    }, 1200);
  }

  async function doTopup() {
    if (!topupAmt || parseFloat(topupAmt) <= 0) return;
    setTopupState("sending");
    try {
      // Simulate — in production would call /api/finance/send with clinic's pool address
      await new Promise(r => setTimeout(r, 2000));
      setTopupResult({ amount: topupAmt, txSig: "5NqL...8mYw" });
      setTopupState("ok");
    } catch {
      setTopupState("err");
    }
  }

  // ── Login screen ─────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="max-w-lg mx-auto animate-in fade-in duration-300">
        <Link href="/clinics" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs font-mono mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />Назад к клиникам
        </Link>

        <div className="relative rounded-2xl border border-white/10 overflow-hidden"
          style={{ background: "linear-gradient(135deg,#080f0b 0%,#0d1a28 100%)" }}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="font-mono font-bold text-xl">B2B Личный кабинет</h1>
              <p className="text-xs font-mono text-muted-foreground">BSA.PROTOCOL · Портал для менеджеров клиник</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  type="email" placeholder="manager@clinic.kz"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-500/50 transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Пароль</label>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPw ? "text" : "password"} placeholder="••••••••"
                    onKeyDown={e => e.key === "Enter" && doLogin()}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-500/50 transition-colors pr-10" />
                  <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2.5 text-[10px] font-mono text-destructive flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />{loginError}
                </div>
              )}

              <Button onClick={doLogin} disabled={loginLoading || !email || !password}
                className="w-full font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30" variant="outline">
                {loginLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Вход...</> : <>Войти в кабинет</>}
              </Button>
            </div>

            <div className="bg-black/30 rounded-xl border border-white/5 p-3 space-y-1 text-[10px] font-mono text-muted-foreground">
              <p className="text-xs font-bold text-foreground/60 mb-2">Демо-доступ</p>
              <p>Email: <span className="text-cyan-400">manager@cardiolife.kz</span></p>
              <p>Пароль: <span className="text-cyan-400">bsa2026</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const totalPatients = clinic.cases.reduce((a, c) => a + c.patientsCount, 0);
  const avgImprovement = Math.round(clinic.cases.reduce((a, c) => a + c.avgImprovementPct, 0) / clinic.cases.length);

  return (
    <div className="max-w-lg mx-auto space-y-4 animate-in fade-in duration-300 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/clinics" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-[10px] font-mono text-muted-foreground">B2B · Менеджер</span>
          </div>
          <h1 className="font-mono font-bold text-xl">{clinic.name}</h1>
        </div>
        <button onClick={() => setLoggedIn(false)}
          className="text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors">
          Выйти
        </button>
      </div>

      {/* AI Rating card */}
      <div className="relative rounded-2xl border border-primary/20 overflow-hidden shadow-[0_0_30px_rgba(0,255,128,0.1)]"
        style={{ background: "linear-gradient(135deg,#080f0b 0%,#0a1812 100%)" }}>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">AI Рейтинг клиники</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-mono text-primary neon-text">{clinic.aiRating}</span>
                <span className="text-xl font-mono text-primary/50">/100</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                Основан на {totalPatients} кейсах выздоровления BSA
              </p>
            </div>
            <div className="text-right">
              {clinic.aiVerified && (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-300 font-bold">AI Verified</span>
                </div>
              )}
              <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${clinic.aiRating}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Пациентов BSA",    value: totalPatients,          color: "text-foreground" },
              { label: "Ср. улучшение",    value: `+${avgImprovement}%`, color: "text-primary" },
              { label: "Переходов из BSA", value: clinic.bsaLeadsCount,  color: "text-cyan-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-black/40 rounded-xl p-2.5 border border-white/5 text-center">
                <div className="text-[9px] font-mono text-muted-foreground mb-1">{label}</div>
                <div className={`font-mono font-bold text-sm ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold text-sm">Статистика переходов из BSA</span>
        </div>
        <div className="p-3 space-y-3">
          {/* Weekly chart (simulated) */}
          <div>
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground mb-1.5">
              <span>Переходы по дням (последние 7 дней)</span>
              <span className="text-primary">+18% vs пред. нед.</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {[4, 7, 5, 9, 6, 11, 8].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-t"
                    style={{ height: `${(v / 11) * 100}%`, background: i === 6 ? "#00ff80" : "#00ff8040" }} />
                  <span className="text-[8px] font-mono text-muted-foreground">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "За сегодня",   value: "8 чел.",   delta: "+2",  up: true },
              { label: "За неделю",    value: "47 чел.",  delta: "+18%", up: true },
              { label: "Конверсия",    value: "34%",      delta: "+5%",  up: true },
              { label: "Записей",      value: "16",       delta: "−1",   up: false },
            ].map(({ label, value, delta, up }) => (
              <div key={label} className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                <div className="text-[9px] font-mono text-muted-foreground">{label}</div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-sm">{value}</span>
                  <span className={`text-[9px] font-mono ${up ? "text-primary" : "text-destructive"}`}>{delta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Case outcomes */}
      <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="font-mono font-bold text-sm">Кейсы выздоровления</span>
          <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5 ml-auto">
            основа AI рейтинга
          </span>
        </div>
        <div className="p-3 space-y-2">
          {clinic.cases.map(c => (
            <div key={c.condition} className="bg-black/20 rounded-lg p-3 border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-xs font-bold">{c.condition}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">{c.patientsCount} пац.</span>
                  <span className="font-mono text-sm font-bold text-primary">+{c.avgImprovementPct}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                  <div className="absolute h-full bg-destructive/30 rounded-full" style={{ width: `${c.avgScoreBefore}%` }} />
                  <div className="absolute h-full bg-primary/70 rounded-full" style={{ width: `${c.avgScoreAfter}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                  <span>До: <span className="text-destructive">{c.avgScoreBefore}</span></span>
                  <span>После: <span className="text-primary">{c.avgScoreAfter}</span></span>
                </div>
              </div>
            </div>
          ))}
          <div className="bg-black/20 border border-white/5 rounded-lg p-2.5 text-[10px] font-mono text-muted-foreground flex items-start gap-2">
            <Shield className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
            Данные автоматически собираются из BSA системы у пациентов, которые посещали вашу клинику.
            Рейтинг пересчитывается еженедельно.
          </div>
        </div>
      </div>

      {/* SOL Ad Budget */}
      <div className="rounded-xl border border-violet-500/30 bg-black/40 overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.1)]">
        <div className="p-3 border-b border-violet-500/10 flex items-center gap-2">
          <Coins className="w-4 h-4 text-violet-400" />
          <span className="font-mono font-bold text-sm">Рекламный бюджет SOL</span>
        </div>
        <div className="p-3 space-y-3">
          {/* Balance */}
          <div className="flex items-center justify-between bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground">Текущий бюджет</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono font-bold text-2xl text-violet-300">{clinic.adBudgetSol.toFixed(2)}</span>
                <span className="font-mono text-violet-400/60">SOL</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground">≈ ${(clinic.adBudgetSol * SOL_USD).toFixed(0)} · {Math.round(clinic.adBudgetSol * SOL_USD * USD_KZT).toLocaleString()}₸</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-mono text-muted-foreground">Цена лида</p>
              <p className="font-mono font-bold text-sm text-violet-300">0.05 SOL</p>
              <p className="text-[9px] font-mono text-muted-foreground">≈ 3,525₸</p>
            </div>
          </div>

          {/* Leads left */}
          <div className="flex items-center justify-between text-[10px] font-mono bg-black/30 rounded-lg px-3 py-2 border border-white/5">
            <span className="text-muted-foreground">Осталось лидов</span>
            <span className="font-bold text-violet-300">{Math.floor(clinic.adBudgetSol / 0.05)} лидов</span>
          </div>

          {/* Top-up form */}
          {topupState === "ok" && topupResult ? (
            <div className="space-y-2">
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="font-mono font-bold text-primary">+{topupResult.amount} SOL зачислено</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">TX: {topupResult.txSig}</div>
              </div>
              <Button size="sm" variant="outline" className="w-full font-mono text-xs"
                onClick={() => { setTopupState("idle"); setTopupAmt(""); setTopupResult(null); }}>
                Пополнить ещё
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Сумма пополнения SOL</label>
                <input value={topupAmt} onChange={e => setTopupAmt(e.target.value)}
                  type="number" step="0.1" min="0.1" placeholder="1.000"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50 transition-colors" />
                {topupAmt && (
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">
                    ≈ {Math.floor(parseFloat(topupAmt || "0") / 0.05)} лидов · {Math.round(parseFloat(topupAmt || "0") * SOL_USD * USD_KZT).toLocaleString()}₸
                  </p>
                )}
              </div>
              <Button onClick={doTopup} disabled={topupState === "sending" || !topupAmt}
                className="w-full font-mono bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]" variant="outline">
                {topupState === "sending"
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Пополнение...</>
                  : <><Plus className="w-4 h-4 mr-2" />Пополнить рекламный бюджет (Solana)</>}
              </Button>
            </div>
          )}

          <div className="text-[10px] font-mono text-muted-foreground/60 text-center">
            Бюджет расходуется на приоритетное размещение в BSA marketplace
          </div>
        </div>
      </div>

      {/* Reviews section (read-only for clinic) */}
      <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-mono font-bold text-sm">Верифицированные отзывы</span>
          <span className="text-[9px] font-mono bg-black/30 border border-white/10 rounded px-2 py-0.5 ml-auto">
            {clinic.reviews.length} отзывов
          </span>
        </div>
        <div className="p-3 space-y-2">
          <div className="bg-black/20 border border-white/5 rounded-lg p-2.5 text-[10px] font-mono text-muted-foreground flex items-start gap-2">
            <Shield className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
            Только пользователи с подтверждённым визитом в Реестре BSA могут оставить отзыв.
            Это гарантирует честность — накрутка невозможна.
          </div>
          {clinic.reviews.length > 0 ? clinic.reviews.map(r => (
            <div key={r.id} className="bg-black/30 rounded-lg p-3 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold">{r.userName}</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xs">★</span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground">{r.text}</p>
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                  {r.visitDate} · Визит подтверждён
                </div>
                <div className="text-[10px] font-mono flex items-center gap-1.5">
                  <span className="text-destructive">{r.healthBefore}</span>
                  <ArrowUpRight className="w-3 h-3 text-primary" />
                  <span className="text-primary">{r.healthAfter}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-4 text-muted-foreground/50 font-mono text-xs">
              Нет верифицированных отзывов
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
