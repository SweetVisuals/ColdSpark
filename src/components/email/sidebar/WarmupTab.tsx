import React, { useState, useEffect, useCallback } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { format } from 'date-fns';
import { Inbox, Send, Activity, Pause, Play, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmailAccount } from '../../../types';
import { getWarmupProgress } from '../../../lib/api/email-accounts';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../ui/use-toast';
import { Button } from '../../ui/button';

interface WarmupTabProps {
  account: EmailAccount;
  onToggleWarmup?: (account: EmailAccount, e: React.MouseEvent, resume?: boolean) => void;
}

const WarmupTab = ({ account, onToggleWarmup }: WarmupTabProps) => {
  const { toast } = useToast();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [warmupStats, setWarmupStats] = useState<{ received: Record<string, number>; sent: Record<string, number> }>({ received: {}, sent: {} });
  const [totals, setTotals] = useState({ sent: 0, received: 0 });

  const fetchStats = useCallback(async () => {
    if (!account?.id) return;

    try {
      const progress = await getWarmupProgress(account.id);

      // Process progress into stats by day
      let totalSent = 0;
      let totalReceived = 0;

      progress.forEach(p => {
        totalSent += p.emails_sent || 0;
        totalReceived += p.emails_received || 0;
      });

      setTotals({ sent: totalSent, received: totalReceived });

      const sentMap: Record<string, number> = {};
      const receivedMap: Record<string, number> = {};

      progress.forEach(p => {
        // Store as YYYY-MM-DD
        // Handle both YYYY-MM-DD and YYYY-MM-DDT... formats
        const dateKey = p.date.includes('T') ? p.date.split('T')[0] : p.date;
        sentMap[dateKey] = p.emails_sent;
        receivedMap[dateKey] = p.emails_received;
      });

      setWarmupStats({ sent: sentMap, received: receivedMap });

    } catch (error) {
      console.error('Failed to fetch warmup stats:', error);
    }
  }, [account.id]);

  // Fetch latest account data on mount and when account prop changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getWeekRange = (offset: number): { start: Date; end: Date } => {
    const start = new Date();
    // Adjust to Monday of the current week
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    start.setDate(diff + (offset * 7));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  const handleWeekNavigation = (direction: number): void => {
    setCurrentWeekOffset((prev: number) => prev + direction);
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getChartData = (offset: number): Array<{ day: string; dateStr: string; received: number; sent: number }> => {
    const { start } = getWeekRange(offset);

    return days.map((day, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      // Use local date string to match the keys in warmupStats
      const dateStr = format(date, 'yyyy-MM-dd');

      return {
        day,
        dateStr,
        received: warmupStats.received[dateStr] || 0,
        sent: warmupStats.sent[dateStr] || 0
      };
    });
  };

  // Generate chart data from fetched stats
  const chartData = getChartData(currentWeekOffset);

  const maxValue = Math.max(
    1, // Avoid division by zero
    ...chartData.map(d => Math.max(d.received, d.sent))
  );

  const startDate = account.warmup_start_date ? new Date(account.warmup_start_date) : null;


  return (
    <div className="space-y-8">
      {/* Warmup Status Integration */}
      <div className="bg-white/5 rounded-2xl p-6 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`transition-colors duration-300 ${account.warmup_status === 'enabled' ? 'text-green-400' : 'text-muted-foreground'}`}>
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground uppercase tracking-wider">Warmup Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${account.warmup_status === 'enabled' ? 'bg-green-500/10 text-green-400' :
                  account.warmup_status === 'paused' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-white/5 text-muted-foreground'
                  }`}>
                  {account.warmup_status === 'enabled' ? 'Active' :
                    account.warmup_status === 'paused' ? 'Paused' : 'Disabled'}
                </span>
                <span className="text-xs text-muted-foreground">• Started {startDate ? startDate.toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {account.warmup_status === 'enabled' && onToggleWarmup && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => onToggleWarmup(account, e)}
                className="bg-white/5 hover:bg-white/10 text-foreground border-none h-9 px-4 gap-2 rounded-xl transition-all"
              >
                <Pause size={16} />
                Pause
              </Button>
            )}
            {(account.warmup_status === 'paused' || account.warmup_status === 'disabled') && onToggleWarmup && (
              <Button
                size="sm"
                onClick={(e) => onToggleWarmup(account, e, true)} // Resume or enable
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 gap-2 rounded-xl shadow-lg transition-all"
              >
                <Play size={16} />
                {account.warmup_status === 'paused' ? 'Resume' : 'Start Warmup'}
              </Button>
            )}
          </div>
        </div>

        {/* Daily Progress Section */}
        <div className="mt-6 pt-6 border-t border-white/5">
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Sent Today</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {warmupStats.sent[new Date().toLocaleDateString('en-CA')] || 0}
                </span>
                <span className="text-xs text-muted-foreground">/ {account.warmup_daily_limit || 20}</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((warmupStats.sent[new Date().toLocaleDateString('en-CA')] || 0) / (account.warmup_daily_limit || 20)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Warmup Progress</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  Day {startDate ? Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0}
                </span>
                <span className="text-xs text-muted-foreground">of 30</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((startDate ? Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0) / 30) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Target</p>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">10 emails / day</span>
                <span className="text-xs text-muted-foreground">for 30 days total</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground border border-white/5">
                  {startDate ? Math.max(0, 30 - (Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)) : 30} days left
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession();

                  if (!session) {
                    throw new Error('No active session');
                  }

                  toast({
                    title: 'Sending test email...',
                    description: 'Please wait a moment.',
                  });

                  const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                      from: account.email,
                      to: 'ptnmgmt@gmail.com',
                      subject: 'Test Warmup Email',
                      text: 'This is a test warmup email',
                      smtp: {
                        host: account.smtp_host,
                        port: parseInt(account.smtp_port),
                        secure: parseInt(account.smtp_port) === 465,
                        auth: {
                          user: account.email,
                          pass: account.encrypted_password
                        }
                      },
                      emailAccountId: account.id
                    })
                  });

                  if (!response.ok) {
                    const errJson = await response.json();
                    throw new Error(errJson.error || 'Failed to send test email');
                  }

                  toast({
                    title: 'Test email sent',
                    description: 'A test warmup email was successfully sent to ptnmgmt@gmail.com',
                    variant: 'default'
                  });

                  // Refresh stats
                  setTimeout(() => {
                    fetchStats();
                  }, 2000);

                } catch (error) {
                  toast({
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Failed to send test email',
                    variant: 'destructive'
                  });
                }
              }}
              className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-2 transition-colors py-1.5 px-3 rounded-lg hover:bg-primary/10"
            >
              <Send size={14} />
              Send Test Email
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Received', value: totals.received, icon: Inbox, color: 'text-blue-400' },
          { label: 'Sent', value: totals.sent, icon: Send, color: 'text-green-400' },
          { label: 'Saved from Spam', value: account.spamSaved || 0, icon: ShieldCheck, color: 'text-amber-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.08]">
            <div className="flex items-center gap-3 mb-3">
              <stat.icon size={18} className={stat.color} />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Activity Chart */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-base font-bold text-foreground">Warmup Activity</h3>
            <p className="text-xs text-muted-foreground mt-1">Daily Breakdown</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => handleWeekNavigation(-1)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-all disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-foreground px-2 min-w-[120px] text-center">
              {getWeekRange(currentWeekOffset).start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
              {getWeekRange(currentWeekOffset).end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button
              onClick={() => handleWeekNavigation(1)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-all"
              disabled={currentWeekOffset === 0}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="h-48 flex items-end space-x-4">
          {chartData.map((day) => (
            <div key={day.dateStr} className="flex-1 flex flex-col items-center group">
              <div className="w-full relative h-full flex items-end justify-center space-x-2 transition-colors">
                {/* Received Bar */}
                <Tooltip.Provider key={`${day.dateStr}-received`}>
                  <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger asChild>
                      <div
                        className="w-full max-w-[12px] bg-blue-500/80 hover:bg-blue-500 rounded-full transition-all relative"
                        style={{
                          height: `${Math.max(6, (day.received / maxValue) * 100)}%`,
                        }}
                      />
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      side="top"
                      className="bg-popover text-popover-foreground px-3 py-2 rounded-xl text-xs shadow-2xl border-none z-50 glass"
                      sideOffset={8}
                    >
                      <div className="text-center">
                        <p className="font-bold mb-1 opacity-60 uppercase tracking-widest text-[9px]">{day.day}, {day.dateStr}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          <span className="font-bold text-sm">{day.received} Received</span>
                        </div>
                      </div>
                      <Tooltip.Arrow className="fill-popover" />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>

                {/* Sent Bar */}
                <Tooltip.Provider key={`${day.dateStr}-sent`}>
                  <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger asChild>
                      <div
                        className="w-full max-w-[12px] bg-primary/80 hover:bg-primary rounded-full transition-all relative"
                        style={{
                          height: `${Math.max(6, (day.sent / maxValue) * 100)}%`,
                        }}
                      />
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      side="top"
                      className="bg-popover text-popover-foreground px-3 py-2 rounded-xl text-xs shadow-2xl border-none z-50 glass"
                      sideOffset={8}
                    >
                      <div className="text-center">
                        <p className="font-bold mb-1 opacity-60 uppercase tracking-widest text-[9px]">{day.day}, {day.dateStr}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="font-bold text-sm">{day.sent} Sent</span>
                        </div>
                      </div>
                      <Tooltip.Arrow className="fill-popover" />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
              <p className="text-[10px] font-bold mt-4 text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors">{day.day}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WarmupTab;
