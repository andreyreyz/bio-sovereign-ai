import { useState } from "react";
import { useLang } from "@/hooks/use-language";
import { useWallet } from "@/hooks/use-wallet";
import { useDevice, DeviceBrand } from "@/hooks/use-device";
import { useGetRewardsStats, useGetRewardsHistory } from "@workspace/api-client-react";
import {
  User, Shield, Wallet, RefreshCw, Loader2, CheckCircle2,
  Zap, Battery, Clock, Bluetooth, BluetoothOff
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

function calcDiscount(avgScore: number, totalRewards: number): number {
  if (totalRewards === 0) return 0;
  const base = Math.max(0, (avgScore - 50) / 50);
  return Math.round(Math.min(30, base * 30));
}

export default function Profile() {
  const { t, lang } = useLang();
  const { address, connect } = useWallet();
  const { device, connecting, connect: connectDevice, disconnect: disconnectDevice, syncNow, syncing } = useDevice();
  const [pulsomaSync, setPulsomaSync] = useState<"idle" | "syncing" | "done">("idle");
  const locale = LOCALE_MAP[lang];

  const { data: stats } = useGetRewardsStats();
  const { data: history } = useGetRewardsHistory();

  const avgScore = stats?.averageHealthScore || 0;
  const totalRewards = stats?.totalRewards || 0;
  const totalSol = stats?.totalSolPaid || 0;
  const discount = calcDiscount(avgScore, totalRewards);

  const handlePulsoma = () => {
    setPulsomaSync("syncing");
    setTimeout(() => setPulsomaSync("done"), 2500);
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* === INSURANCE POLICY === */}
        <div className="glass-panel p-6 rounded-xl border border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <h3 className="font-mono font-bold flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-primary" />
            {t.insurance_title}
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <span className="text-sm font-mono text-muted-foreground">{t.insurance_status}</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-fast" />
                <span className="text-sm font-mono text-primary font-bold">{t.insurance_active}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <span className="text-sm font-mono text-muted-foreground">{t.insurance_discount}</span>
              <div className="text-right">
                <div className="text-3xl font-bold font-mono text-primary">{discount}%</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {t.insurance_based_on} {totalRewards} {t.insurance_verdicts}
                </div>
              </div>
            </div>

            {/* Score gauge */}
            <div>
              <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
                <span>{t.avg_score_label}</span>
                <span className="text-primary font-bold">{Math.round(avgScore)}/100</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${avgScore}%`, boxShadow: "0 0 8px rgba(0,255,128,0.6)" }}
                />
              </div>
            </div>

            {/* Discount tiers */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { label: "Бронза", range: "1–10%", min: 0, active: discount >= 1 && discount < 11 },
                { label: "Серебро", range: "11–20%", min: 11, active: discount >= 11 && discount < 21 },
                { label: "Золото", range: "21–30%", min: 21, active: discount >= 21 },
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
        </div>

        {/* === WALLET === */}
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

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t.wallet_balance, value: "—", unit: "SOL", note: "Devnet" },
                  { label: t.wallet_earned, value: totalSol.toFixed(2), unit: "SOL", note: "BSA rewards" },
                  { label: t.wallet_txs, value: totalRewards, unit: "tx", note: "total" },
                ].map(({ label, value, unit, note }) => (
                  <div key={label} className="bg-black/30 rounded-lg p-3 border border-white/5 text-center">
                    <div className="text-xs font-mono text-muted-foreground mb-1">{label}</div>
                    <div className="text-lg font-bold font-mono text-foreground">{value}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{unit} · {note}</div>
                  </div>
                ))}
              </div>

              {history && history.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Последние начисления</div>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {history.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-xs font-mono bg-black/20 rounded p-2 border border-white/5">
                        <span className="text-muted-foreground">
                          {format(new Date(r.createdAt), "d MMM, HH:mm", { locale })}
                        </span>
                        <span className="text-primary font-bold">+{r.amount} SOL</span>
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
                <Wallet className="w-4 h-4 mr-2" />
                {t.connect_wallet}
              </Button>
            </div>
          )}
        </div>

        {/* === PULSOMA === */}
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

        {/* === DEVICES === */}
        <div className="glass-panel p-6 rounded-xl border border-border">
          <h3 className="font-mono font-bold flex items-center gap-2 mb-5">
            <Bluetooth className="w-5 h-5 text-cyan-400" />
            {t.device_title}
          </h3>

          {device ? (
            <div className="mb-5 p-4 bg-primary/5 rounded-xl border border-primary/30 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{device.icon}</div>
                  <div>
                    <div className="font-mono font-bold text-sm text-primary">{device.name} {device.model}</div>
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3 h-3" />{device.battery}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{format(device.lastSync, "HH:mm")}
                      </span>
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
          ) : (
            <p className="text-xs font-mono text-muted-foreground mb-4 text-center py-2 border border-dashed border-border/50 rounded-lg">
              {t.device_none_sub}
            </p>
          )}

          <div className="grid grid-cols-1 gap-2">
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
