import { Link, useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useLang, Lang } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, Database, Wallet } from "lucide-react";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "kz", label: "KZ" },
  { value: "en", label: "EN" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { address, connect, disconnect } = useWallet();
  const { lang, setLang, t } = useLang();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-fixed bg-no-repeat relative">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-[2px] z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background/0 to-background/0 z-0 pointer-events-none"></div>
      
      <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <span className="font-mono font-bold tracking-tight text-lg text-foreground">
                BSA<span className="text-primary/70">.</span>PROTOCOL
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 ml-6">
              <Link 
                href="/" 
                className={`px-4 py-2 rounded-md text-sm font-mono transition-colors ${
                  location === "/" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
                data-testid="nav-dashboard"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  {t.nav_dashboard}
                </div>
              </Link>
              <Link 
                href="/registry" 
                className={`px-4 py-2 rounded-md text-sm font-mono transition-colors ${
                  location === "/registry" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
                data-testid="nav-registry"
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  {t.nav_registry}
                </div>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-secondary/50 rounded-md border border-border p-1">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  data-testid={`lang-${opt.value}`}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                    lang === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {address ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md border border-border">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-fast"></div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {address.slice(0, 4)}...{address.slice(-4)}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={disconnect}
                  className="font-mono text-xs border-primary/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  data-testid="button-disconnect"
                >
                  {t.disconnect}
                </Button>
              </div>
            ) : (
              <Button 
                onClick={connect} 
                className="font-mono text-sm bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-primary-foreground shadow-[0_0_15px_rgba(0,255,128,0.3)] transition-all duration-300"
                data-testid="button-connect"
              >
                <Wallet className="w-4 h-4 mr-2" />
                {t.connect_wallet}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 py-8">
        {children}
      </main>
    </div>
  );
}
