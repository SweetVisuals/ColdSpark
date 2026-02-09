import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface CampaignCardProps {
  name: string;
  status: string;
  prospects: string;
  replies: string;
  openRate: string;
  onClick: () => void;
}

const CampaignCard = ({ name, status, prospects, replies, openRate, onClick }: CampaignCardProps) => {
  return (
    <div
      onClick={onClick}
      className="glass-card rounded-xl p-6 cursor-pointer border border-border/50 group"
    >
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">{name}</h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${status === 'active'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : status === 'paused'
              ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
              : status === 'in_progress'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
            }`}
        >
          {{
            active: 'Active',
            paused: 'Paused',
            in_progress: 'In Progress'
          }[status] || status}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm mb-6">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Prospects</p>
          <p className="font-semibold text-foreground text-lg">{prospects}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Replies</p>
          <p className="font-semibold text-foreground text-lg">{replies}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Open Rate</p>
          <p className="font-semibold text-foreground text-lg">{openRate}</p>
        </div>
      </div>
      <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
        <span>View Details</span>
        <ArrowUpRight size={16} className="ml-1" />
      </div>
    </div>
  );
};

export default CampaignCard;
