import { useGetRewardsHistory, getGetRewardsHistoryQueryKey, useGetRewardsStats, getGetRewardsStatsQueryKey } from "@workspace/api-client-react";
import { Database, Coins, Users, Activity, ExternalLink, Bot, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function Registry() {
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
          DECISION REGISTRY
        </h1>
        <p className="text-muted-foreground font-mono text-sm max-w-2xl">
          Immutable ledger of all autonomous health rewards granted by the Bio-Sovereign AI.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase">Total Paid</p>
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
            <p className="text-xs font-mono text-muted-foreground uppercase">Rewards Issued</p>
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
            <p className="text-xs font-mono text-muted-foreground uppercase">Citizens</p>
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
            <p className="text-xs font-mono text-muted-foreground uppercase">Avg Health Score</p>
            <p className="text-xl font-bold font-mono" data-testid="stat-score">
              {isStatsLoading ? "--" : Math.round(stats?.averageHealthScore || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="glass-panel rounded-xl overflow-hidden border border-primary/20">
        <div className="p-4 bg-black/40 border-b border-primary/20 flex items-center justify-between">
          <h3 className="font-mono font-bold text-sm">TRANSACTION LOG</h3>
        </div>
        
        <div className="overflow-x-auto">
          {isHistoryLoading ? (
            <div className="p-12 text-center text-muted-foreground font-mono flex flex-col items-center">
              <Activity className="w-8 h-8 animate-pulse mb-4 opacity-50 text-primary" />
              LOADING REGISTRY...
            </div>
          ) : history && history.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/20 text-xs font-mono text-muted-foreground uppercase border-b border-border/50">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Citizen Wallet</th>
                  <th className="p-4">Health Score</th>
                  <th className="p-4">Reward</th>
                  <th className="p-4">Explainable AI</th>
                  <th className="p-4 text-right">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-mono text-sm">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="p-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(record.createdAt), "MMM d, HH:mm")}
                    </td>
                    <td className="p-4 text-foreground font-bold">
                      {record.walletAddress.substring(0, 4)}...{record.walletAddress.substring(record.walletAddress.length - 4)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${record.healthScore >= 80 ? 'bg-primary' : record.healthScore >= 50 ? 'bg-yellow-500' : 'bg-destructive'}`}></div>
                        {record.healthScore}
                      </div>
                    </td>
                    <td className="p-4 text-primary font-bold">
                      +{record.amount} SOL
                    </td>
                    <td className="p-4 max-w-xs xl:max-w-md">
                      <div className="flex items-start gap-2 bg-black/30 p-2 rounded text-xs border border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Bot className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="line-clamp-2" title={record.aiExplanation} data-testid={`text-explanation-${record.id}`}>
                          {record.aiExplanation}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <a 
                        href={record.explorerUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-8 h-8 rounded bg-secondary hover:bg-primary/20 hover:text-primary transition-colors"
                        title="View on Explorer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-muted-foreground font-mono">
              <Database className="w-8 h-8 mx-auto mb-4 opacity-20" />
              NO RECORDS FOUND IN LEDGER
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
