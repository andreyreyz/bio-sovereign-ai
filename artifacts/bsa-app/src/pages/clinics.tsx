import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Star, MapPin, Clock, Phone, ChevronDown, ChevronRight, ChevronUp,
  Shield, Zap, Filter, X, ExternalLink, TrendingUp, Users,
  CheckCircle2, AlertTriangle, Camera, Building2, Search,
  SlidersHorizontal, Map as MapIcon, List, Brain, Coins, Tag, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLINICS, MAIN_SPECS, type Clinic, type ClinicReview } from "@/data/clinics";

// ── Health profile (simulate user's weak area) ──────────────────────────────
const USER_HEALTH = { cardio: 48, neuro: 72, endo: 65, pulmo: 81, gastro: 77, ortho: 68 };

function getSpecScore(spec: string): number {
  const map: Record<string, number> = {
    "Кардиология": USER_HEALTH.cardio, "Аритмология": USER_HEALTH.cardio,
    "Неврология": USER_HEALTH.neuro, "Нейрохирургия": USER_HEALTH.neuro,
    "Эндокринология": USER_HEALTH.endo, "Диабетология": USER_HEALTH.endo,
    "Пульмонология": USER_HEALTH.pulmo, "Аллергология": USER_HEALTH.pulmo,
    "Гастроэнтерология": USER_HEALTH.gastro, "Гепатология": USER_HEALTH.gastro,
    "Ортопедия": USER_HEALTH.ortho, "Спортивная медицина": USER_HEALTH.ortho,
  };
  return map[spec] ?? 70;
}

const WEAKEST_SPEC = Object.entries({
  Кардиология: USER_HEALTH.cardio, Неврология: USER_HEALTH.neuro,
  Эндокринология: USER_HEALTH.endo, Пульмонология: USER_HEALTH.pulmo,
  Гастроэнтерология: USER_HEALTH.gastro, Ортопедия: USER_HEALTH.ortho,
}).sort((a, b) => a[1] - b[1])[0][0];

function aiRecommended(c: Clinic): boolean {
  return c.specialization.includes(WEAKEST_SPEC);
}

// ── Rating bar ───────────────────────────────────────────────────────────────
function RatingBar({ value, color = "#00ff80" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

// ── AI Rating badge ───────────────────────────────────────────────────────────
function AiRating({ value, small = false }: { value: number; small?: boolean }) {
  const color = value >= 90 ? "#00ff80" : value >= 80 ? "#22d3ee" : value >= 70 ? "#facc15" : "#f87171";
  return (
    <div className={`flex items-center gap-1 font-mono font-bold rounded-lg px-2 py-1 border ${small ? "text-[10px]" : "text-xs"}`}
      style={{ borderColor: color + "40", background: color + "10", color }}>
      <Brain className={small ? "w-2.5 h-2.5" : "w-3 h-3"} />
      AI {value}
    </div>
  );
}

// ── Clinic card ───────────────────────────────────────────────────────────────
function ClinicCard({ clinic, recommended, onClick, compact = false }: {
  clinic: Clinic; recommended?: boolean; onClick: () => void; compact?: boolean;
}) {
  const premium = clinic.premium;
  const userSpecScore = getSpecScore(clinic.mainSpec);
  const lowScore = userSpecScore < 60;

  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl border overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] ${
      clinic.flagship ? "border-amber-500/60 shadow-[0_0_25px_rgba(251,191,36,0.2)]"
      : recommended ? "border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
      : premium ? "border-primary/30 shadow-[0_0_15px_rgba(0,255,128,0.08)]"
      : "border-white/10"
    } bg-black/40 backdrop-blur-sm`}>
      {/* Top stripe */}
      {(clinic.flagship || premium || recommended) && (
        <div className={`h-0.5 ${
          clinic.flagship ? "bg-gradient-to-r from-transparent via-amber-400 to-transparent"
          : recommended ? "bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-500"
          : "bg-gradient-to-r from-primary via-primary/50 to-primary"}`} />
      )}

      <div className={`p-3.5 ${compact ? "space-y-2" : "space-y-3"}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              {clinic.flagship && (
                <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 rounded px-1.5 py-0.5 flex-shrink-0 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />ФЛАГМАН BSA
                </span>
              )}
              {recommended && (
                <span className="text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded px-1.5 py-0.5 flex-shrink-0">
                  🧠 AI РЕКОМЕНДУЕТ
                </span>
              )}
              {premium && !clinic.flagship && !recommended && (
                <span className="text-[9px] font-mono font-bold bg-primary/10 text-primary border border-primary/30 rounded px-1.5 py-0.5 flex-shrink-0">
                  ⭐ PREMIUM
                </span>
              )}
              {clinic.aiVerified && (
                <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5 flex items-center gap-0.5 flex-shrink-0">
                  <Shield className="w-2.5 h-2.5" />AI Verified
                </span>
              )}
              {clinic.medDiscount && (
                <span className="text-[9px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded px-1.5 py-0.5 flex items-center gap-0.5 flex-shrink-0">
                  <Tag className="w-2.5 h-2.5" />−{clinic.medDiscount}% SOL
                </span>
              )}
            </div>
            <div className={`font-mono font-bold leading-tight ${clinic.flagship ? "text-amber-100" : recommended ? "text-cyan-100" : "text-foreground"} ${compact ? "text-sm" : "text-base"}`}>
              {clinic.name}
            </div>
            {clinic.city && clinic.city !== "Алматы" && (
              <div className="text-[9px] font-mono text-muted-foreground flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-2.5 h-2.5" />{clinic.city}
              </div>
            )}
          </div>
          <AiRating value={clinic.aiRating} small={compact} />
        </div>

        {/* Specializations */}
        <div className="flex flex-wrap gap-1">
          {clinic.specialization.slice(0, compact ? 2 : 3).map(s => (
            <span key={s} className="text-[9px] font-mono bg-white/5 border border-white/10 text-muted-foreground rounded px-1.5 py-0.5">
              {s}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
          <div className="bg-black/30 rounded-lg p-2 border border-white/5 text-center">
            <div className="text-muted-foreground mb-0.5">Расстояние</div>
            <div className="font-bold text-foreground">{clinic.distance} км</div>
          </div>
          <div className="bg-black/30 rounded-lg p-2 border border-white/5 text-center">
            <div className="text-muted-foreground mb-0.5">Приём</div>
            <div className="font-bold text-foreground">{(clinic.visitCost / 1000).toFixed(0)}К₸</div>
          </div>
          <div className="bg-black/30 rounded-lg p-2 border border-white/5 text-center">
            <div className="text-muted-foreground mb-0.5">Кейсов</div>
            <div className="font-bold text-primary">
              {clinic.cases.reduce((a, c) => a + c.patientsCount, 0)}
            </div>
          </div>
        </div>

        {/* Low score warning */}
        {lowScore && !compact && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 flex items-center gap-2 text-[10px] font-mono text-orange-300">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            Ваш {clinic.mainSpec.toLowerCase()} score: {userSpecScore}/100 — рекомендуем обратиться
          </div>
        )}
      </div>
    </button>
  );
}

// ── Verified reviews ──────────────────────────────────────────────────────────
function ReviewsList({ clinic }: { clinic: Clinic }) {
  const hasReviews = clinic.reviews.length > 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Честные отзывы BSA
        </p>
        <span className="text-[9px] font-mono text-muted-foreground bg-black/30 px-2 py-1 rounded border border-white/5">
          только верифицированные визиты
        </span>
      </div>

      <div className="bg-black/20 border border-white/5 rounded-xl p-2.5 text-[10px] font-mono text-muted-foreground flex items-start gap-2">
        <Shield className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
        <span>
          Отзыв могут оставить только пользователи, у которых в{" "}
          <span className="text-primary">Реестре транзакций</span> есть подтверждённый визит.
          Накрутка исключена.
        </span>
      </div>

      {hasReviews ? clinic.reviews.map((r: ClinicReview) => (
        <div key={r.id} className="bg-black/30 rounded-xl border border-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-mono font-bold text-primary">
                {r.userName[0]}
              </div>
              <div>
                <div className="font-mono text-xs font-bold">{r.userName}</div>
                <div className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                  Визит подтверждён · {r.visitDate}
                </div>
              </div>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
              ))}
            </div>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground">{r.text}</p>
          {/* Health improvement */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/20 rounded-lg p-2 text-center border border-white/5">
              <div className="text-[9px] font-mono text-muted-foreground">До лечения</div>
              <div className="font-mono font-bold text-sm text-destructive">{r.healthBefore}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-2 text-center border border-white/5">
              <div className="text-[9px] font-mono text-muted-foreground">После</div>
              <div className="font-mono font-bold text-sm text-primary">{r.healthAfter}</div>
            </div>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
            <span className="opacity-50">TX:</span>
            <span className="text-cyan-400/70">{r.txHash}</span>
          </div>
        </div>
      )) : (
        <div className="text-center py-6 text-muted-foreground/50 font-mono text-xs">
          Ещё нет верифицированных отзывов
        </div>
      )}
    </div>
  );
}

// ── Cases (outcome-based rating) ──────────────────────────────────────────────
function CasesStats({ clinic }: { clinic: Clinic }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        Рейтинг по кейсам BSA
      </p>
      <div className="bg-black/20 border border-white/5 rounded-xl p-2.5 text-[10px] font-mono text-muted-foreground flex items-start gap-2">
        <Brain className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
        AI рейтинг строится не на отзывах, а на данных реального улучшения Health Score пациентов в системе BSA.
      </div>
      {clinic.cases.map(c => (
        <div key={c.condition} className="bg-black/30 rounded-xl border border-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold">{c.condition}</span>
            <span className="font-mono text-xs text-primary font-bold">+{c.avgImprovementPct}%</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center">
            <div>
              <div className="text-muted-foreground">Пациентов</div>
              <div className="font-bold">{c.patientsCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Score до</div>
              <div className="font-bold text-destructive">{c.avgScoreBefore}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Score после</div>
              <div className="font-bold text-primary">{c.avgScoreAfter}</div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
              <span>До: {c.avgScoreBefore}</span><span>После: {c.avgScoreAfter}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
              <div className="absolute h-full bg-destructive/40 rounded-full" style={{ width: `${c.avgScoreBefore}%` }} />
              <div className="absolute h-full bg-primary/80 rounded-full transition-all duration-700" style={{ width: `${c.avgScoreAfter}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Clinic detail modal ───────────────────────────────────────────────────────
function ClinicModal({ clinic, onClose }: { clinic: Clinic; onClose: () => void }) {
  const [tab, setTab] = useState<"info" | "cases" | "reviews" | "hours">("info");
  const [photoIdx, setPhotoIdx] = useState(0);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-[#080f0b] border border-primary/20 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
        onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Photo */}
        {clinic.photos.length > 0 && (
          <div className="relative h-48 overflow-hidden">
            <img src={clinic.photos[photoIdx]} alt={clinic.name}
              className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080f0b] via-transparent to-transparent" />
            {clinic.photos.length > 1 && (
              <div className="absolute bottom-2 right-2 flex gap-1">
                {clinic.photos.map((_, i) => (
                  <button key={i} onClick={() => setPhotoIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full ${i === photoIdx ? "bg-primary" : "bg-white/30"}`} />
                ))}
              </div>
            )}
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80">
              <X className="w-4 h-4" />
            </button>
            {clinic.premium && (
              <div className="absolute top-3 left-3 text-[9px] font-mono font-bold bg-primary/20 text-primary border border-primary/40 rounded px-2 py-1">
                ⭐ PREMIUM PARTNER
              </div>
            )}
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Title + rating */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-mono font-bold text-xl">{clinic.name}</h2>
              <p className="text-xs font-mono text-muted-foreground">{clinic.address}</p>
            </div>
            <AiRating value={clinic.aiRating} />
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {clinic.aiVerified && (
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg px-2 py-1 flex items-center gap-1">
                <Shield className="w-3 h-3" />AI Verified
              </span>
            )}
            {aiRecommended(clinic) && (
              <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-lg px-2 py-1 flex items-center gap-1">
                <Brain className="w-3 h-3" />AI Рекомендует
              </span>
            )}
            <span className="text-[10px] font-mono bg-black/30 text-muted-foreground border border-white/10 rounded-lg px-2 py-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{clinic.distance} км
            </span>
            <span className="text-[10px] font-mono bg-black/30 text-muted-foreground border border-white/10 rounded-lg px-2 py-1">
              от {clinic.visitCost.toLocaleString()}₸
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 bg-black/40 border border-white/10 rounded-lg p-0.5">
            {([
              { id: "info",    label: "Инфо" },
              { id: "cases",   label: "Кейсы" },
              { id: "reviews", label: `Отзывы (${clinic.reviews.length})` },
              { id: "hours",   label: "График" },
            ] as const).map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 py-1.5 rounded text-[10px] font-mono font-bold transition-all ${
                  tab === id ? "bg-primary text-black" : "text-muted-foreground"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "info" && (
            <div className="space-y-3">
              <p className="text-xs font-mono text-muted-foreground leading-relaxed">{clinic.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {clinic.specialization.map(s => (
                  <span key={s} className="text-[10px] font-mono bg-white/5 border border-white/10 text-foreground rounded px-2 py-0.5">{s}</span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {clinic.cases.map(c => (
                  <div key={c.condition} className="bg-black/30 rounded-lg p-2.5 border border-white/5 text-center">
                    <div className="text-[9px] font-mono text-muted-foreground truncate mb-1">{c.condition.split(" ")[0]}</div>
                    <div className="font-mono font-bold text-sm text-primary">+{c.avgImprovementPct}%</div>
                    <div className="text-[9px] font-mono text-muted-foreground">{c.patientsCount} пац.</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />{clinic.phone}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ExternalLink className="w-3.5 h-3.5" />{clinic.website}
                </div>
              </div>
              <Button className="w-full font-mono bg-primary text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,128,0.3)]">
                Записаться на приём
              </Button>
            </div>
          )}
          {tab === "cases" && <CasesStats clinic={clinic} />}
          {tab === "reviews" && <ReviewsList clinic={clinic} />}
          {tab === "hours" && (
            <div className="space-y-2">
              {Object.entries(clinic.workingHours).map(([day, hours]) => (
                <div key={day} className="flex items-center justify-between py-2 border-b border-white/5 text-sm font-mono">
                  <span className="text-muted-foreground">{day}</span>
                  <span className={hours === "Выходной" ? "text-destructive" : "text-foreground"}>{hours}</span>
                </div>
              ))}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-[10px] font-mono text-primary/80 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Онлайн запись через BSA приложение
              </div>
            </div>
          )}

          {/* B2B link */}
          <div className="pt-1 border-t border-white/5">
            <Link href="/clinic-b2b" className="text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 justify-center transition-colors">
              <Building2 className="w-3 h-3" />Вход для менеджеров клиники
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Map component ─────────────────────────────────────────────────────────────
function ClinicsMap({ clinics, onSelect }: { clinics: Clinic[]; onSelect: (c: Clinic) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [43.255, 76.92],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "",
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    clinics.forEach(clinic => {
      const rec = aiRecommended(clinic);
      const color = rec ? "#22d3ee" : clinic.premium ? "#00ff80" : clinic.aiVerified ? "#34d399" : "#94a3b8";
      const size = rec || clinic.premium ? 36 : 30;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${size}px;height:${size}px;
          border-radius:50%;
          background:${color}18;
          border:2px solid ${color};
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 12px ${color}60;
          font-size:14px;cursor:pointer;
          transition:transform 0.15s;
        ">🏥</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([clinic.lat, clinic.lng], { icon })
        .addTo(map)
        .on("click", () => onSelect(clinic));

      const popupColor = rec ? "#22d3ee" : color;
      marker.bindPopup(`
        <div style="font-family:monospace;min-width:180px;background:#0a1a12;border:1px solid ${popupColor}30;border-radius:10px;padding:10px;color:#e2e8f0">
          <div style="font-size:12px;font-weight:bold;color:${popupColor};margin-bottom:4px">${clinic.name}</div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:6px">${clinic.mainSpec}</div>
          <div style="display:flex;gap:6px;font-size:10px">
            <span style="background:${popupColor}15;color:${popupColor};border:1px solid ${popupColor}30;border-radius:4px;padding:2px 6px">AI ${clinic.aiRating}</span>
            <span style="color:#94a3b8">${clinic.visitCost.toLocaleString()}₸</span>
          </div>
        </div>
      `, { className: "bsa-popup" });

      markersRef.current.push(marker);
    });
  }, [clinics, onSelect]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ height: 340 }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 p-2 space-y-1 z-[400]">
        {[
          { color: "#22d3ee", label: "AI Рекомендует" },
          { color: "#00ff80", label: "Premium" },
          { color: "#34d399", label: "AI Verified" },
          { color: "#94a3b8", label: "Стандарт" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Clinics() {
  const [selected, setSelected] = useState<Clinic | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [filterSpec, setFilterSpec] = useState<string>("Все");
  const [filterVerified, setFilterVerified] = useState(false);
  const [sortBy, setSortBy] = useState<"ai" | "distance" | "cost">("ai");
  const [showFilters, setShowFilters] = useState(false);

  // AI recommendation section
  const aiRecs = CLINICS.filter(c => aiRecommended(c)).slice(0, 3);

  // Filter + sort
  const filtered = CLINICS
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.specialization.some(s => s.toLowerCase().includes(q));
      const matchSpec = filterSpec === "Все" || c.mainSpec === filterSpec;
      const matchVerified = !filterVerified || c.aiVerified;
      return matchSearch && matchSpec && matchVerified;
    })
    .sort((a, b) => {
      if (sortBy === "ai") return b.aiRating - a.aiRating;
      if (sortBy === "distance") return a.distance - b.distance;
      return a.visitCost - b.visitCost;
    });

  // Low health warning
  const weakScore = USER_HEALTH[Object.keys(USER_HEALTH).find(k =>
    k === WEAKEST_SPEC.toLowerCase().slice(0, 5)) as keyof typeof USER_HEALTH] ?? 48;

  return (
    <div className="max-w-lg mx-auto space-y-4 animate-in fade-in duration-300 pb-8">

      {/* Header */}
      <div>
        <h1 className="font-mono font-bold text-2xl flex items-center gap-2">
          <Building2 className="w-6 h-6 text-cyan-400" />
          Клиники-партнёры
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          AI рейтинг основан на реальных данных выздоровления в BSA
        </p>
      </div>

      {/* AI ALERT — user's low score */}
      <div className="relative rounded-xl border border-cyan-500/40 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.1)]"
        style={{ background: "linear-gradient(135deg,#050d0a 0%,#0a1822 100%)" }}>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="font-mono font-bold text-sm text-cyan-300 flex items-center gap-2">
                ИИ-Рекомендация
                <span className="text-[9px] bg-cyan-500/20 border border-cyan-500/30 rounded px-1.5 py-0.5">ПЕРСОНАЛЬНАЯ</span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-1">
                Ваш {WEAKEST_SPEC.toLowerCase()} индекс:{" "}
                <span className="text-destructive font-bold">{USER_HEALTH.cardio}/100</span> — ниже нормы.
                AI выбрал топ-3 {WEAKEST_SPEC.toLowerCase()}ических клиники с лучшими результатами лечения.
              </p>
            </div>
          </div>
          {/* AI rec cards */}
          <div className="space-y-2">
            {aiRecs.map((c, i) => (
              <button key={c.id} onClick={() => setSelected(c)}
                className="w-full flex items-center gap-3 bg-black/30 rounded-xl border border-cyan-500/20 p-2.5 text-left hover:border-cyan-500/50 transition-all active:scale-[0.98]">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-cyan-400 text-sm flex-shrink-0">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-bold text-cyan-100 truncate">{c.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{c.distance} км · {c.visitCost.toLocaleString()}₸</div>
                </div>
                <AiRating value={c.aiRating} small />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View toggle + Search */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск клиник..."
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors" />
          </div>
          <button onClick={() => setShowFilters(p => !p)}
            className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all ${showFilters ? "bg-primary/20 border-primary/50 text-primary" : "bg-black/40 border-white/10 text-muted-foreground hover:text-foreground"}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Фильтр
          </button>
          <div className="flex border border-white/10 rounded-lg overflow-hidden">
            <button onClick={() => setView("list")}
              className={`px-3 py-2 text-xs font-mono ${view === "list" ? "bg-primary/20 text-primary" : "bg-black/40 text-muted-foreground"}`}>
              <List className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView("map")}
              className={`px-3 py-2 text-xs font-mono ${view === "map" ? "bg-primary/20 text-primary" : "bg-black/40 text-muted-foreground"}`}>
              <MapIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground mb-1.5 uppercase">Специализация</p>
              <div className="flex flex-wrap gap-1.5">
                {["Все", ...MAIN_SPECS].map(s => (
                  <button key={s} onClick={() => setFilterSpec(s)}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                      filterSpec === s ? "bg-primary/20 border-primary/50 text-primary" : "bg-black/30 border-white/10 text-muted-foreground"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">Только AI Verified</span>
              <button onClick={() => setFilterVerified(p => !p)}
                className={`w-10 h-5 rounded-full border transition-all relative ${filterVerified ? "bg-primary border-primary" : "bg-black/40 border-white/20"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${filterVerified ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
            <div>
              <p className="text-[10px] font-mono text-muted-foreground mb-1.5 uppercase">Сортировка</p>
              <div className="flex gap-1.5">
                {([
                  { k: "ai", label: "AI Рейтинг" },
                  { k: "distance", label: "Расстояние" },
                  { k: "cost", label: "Стоимость" },
                ] as const).map(({ k, label }) => (
                  <button key={k} onClick={() => setSortBy(k)}
                    className={`flex-1 py-1.5 text-[10px] font-mono rounded-lg border transition-all ${
                      sortBy === k ? "bg-primary/20 border-primary/50 text-primary" : "bg-black/30 border-white/10 text-muted-foreground"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAP view */}
      {view === "map" && (
        <div className="space-y-3">
          <ClinicsMap clinics={filtered} onSelect={setSelected} />
          <p className="text-[10px] font-mono text-muted-foreground text-center">Нажмите на маркер → откроется карточка клиники</p>
          {/* Mini list below map */}
          <div className="space-y-2">
            {filtered.map(c => (
              <ClinicCard key={c.id} clinic={c} recommended={aiRecommended(c)} onClick={() => setSelected(c)} compact />
            ))}
          </div>
        </div>
      )}

      {/* LIST view */}
      {view === "list" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground">{filtered.length} клиник найдено</span>
            {(filterSpec !== "Все" || filterVerified || search) && (
              <button onClick={() => { setFilterSpec("Все"); setFilterVerified(false); setSearch(""); }}
                className="text-[10px] font-mono text-destructive/70 hover:text-destructive flex items-center gap-1">
                <X className="w-3 h-3" />Сбросить фильтры
              </button>
            )}
          </div>
          {filtered.map(c => (
            <ClinicCard key={c.id} clinic={c} recommended={aiRecommended(c)} onClick={() => setSelected(c)} />
          ))}
        </div>
      )}

      {/* B2B CTA */}
      <Link href="/clinic-b2b"
        className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-black/30 hover:border-white/20 transition-colors group">
        <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors" />
        </div>
        <div className="flex-1">
          <div className="font-mono text-sm font-bold text-foreground">Вы управляете клиникой?</div>
          <div className="text-[10px] font-mono text-muted-foreground">Личный кабинет B2B · Статистика · Пополнить SOL бюджет</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </Link>

      {/* Modal */}
      {selected && <ClinicModal clinic={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
