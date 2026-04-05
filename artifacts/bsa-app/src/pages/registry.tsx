import { useGetRewardsHistory, getGetRewardsHistoryQueryKey, useGetRewardsStats, getGetRewardsStatsQueryKey } from "@workspace/api-client-react";
import { useLang } from "@/hooks/use-language";
import { Database, Coins, Users, Activity, ExternalLink, Bot, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ru, kk, enUS } from "date-fns/locale";

const LOCALE_MAP = { ru, kz: kk, en: enUS };

export default function Registry() {
  const { t, lang } = useLang();
  const locale = LOCALE_MAP[lang];

  const { data: history, isLoading: isHistoryLoading } = useGetRewardsHistory({
    query: { queryKey: getGetRewardsHistoryQueryKey() }
  });
  
  const { data: stats, isLoading: isStatsLoading } = useGetRewardsStats({
    query: { queryKey: getGetRewardsStatsQueryKey() }
  });

  return (
    <div className="container mx-auto px-4 max-w-6xl animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono tracking-tighter text-foreground neon-text mb-2 flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          {t.registry_title}
        </h1>
        <p className="text-muted-foreground font-mono text-sm max-w-2xl">
          {t.registry_subtitle}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase">{t.total_paid}</p>
            <p className="text-xl font-bold font-mono" data-testid="stat-total-paid">
              {isStatsLoading ? "--" : stats?.totalSolPaid.toFixed(2)} SOL
            </p>
          </div>
        </div>
        
        <div className="glass-panel p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <CheckCircle2 className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase">{t.rewards_issued}</p>
            <p className="text-xl font-bold font-mono" data-testid="stat-rewards">
              {isStatsLoading ? "--" : stats?.totalRewards}
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase">{t.citizens}</p>
            <p className="text-xl font-bold font-mono" data-testid="stat-wallets">
              {isStatsLoading ? "--" : stats?.uniqueWallets}
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <Activity className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase">{t.avg_score}</p>
            <p className="text-xl font-bold font-mono" data-testid="stat-score">
              {isStatsLoading ? "--" : Math.round(stats?.averageHealthScore || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel rounded-xl overflow-hidden border border-primary/20">
        <div className="p-4 bg-black/40 border-b border-primary/20 flex items-center justify-between">
          <h3 className="font-mono font-bold text-sm">{t.tx_log}</h3>
          <div className="flex items-center gap-2 text-xs font-mono text-primary">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-fast"></div>
            LIVE
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {isHistoryLoading ? (
            <div className="p-12 text-center text-muted-foreground font-mono flex flex-col items-center">
              <Activity className="w-8 h-8 animate-pulse mb-4 opacity-50 text-primary" />
              {t.loading}
            </div>
          ) : history && history.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/20 text-xs font-mono text-muted-foreground uppercase border-b border-border/50">
                  <th className="p-4">{t.col_date}</th>
                  <th className="p-4">{t.col_ai_decision}</th>
                  <th className="p-4">{t.col_tx}</th>
                  <th className="p-4 text-center">{t.col_score}</th>
                  <th className="p-4 text-right">{t.col_amount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-mono text-sm">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-primary/5 transition-colors group" data-testid={`row-record-${record.id}`}>
                    {/* Date */}
                    <td className="p-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(record.createdAt), "d MMM yyyy, HH:mm", { locale })}
                    </td>

                    {/* AI Decision */}
                    <td className="p-4 max-w-xs">
                      <div className="flex items-start gap-2 bg-black/30 p-2 rounded text-xs border border-white/5">
                        <Bot className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="line-clamp-3" title={record.aiExplanation} data-testid={`text-explanation-${record.id}`}>
                          {record.aiExplanation}
                        </p>
                      </div>
                    </td>

                    {/* Solana TX Hash */}
                    <td className="p-4">
                      <a
                        href={record.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 group/link"
                        data-testid={`link-tx-${record.id}`}
                      >
                        <span className="text-xs text-primary font-mono group-hover/link:underline">
                          {record.signature.slice(0, 8)}...{record.signature.slice(-8)}
                        </span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover/link:text-primary transition-colors" />
                      </a>
                    </td>

                    {/* Score */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${record.healthScore >= 80 ? 'bg-primary' : record.healthScore >= 50 ? 'bg-yellow-500' : 'bg-destructive'}`}></div>
                        <span className="font-bold">{record.healthScore}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="p-4 text-right text-primary font-bold">
                      +{record.amount} SOL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-muted-foreground font-mono">
              <Database className="w-8 h-8 mx-auto mb-4 opacity-20" />
              {t.no_records}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
