import React, { useEffect, useState } from 'react';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { Card } from '../ui/card';
import { Mail, Send, Rocket, Zap, Target, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';
import { Database } from '../../types/database';
import { useApp } from '../../context/AppContext';
import { Loader2 } from 'lucide-react';


interface ProgressTabProps {
  campaignId: string;
}

interface ScheduleProgress {
  id: string;
  templateId: string;
  templateName: string;
  startDate: string;
  endDate: string;
  totalEmails: number;
  sentEmails: number;
  interval: number;
  emailsPerAccount: number;
  emailAccounts: Array<{
    id: string;
    email: string;
    sent: number;
  }>;
}

interface LeadProgress {
  id: string;
  email: string;
  status: 'pending' | 'sent' | 'failed';
}

const ProgressTab = ({ campaignId }: ProgressTabProps) => {
  const { toast } = useToast();
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleProgress[]>([]);
  const [leads, setLeads] = useState<LeadProgress[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { campaigns } = useApp();
  const campaign = campaigns.find(c => c.id === campaignId);

  const isPersonalizing = (campaign?.status as any) === 'personalizing';

  const handleLeadSelection = async (leadId: string) => {
    // ... (same as before)
    const newSelection = selectedLeads.includes(leadId)
      ? selectedLeads.filter(id => id !== leadId)
      : [...selectedLeads, leadId];

    setSelectedLeads(newSelection);

    try {
      const { error } = await supabase
        .from('campaign_progress')
        .upsert({
          campaign_id: campaignId,
          lead_id: leadId,
          selected: newSelection.includes(leadId),
          status: 'pending',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'campaign_id,lead_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating lead selection:', error);
      toast({
        title: 'Error',
        description: 'Failed to save lead selection',
        variant: 'destructive'
      });
      setSelectedLeads(prev =>
        prev.includes(leadId)
          ? prev.filter(id => id !== leadId)
          : [...prev, leadId]
      );
    }
  };

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        // Fetch scheduled emails
        const { data: scheduledEmails } = await supabase
          .from('scheduled_emails')
          .select(`
            id,
            template_id,
            templates(name),
            total_emails,
            sent_emails,
            start_date,
            end_date,
            interval_minutes,
            emails_per_account,
            schedule_email_accounts!inner(
              email_account_id,
              email_accounts:email_accounts!schedule_email_accounts_email_account_id_fkey(email)
            )
          `)
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: true });

        const scheduleProgress = (scheduledEmails || []).map((entry: any) => ({
          id: entry.id,
          templateId: entry.template_id,
          templateName: entry.templates?.name || 'Unknown Template',
          startDate: entry.start_date,
          endDate: entry.end_date,
          totalEmails: entry.total_emails,
          sentEmails: entry.sent_emails,
          interval: entry.interval_minutes,
          emailsPerAccount: entry.emails_per_account,
          emailAccounts: (entry.schedule_email_accounts || []).map((account: any) => ({
            id: account.email_account_id,
            email: account.email_accounts?.email || 'Unknown Email',
            sent: entry.sent_emails
          }))
        })) as ScheduleProgress[];

        // Fetch leads progress
        const { data: campaignLeads } = await supabase
          .from('campaign_leads')
          .select('leads(id, email)')
          .eq('campaign_id', campaignId);

        // Fetch lead progress and selection status
        const { data: leadProgressData } = await supabase
          .from('campaign_progress')
          .select('id, lead_id, status, selected')
          .eq('campaign_id', campaignId);

        // Get selected leads
        const selected = leadProgressData
          ?.filter(progress => progress.selected)
          .map(progress => progress.lead_id) || [];
        setSelectedLeads(selected);

        const leadProgress = campaignLeads?.map((lead: any) => {
          const status = leadProgressData?.find(
            (p: any) => p.lead_id === lead.leads.id
          )?.status || 'pending';

          return {
            id: lead.leads.id,
            email: lead.leads.email,
            status
          };
        }).filter(Boolean) || [];

        setScheduleEntries(scheduleProgress);
        setLeads(leadProgress);

      } catch (error) {
        console.error('Error fetching campaign progress:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch campaign progress',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [campaignId, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Loading progress...</h3>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isPersonalizing && (
        <Card className="p-6 border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-500/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-violet-500/20 rounded-2xl animate-pulse shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                AI Personalization Active
              </h3>
              <p className="text-sm text-violet-200/60 mt-1 font-medium">
                Rewriting emails for <span className="text-violet-100">{leads.length} leads</span>. Campaign will launch automatically.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Campaign Progress Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Progress Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-white dark:bg-[#0f0f12] dark:border-white/10 shadow-xl overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 relative">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Rocket className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Campaign Progress</h3>
            </div>

            <div className="space-y-4 relative">
              {scheduleEntries.length === 0 ? (
                <div className="text-center py-12 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                  <p className="text-muted-foreground text-sm font-medium">No emails scheduled yet.</p>
                </div>
              ) : (
                scheduleEntries.map((entry, index) => {
                  const progressPercent = Math.min(100, Math.max(0, (entry.sentEmails / entry.totalEmails) * 100));
                  const isComplete = progressPercent === 100;

                  return (
                    <div
                      key={entry.id}
                      className="group relative bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-5 border border-gray-200 dark:border-white/5 hover:border-blue-500/30 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.15)] transition-all duration-300"
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-500 pointer-events-none" />

                      <div className="flex justify-between items-start mb-4 relative">
                        <div className="flex items-start gap-4">
                          <div className={`
                            w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg
                            ${index === 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20' :
                              index === 1 ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-purple-500/20' :
                                'bg-gradient-to-br from-gray-600 to-gray-700'}
                          `}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                              {entry.templateName}
                              {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            </h4>
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-muted-foreground">
                              <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Start: {new Date(entry.startDate).toLocaleDateString()}
                              </span>
                              <span>•</span>
                              <span>Every {entry.interval}m</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                            <Zap className="h-3 w-3 text-blue-500" />
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                              {entry.totalEmails} / day
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 relative">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Mission Progress</span>
                          <span className={`font-bold ${isComplete ? 'text-green-500' : 'text-blue-500'}`}>
                            {progressPercent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-black/40 rounded-full h-3 p-[1px] shadow-inner">
                          <div
                            className={`
                              h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden
                              ${isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'}
                            `}
                            style={{ width: `${progressPercent}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                          </div>
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                          <span>0 sent</span>
                          <span>{entry.totalEmails} target</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/5 relative">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operatives</span>
                          <div className="h-[1px] flex-1 bg-gray-200 dark:bg-white/5" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {entry.emailAccounts.map(account => (
                            <div key={account.id} className="group/account flex items-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 px-2.5 py-1.5 rounded-lg hover:border-blue-500/30 transition-colors">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                {account.email.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{account.email}</span>
                              <span className="text-[10px] text-gray-400 font-mono bg-gray-50 dark:bg-black/20 px-1.5 py-0.5 rounded">
                                {account.sent}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Lead Tracking Column */}
        <div className="lg:col-span-1">
          <Card className="p-0 sticky top-6 bg-white dark:bg-[#0f0f12] dark:border-white/10 shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-100px)]">
            <div className="p-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Live Tracking</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">Monitor real-time engagement status.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              <div className="space-y-1">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`
                      flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 group cursor-pointer border border-transparent
                      ${selectedLeads.includes(lead.id)
                        ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20'
                        : 'hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-200 dark:hover:border-white/5'}
                    `}
                  >
                    <div className="relative">
                      <CustomCheckbox
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleLeadSelection(lead.id)}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-xs font-medium truncate ${selectedLeads.includes(lead.id) ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {lead.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${lead.status === 'sent' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                          lead.status === 'failed' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`} />
                        <span className="text-[10px] text-gray-400 capitalize">{lead.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedLeads.length > 0 && (
              <div className="p-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{selectedLeads.length} objectives selected</span>
                  <button
                    onClick={() => setSelectedLeads([])}
                    className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 uppercase tracking-wider transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>


    </div >
  );
};

export default ProgressTab;
