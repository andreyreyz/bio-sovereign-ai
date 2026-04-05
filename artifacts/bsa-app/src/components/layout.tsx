import { Link, useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useLang, Lang } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import {
  Activity, ShieldCheck, Database, Wallet,
  BarChart3, User, Wifi, WifiOff, Menu, X
} from "lucide-react";
import { useState } from "react";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "kz", label: "KZ" },
  { value: "en", label: "EN" },
];

const NAV_ITEMS = [
  { href: "/",            icon: Activity,  labelKey: "nav_dashboard" as const },
  { href: "/statistics",  icon: BarChart3, labelKey: "nav_statistics" as const },
  { href: "/registry",    icon: Database,  labelKey: "nav_registry" as const },
  { href: "/profile",     icon: User,      labelKey: "nav_profile" as const },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { address, connect, disconnect } = useWallet();
  const { lang, setLang, t } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-primary/20">
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setSidebarOpen(false)}>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-mono font-bold tracking-tight text-base text-foreground leading-none">
              BSA<span className="text-primary/70">.</span>PROTOCOL
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">v2.1 · DEVNET</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-mono transition-all duration-150 ${
                active
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(0,255,128,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
              data-testid={`nav-${labelKey}`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
              {t[labelKey]}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-fast" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 space-y-3 border-t border-primary/20">
        {/* Language switcher */}
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg border border-border p-1">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLang(opt.value)}
              data-testid={`lang-${opt.value}`}
              className={`flex-1 py-1 rounded text-xs font-mono font-bold transition-colors ${
                lang === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Wallet */}
        {address ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-fast shrink-0"></div>
              <span className="text-xs font-mono text-muted-foreground truncate">
                {address.slice(0, 6)}...{address.slice(-6)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
              className="w-full font-mono text-xs border-primary/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              data-testid="button-disconnect"
            >
              <WifiOff className="w-3 h-3 mr-2" />
              {t.disconnect}
            </Button>
          </div>
        ) : (
          <Button
            onClick={connect}
            className="w-full font-mono text-sm bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-primary-foreground shadow-[0_0_15px_rgba(0,255,128,0.3)] transition-all duration-300"
            data-testid="button-connect"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {t.connect_wallet}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-fixed bg-no-repeat relative">
      <div className="absolute inset-0 bg-background/92 backdrop-blur-[2px] z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/8 via-background/0 to-background/0 z-0 pointer-events-none"></div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 border-r border-primary/20 bg-background/80 backdrop-blur-xl z-50 transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-primary/20 bg-background/80 backdrop-blur-xl">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-mono font-bold text-sm">BSA<span className="text-primary/70">.</span>PROTOCOL</span>
        </header>

        <main className="flex-1 py-8 px-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
