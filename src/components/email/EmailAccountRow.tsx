import React from 'react';
import { Flame, MoreVertical } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface EmailAccountRowProps {
  account: any;
  onAccountClick: (account: any) => void;
  onToggleWarmup: (account: any, e: React.MouseEvent) => void;
}

export const EmailAccountRow: React.FC<EmailAccountRowProps> = ({
  account,
  onAccountClick,
  onToggleWarmup,
}) => {
  return (
    <tr className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => onAccountClick(account)}>
      <td className="px-6 py-4">
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={0}>
            <Tooltip.Trigger asChild>
              <button
                onClick={(e) => onToggleWarmup(account, e)}
                className={`${account.warmup_status === 'enabled' ? 'text-orange-500' :
                  account.warmup_status === 'paused' ? 'text-yellow-500' :
                    'text-muted-foreground hover:text-orange-500'
                  }`}
              >
                <Flame size={20} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content
              side="top"
              className="bg-popover text-popover-foreground px-2 py-1 rounded text-sm shadow-md border border-border"
              sideOffset={5}
            >
              {account.warmup_status === 'enabled' ? 'Pause Warmup' :
                account.warmup_status === 'paused' ? 'Resume Warmup' : 'Enable Warmup'}
              <Tooltip.Arrow className="fill-popover" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </td>
      <td className="px-6 py-4">{account.email}</td>
      <td className="px-6 py-4">{account.emailsSent || 0}</td>
      <td className="px-6 py-4">{account.warmupEmails || 0}</td>
      <td className="px-6 py-4">{account.healthScore || 'N/A'}</td>
      <td className="px-6 py-4">
        <button className="text-muted-foreground hover:text-foreground">
          <MoreVertical size={20} />
        </button>
      </td>
    </tr>
  );
};
