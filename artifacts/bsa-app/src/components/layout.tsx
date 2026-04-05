import { Link, useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useLang, Lang } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import {
  Activity, ShieldCheck, Database, Wallet,
  BarChart3, User, Wifi, WifiOff, Menu, X, Building2
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "kz", label: "KZ" },
  { value: "en", label: "EN" },
];

const NAV_ITEMS = [
  { href: "/",           icon: Activity,  labelKey: "nav_dashboard"  as const },
  { href: "/statistics", icon: BarChart3, labelKey: "nav_statistics" as const },
  { href: "/registry",   icon: Database,  labelKey: "nav_registry"   as const },
  { href: "/clinics",    icon: Building2, labelKey: "nav_clinics"    as const },
  { href: "/profile",    icon: User,      labelKey: "nav_profile"    as const },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { address, connect, disconnect } = useWallet();
  const { lang, setLang, t } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="p-6 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setSidebarOpen(false)}>
          <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/20 flex items-center justify-center
            group-hover:bg-primary/15 group-hover:border-primary/35 transition-all duration-300
            shadow-[0_0_12px_rgba(0,200,80,0.1)]">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-base text-foreground leading-none">
              BSA<span className="text-primary/50">.</span>PROTOCOL
            </div>
            <div className="text-[9px] font-mono text-muted-foreground/50 mt-0.5 tracking-widest uppercase">v2.1 · Devnet</div>
          </div>
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }, i) => {
          const active = location === href;
          return (
            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
              data-testid={`nav-${labelKey}`}
              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 overflow-hidden ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/3"
              }`}
            >
              {/* Active background */}
              {active && (
                <motion.div
                  layoutId="nav-active-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: "rgba(0,200,80,0.06)", border: "1px solid rgba(0,200,80,0.15)" }}
                  transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
                />
              )}

              <Icon className={`w-4 h-4 relative z-10 flex-shrink-0 ${active ? "text-primary" : ""}`} />
              <span className="relative z-10 font-medium tracking-tight">{t[labelKey]}</span>
              {active && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary relative z-10"
                  style={{ boxShadow: "0 0 6px rgba(0,200,80,0.6)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom ── */}
      <div className="p-4 space-y-3 border-t border-white/5">
        {/* Language */}
        <div className="flex items-center gap-1 bg-black/30 rounded-xl border border-white/5 p-1">
          {LANG_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setLang(opt.value)}
              data-testid={`lang-${opt.value}`}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-200 ${
                lang === opt.value
                  ? "bg-primary text-black shadow-[0_0_8px_rgba(0,200,80,0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Wallet */}
        {address ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-black/30 rounded-xl border border-primary/12">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0"
                style={{ boxShadow: "0 0 6px rgba(0,200,80,0.5)" }} />
              <span className="text-[10px] font-mono text-muted-foreground/70 truncate tracking-widest">
                {address.slice(0, 6)}...{address.slice(-6)}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={disconnect}
              className="w-full font-mono text-xs rounded-xl border-white/8 hover:bg-destructive/8 hover:text-destructive hover:border-destructive/20"
              data-testid="button-disconnect">
              <WifiOff className="w-3 h-3 mr-2" />
              {t.disconnect}
            </Button>
          </div>
        ) : (
          <Button onClick={connect}
            className="w-full font-mono text-sm rounded-xl bg-primary/10 text-primary border border-primary/20
              hover:bg-primary hover:text-black transition-all duration-300 glow-btn"
            data-testid="button-connect">
            <Wallet className="w-4 h-4 mr-2" />
            {t.connect_wallet}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex relative"
      style={{ background: "#030303" }}>

      {/* Ambient glow top-left */}
      <div className="fixed top-0 left-0 w-[600px] h-[400px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(0,200,80,0.04) 0%, transparent 70%)" }} />
      {/* Ambient glow bottom-right */}
      <div className="fixed bottom-0 right-0 w-[500px] h-[400px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at 100% 100%, rgba(0,100,200,0.03) 0%, transparent 70%)" }} />

      {/* Grid overlay */}
      <div className="fixed inset-0 grid-bg opacity-100 pointer-events-none z-0" />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 z-50 transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
        style={{
          background: "rgba(4,6,4,0.85)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14"
          style={{
            background: "rgba(3,3,3,0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold tracking-tight text-sm">
            BSA<span className="text-primary/50">.</span>PROTOCOL
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-mono text-primary/60 uppercase tracking-widest">Devnet</span>
          </div>
        </header>

        <main className="flex-1 py-8 px-4 md:px-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
