import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { fetchTemplates } from '../../../lib/api/templates';
import { supabase } from '../../../lib/supabase';
import { ScheduleForm } from './ScheduleForm';
import { NoTemplatesMessage } from './NoTemplatesMessage';
import { toast } from '../../ui/use-toast';
import {
  Search,
  History,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Mail,
  Users,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { CustomCheckbox } from 'components/ui/CustomCheckbox';
import { EmailTemplate } from 'types';

interface Props {
  campaignId: string;
  onScheduleChange?: () => void;
}

const ScheduleEditor: React.FC<Props> = ({ campaignId, onScheduleChange }): React.ReactElement => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [emailsPerAccount, setEmailsPerAccount] = useState<number | undefined>(10);
  const [emailsPerDay, setEmailsPerDay] = useState<number | undefined>(50);
  const [interval, setInterval] = useState<number>();
  const [intervalAccount, setIntervalAccount] = useState<number>();

  const handleNumericChange = (setter: React.Dispatch<React.SetStateAction<number | undefined>>) =>
    (value: number | undefined) => {
      if (value !== undefined && !isNaN(value)) {
        setter(value as number);
      } else {
        setter(undefined);
      }
    };
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [allEmailAccounts, setAllEmailAccounts] = useState<Array<{ id: string; email: string }>>([]);
  const [filteredEmailAccounts, setFilteredEmailAccounts] = useState<Array<{ id: string; email: string }>>([]);
  const [selectedEmailAccounts, setSelectedEmailAccounts] = useState<string[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<Array<{
    templateId: string;
    totalEmails: number;
    sentEmails: number;
    startDate: string;
    endDate: string;
    interval: number;
    emailsPerAccount: number;
    emailAccounts: Array<{
      id: string;
      sent: number;
    }>;
  }>>([]);
  const [visibleEmails, setVisibleEmails] = useState<Record<string, boolean>>({});

  const loadScheduledEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_emails')
        .select(`
          template_id,
          total_emails,
          sent_emails,
          start_date,
          end_date,
          interval_minutes,
          emails_per_account,
          schedule_id:id,
          schedule_email_accounts!inner(
            email_account_id,
            email_accounts:email_accounts!schedule_email_accounts_email_account_id_fkey(email)
          )
        `)
        .eq('campaign_id', campaignId);

      if (error) throw error;

      // Create a map to ensure unique entries
      const templateMap = new Map();
      data.forEach((item: any) => {
        const templateKey = item.template_id;
        if (!templateMap.has(templateKey)) {
          templateMap.set(templateKey, {
            templateId: item.template_id,
            totalEmails: item.total_emails || emailsPerDay,
            sentEmails: item.sent_emails,
            startDate: item.start_date,
            endDate: item.end_date,
            interval: item.interval_minutes,
            emailsPerAccount: item.emails_per_account,
            emailAccounts: []
          });
        }
        const entry = templateMap.get(templateKey);
        if (item.schedule_email_accounts && item.schedule_email_accounts.length > 0) {
          item.schedule_email_accounts.forEach((account: any) => {
            entry.emailAccounts.push({
              id: account.email_account_id,
              sent: item.sent_emails
            });
          });
        }
      });

      // Convert map values to array
      const allEmails = Array.from(templateMap.values());
      setScheduledEmails(allEmails);
    } catch (error) {
      console.error('Error loading scheduled emails:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduled emails",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      loadTemplates();
      loadEmailAccounts();
      loadScheduledEmails();
      if (onScheduleChange) {
        onScheduleChange();
      }

      if (!startDate) {
        const today = new Date();
        setStartDate(today.toISOString().split('T')[0]);

        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        setEndDate(nextMonth.toISOString().split('T')[0]);
      }
    };
    loadData();
  }, [campaignId]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await fetchTemplates(campaignId);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_email_accounts')
        .select('email_account_id, email_accounts:email_accounts!campaign_email_accounts_email_account_id_fkey(email)')
        .eq('campaign_id', campaignId);

      if (error) throw error;

      const accounts = data.map((item: any) => ({
        id: item.email_account_id,
        email: item.email_accounts.email
      }));
      setAllEmailAccounts(accounts);
      setFilteredEmailAccounts(accounts);
    } catch (error) {
      console.error('Error loading email accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load email accounts",
        variant: "destructive"
      });
    }
  };

  const handleToggleAllAccounts = () => {
    if (selectedEmailAccounts.length === filteredEmailAccounts.length) {
      setSelectedEmailAccounts([]);
    } else {
      setSelectedEmailAccounts(filteredEmailAccounts.map(a => a.id));
    }
  };

  const handleDeleteSchedule = async (templateId: string) => {
    if (!templateId) {
      toast({
        title: "Error",
        description: "Missing template information for deletion",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('scheduled_emails')
        .delete()
        .eq('template_id', templateId);

      if (error) throw error;

      setScheduledEmails(prev => prev.filter(item => item.templateId !== templateId));

      if (onScheduleChange) {
        onScheduleChange();
      }

      toast({
        title: "Success",
        description: "Schedule deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive"
      });
    }
  };

  const handleSchedule = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive"
      });
      return;
    }

    if (selectedEmailAccounts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one email account",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);

      const parsedEmailsPerDay = Number(emailsPerDay);
      const parsedInterval = Number(interval);

      if (isNaN(parsedEmailsPerDay) || isNaN(parsedInterval)) {
        throw new Error('Invalid numeric input values');
      }

      // Create the schedule in the database
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('scheduled_emails')
        .insert({
          campaign_id: campaignId,
          template_id: selectedTemplate,
          start_date: `${startDate}T${startTime}`,
          end_date: `${endDate}T${startTime}`,
          scheduled_for: `${startDate}T${startTime}`,
          total_emails: parsedEmailsPerDay,
          interval_minutes: parsedInterval,
          emails_per_account: emailsPerAccount,
          status: 'scheduled'
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Create schedule email accounts entries
      const { error: accountsError } = await supabase
        .from('schedule_email_accounts')
        .insert(selectedEmailAccounts.map(emailAccountId => ({
          schedule_id: scheduleData.id,
          email_account_id: emailAccountId,
          emails_sent: 0,
          emails_remaining: emailsPerAccount
        })));

      if (accountsError) throw accountsError;

      if (onScheduleChange) {
        onScheduleChange();
      }
      await loadScheduledEmails();

      // Update campaign status if needed
      const { data: existingSchedules } = await supabase
        .from('scheduled_emails')
        .select('id')
        .eq('campaign_id', campaignId);

      if (!existingSchedules || existingSchedules.length <= 1) {
        await supabase
          .from('campaigns')
          .update({ status: 'In Progress' })
          .eq('id', campaignId);
      }

      toast({
        title: "Success",
        description: `Scheduled campaign successfully across ${selectedEmailAccounts.length} accounts`
      });

      // Reset selections
      setSelectedEmailAccounts([]);
    } catch (error: any) {
      console.error('Error scheduling emails:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule campaign",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handlePersonalizeLaunch = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Error", description: "Please select start/end dates", variant: "destructive" });
      return;
    }
    if (selectedEmailAccounts.length === 0) {
      toast({ title: "Error", description: "Select email accounts", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const parsedEmailsPerDay = Number(emailsPerDay);
      const parsedInterval = Number(interval);

      // 1. Create Schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('scheduled_emails')
        .insert({
          campaign_id: campaignId,
          template_id: selectedTemplate,
          start_date: `${startDate}T${startTime}`,
          end_date: `${endDate}T${startTime}`,
          scheduled_for: `${startDate}T${startTime}`,
          total_emails: parsedEmailsPerDay,
          interval_minutes: parsedInterval,
          emails_per_account: emailsPerAccount,
          status: 'scheduled'
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // 2. Assign Accounts
      const { error: accountsError } = await supabase
        .from('schedule_email_accounts')
        .insert(selectedEmailAccounts.map(id => ({
          schedule_id: scheduleData.id,
          email_account_id: id,
          emails_sent: 0,
          emails_remaining: emailsPerAccount
        })));

      if (accountsError) throw accountsError;

      // 3. Set Status to 'in_progress' to trigger Cloud Sending
      await supabase
        .from('campaigns')
        .update({ status: 'in_progress' })
        .eq('id', campaignId);

      // 4. Trigger Personalization API
      // We don't await this fully if we want to return early, but better to await start confirmation
      // const response = await fetch(`http://127.0.0.1:3001/api/campaigns/${campaignId}/personalize`, {
      //   method: 'POST'
      // });

      // if (!response.ok) throw new Error('Failed to start personalization');

      toast({
        title: "Campaign Launched",
        description: "Emails will be personalized and sent automatically in the background."
      });

      if (onScheduleChange) onScheduleChange();
      await loadScheduledEmails();
      setSelectedEmailAccounts([]);

    } catch (error: any) {
      console.error('Error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Wizard State
  interface StagedSchedule {
    templateId: string;
    templateName: string;
    startDate: string;
    endDate: string;
    startTime: string;
    totalEmails: number;
    interval: number;
    emailsPerAccount: number;
  }

  const [stagedSchedules, setStagedSchedules] = useState<StagedSchedule[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  // 1. Auto-Schedule / Prep Logic
  const handleAutoSchedule = async () => {
    try {
      setIsLoading(true);

      // A. Fetch Lead Count
      const { count, error } = await supabase
        .from('campaign_leads')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      if (error) throw error;

      const totalLeads = count || 0;
      if (totalLeads === 0) {
        toast({ title: "Info", description: "No leads found in this campaign.", variant: "default" });
        setIsLoading(false);
        return;
      }

      // B. Fetch Templates (Sorted by creation/sequence)
      // Note: We already have 'templates' from state, but ensuring they are sorted
      const sortedTemplates = [...templates].sort((a, b) =>
        // Assuming implicit order by creation for now, or name
        // Ideally we'd have a 'step' field, but we'll use array order
        0 // Using the order returned by API (created_at desc usually, let's reverse if needed?)
        // The fetchTemplates API orders by created_at DESC. So latest is first.
        // Usually sequences are created Oldest -> Newest. 
        // Let's reverse them so Oldest (Step 1) is first.
      ).reverse();

      if (sortedTemplates.length === 0) {
        toast({ title: "Error", description: "No templates found to schedule.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // C. Calculate Staggered Schedules
      const limitPerDay = emailsPerDay || 50;
      const durationDays = Math.ceil(totalLeads / limitPerDay);
      const gapDays = 3; // Default gap between sequences

      const proposed: StagedSchedule[] = [];
      let currentStartDate = new Date();
      currentStartDate.setDate(currentStartDate.getDate() + 1); // Start tomorrow

      sortedTemplates.forEach((tpl, index) => {
        const start = new Date(currentStartDate);
        // Stagger: Add gap for subsequent steps
        start.setDate(start.getDate() + (index * gapDays));

        const end = new Date(start);
        end.setDate(end.getDate() + durationDays);

        proposed.push({
          templateId: tpl.id,
          templateName: tpl.name,
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          startTime: '09:00',
          totalEmails: limitPerDay,
          interval: interval || 10,
          emailsPerAccount: emailsPerAccount || 10
        });
      });

      setStagedSchedules(proposed);

      // D. Selection of accounts is preserved directly from state

      // E. Show Wizard
      setShowWizard(true);
      toast({ title: "Schedule Prepped", description: `Calculated timeline for ${sortedTemplates.length} steps.` });

    } catch (err: any) {
      console.error("Auto Prep Error", err);
      toast({ title: "Error", description: "Failed to prep schedule", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Wizard Launch Logic
  const handleWizardLaunch = async () => {
    if (selectedEmailAccounts.length === 0) {
      toast({ title: "Error", description: "Please select at least one email account.", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);

      for (const schedule of stagedSchedules) {
        // Create Schedule
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('scheduled_emails')
          .insert({
            campaign_id: campaignId,
            template_id: schedule.templateId,
            start_date: `${schedule.startDate}T${schedule.startTime}`,
            end_date: `${schedule.endDate}T${schedule.startTime}`,
            scheduled_for: `${schedule.startDate}T${schedule.startTime}`,
            total_emails: schedule.totalEmails,
            interval_minutes: schedule.interval,
            emails_per_account: schedule.emailsPerAccount,
            status: 'scheduled'
          })
          .select()
          .single();

        if (scheduleError) throw scheduleError;

        // Assign Accounts
        const { error: accountsError } = await supabase
          .from('schedule_email_accounts')
          .insert(selectedEmailAccounts.map(emailAccountId => ({
            schedule_id: scheduleData.id,
            email_account_id: emailAccountId,
            emails_sent: 0,
            emails_remaining: schedule.emailsPerAccount
          })));

        if (accountsError) throw accountsError;
      }

      // Set Campaign Status
      await supabase
        .from('campaigns')
        .update({ status: 'in_progress' })
        .eq('id', campaignId);

      toast({
        title: "Campaign Launched",
        description: `Successfully scheduled ${stagedSchedules.length} sequences.`
      });

      // Cleanup
      setShowWizard(false);
      setStagedSchedules([]);
      setSelectedEmailAccounts([]);
      if (onScheduleChange) onScheduleChange();
      await loadScheduledEmails();

    } catch (error: any) {
      console.error('Wizard Launch Error:', error);
      toast({ title: "Launch Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm p-8 border border-border">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-8">
            <div className="h-24 bg-muted rounded-2xl"></div>
            <div className="grid grid-cols-2 gap-8">
              <div className="h-40 bg-muted rounded-2xl"></div>
              <div className="h-40 bg-muted rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-sm p-12 border border-border text-center">
        <NoTemplatesMessage />
      </div>
    );
  }

  // --- WIZARD UI ---
  if (showWizard) {
    return (
      <div className="bg-card rounded-3xl shadow-xl shadow-black/5 p-8 border border-border/50 backdrop-blur-sm animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-500/10 rounded-2xl">
              <Sparkles className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Review Auto-Schedule</h2>
              <p className="text-sm text-muted-foreground">We've calculated the optimal timeline for your {stagedSchedules.length} sequences.</p>
            </div>
          </div>
          <Button
            onClick={() => setShowWizard(false)}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </div>

        {/* 1. Timeline Summary */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-primary" />
            Proposed Timeline
          </h3>
          <div className="grid gap-3">
            {stagedSchedules.map((schedule, i) => (
              <div key={schedule.templateId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-4 ring-background">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{schedule.templateName}</p>
                    <p className="text-xs text-muted-foreground">{schedule.totalEmails} emails/day • {Math.ceil((new Date(schedule.endDate).getTime() - new Date(schedule.startDate).getTime()) / (1000 * 3600 * 24))} days duration</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium bg-background/50 px-3 py-1.5 rounded-lg border border-border/30">
                  <span className="text-muted-foreground">Starts:</span>
                  <span className="text-foreground">{new Date(schedule.startDate).toLocaleDateString()}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Ends:</span>
                  <span className="text-foreground">{new Date(schedule.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Account Selection (Simplified) */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Select Output Accounts ({selectedEmailAccounts.length})
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleAllAccounts}
                className="text-xs h-8"
              >
                {selectedEmailAccounts.length === filteredEmailAccounts.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {filteredEmailAccounts.map((account) => (
              <div
                key={account.id}
                onClick={() => {
                  if (selectedEmailAccounts.includes(account.id)) {
                    setSelectedEmailAccounts(selectedEmailAccounts.filter(id => id !== account.id));
                  } else {
                    setSelectedEmailAccounts([...selectedEmailAccounts, account.id]);
                  }
                }}
                className={`
                    flex items-center p-3 border rounded-xl cursor-pointer transition-all duration-200 gap-3
                    ${selectedEmailAccounts.includes(account.id)
                    ? 'bg-primary/5 border-primary/40'
                    : 'bg-background border-border/50 hover:border-primary/20'
                  }
                  `}
              >
                <CustomCheckbox
                  checked={selectedEmailAccounts.includes(account.id)}
                  onChange={() => { }}
                />
                <span className="text-sm truncate">{account.email}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Actions */}
        <div className="flex justify-end pt-6 border-t border-border/50">
          <Button
            onClick={handleWizardLaunch}
            disabled={selectedEmailAccounts.length === 0 || isSaving}
            className="h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold shadow-xl shadow-primary/25 group text-lg"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Launching...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Launch All Schedules
              </div>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // --- DEFAULT VIEW ---


  return (
    <div className="bg-card rounded-3xl shadow-xl shadow-black/5 p-8 border border-border/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Campaign Scheduler</h2>
            <p className="text-sm text-muted-foreground">Configure the automated sequence delivery</p>
          </div>
        </div>
      </div>

      {/* Primary Call to Action - Auto Mode */}
      {!isManualMode && (
        <div className="mb-12 p-8 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 rounded-3xl border border-violet-500/10 flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="h-16 w-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20 mb-2">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-bold text-foreground">Auto-Schedule Wizard</h3>
            <p className="text-muted-foreground text-sm">
              Automatically calculate optimal send times and stagger all your sequence emails in one click.
            </p>
          </div>
          <Button
            onClick={handleAutoSchedule}
            className="h-12 px-8 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-bold text-base shadow-xl"
          >
            start Auto-Schedule
          </Button>

          <div className="relative w-full max-w-sm">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <button
                onClick={() => setIsManualMode(true)}
                className="bg-card/50 px-2 text-muted-foreground backdrop-blur-sm hover:text-primary hover:bg-card transition-colors font-semibold cursor-pointer z-10"
              >
                Or configure manually below
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Mode */}
      {isManualMode && (
        <div className="animate-in fade-in duration-300">
          <div className="mb-6 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsManualMode(false)}
              className="text-xs text-muted-foreground hover:text-primary gap-2"
            >
              <Sparkles className="h-3 w-3" />
              Back to Auto Strategy
            </Button>
          </div>

          <ScheduleForm
            templates={templates}
            selectedTemplate={selectedTemplate}
            startDate={startDate}
            endDate={endDate}
            startTime={startTime}
            emailsPerAccount={emailsPerAccount}
            emailsPerDay={emailsPerDay}
            interval={interval}
            intervalAccount={intervalAccount}
            onTemplateChange={setSelectedTemplate}
            onIntervalAccountChange={(value: number | undefined) => handleNumericChange(setIntervalAccount)(value)}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onStartTimeChange={setStartTime}
            onEmailsPerAccountChange={(value: number | undefined) => handleNumericChange(emailsPerAccount !== value ? setEmailsPerAccount : setEmailsPerAccount)(value)}
            onEmailsPerDayChange={(value: number | undefined) => handleNumericChange(emailsPerDay !== value ? setEmailsPerDay : setEmailsPerDay)(value)}
            onIntervalChange={(value: number | undefined) => handleNumericChange(interval !== value ? setInterval : setInterval)(value)}
          />
        </div>
      )}

      {/* Shared Account Selection - Visible in Both Modes */}
      <div className="mt-16 pt-12 border-t border-border/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Sender Accounts</h3>
              <p className="text-xs text-muted-foreground">{selectedEmailAccounts.length} accounts selected</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search accounts..."
                className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-foreground"
                onChange={(e) => {
                  const search = e.target.value.trim().toLowerCase();
                  setFilteredEmailAccounts(
                    allEmailAccounts.filter((account) =>
                      account.email.toLowerCase().includes(search)
                    )
                  );
                }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAllAccounts}
              className="h-10 px-4 rounded-xl border-border/50 hover:bg-muted/50 text-xs font-semibold"
            >
              {selectedEmailAccounts.length === filteredEmailAccounts.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEmailAccounts.length > 0 ? (
            filteredEmailAccounts.map((account) => (
              <div
                key={account.id}
                onClick={() => {
                  if (selectedEmailAccounts.includes(account.id)) {
                    setSelectedEmailAccounts(selectedEmailAccounts.filter(id => id !== account.id));
                  } else {
                    setSelectedEmailAccounts([...selectedEmailAccounts, account.id]);
                  }
                }}
                className={`
                  flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all duration-200 group
                  ${selectedEmailAccounts.includes(account.id)
                    ? 'bg-primary/5 border-primary/40 shadow-sm shadow-primary/5'
                    : 'bg-muted/10 border-border/50 hover:border-primary/20'
                  }
                `}
              >
                <CustomCheckbox
                  checked={selectedEmailAccounts.includes(account.id)}
                  onChange={() => { }} // Handled by parent div click
                />
                <div className="flex flex-col min-w-0">
                  <span className={`
                    text-sm font-semibold truncate transition-colors
                    ${selectedEmailAccounts.includes(account.id) ? 'text-primary' : 'text-foreground'}
                  `}>
                    {account.email}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Available Account
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-12 bg-muted/5 rounded-3xl border border-dashed border-border/50">
              <div className="p-3 bg-muted/10 rounded-full mb-3">
                <AlertCircle className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No matching email accounts found</p>
            </div>
          )}
        </div>
      </div>

      {isManualMode && (
        <div className="animate-in fade-in duration-300">
          <div className="mt-12 flex justify-end gap-4">
            <Button
              onClick={handlePersonalizeLaunch}
              disabled={!selectedTemplate || !startDate || !endDate || selectedEmailAccounts.length === 0 || isSaving}
              className="relative h-14 px-8 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold shadow-xl shadow-violet-500/20 group overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span>Personalize & Launch</span>
              </div>
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!selectedTemplate || !startDate || !endDate || selectedEmailAccounts.length === 0 || isSaving}
              className="relative h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold shadow-xl shadow-primary/25 group overflow-hidden"
            >
              <div className="relative z-10 flex items-center gap-2">
                {isSaving ? (
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                <span>{isSaving ? 'Processing Schedule...' : 'Launch Schedule'}</span>
              </div>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
          </div>
        </div>
      )}

      <div className="mt-24 pt-12 border-t border-border/50">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Active Schedules</h3>
            <p className="text-xs text-muted-foreground">Live deployment status and progress</p>
          </div>
        </div>

        <div className="grid gap-6">
          {scheduledEmails.length > 0 ? (
            scheduledEmails.map((item) => {
              const template = templates.find(t => t.id === item.templateId);
              const entryId = `${item.emailAccounts[0]?.id || 'unknown'}-${item.templateId}`;
              const showEmails = visibleEmails[entryId] || false;
              const progress = Math.min(100, Math.max(0, (item.sentEmails / (item.totalEmails || 1)) * 100));

              return (
                <div key={entryId} className="group relative bg-muted/5 border border-border/50 rounded-3xl p-6 transition-all duration-300 hover:bg-muted/10 hover:border-primary/30">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" />
                            {template?.name || 'Loading Template...'}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-3">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              Started {new Date(item.startDate).toLocaleDateString()}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3 w-3" />
                              {item.emailAccounts.length} Accounts
                            </span>
                          </p>
                        </div>
                        <div className={`
                          px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border
                          ${item.sentEmails >= item.totalEmails
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : 'bg-primary/10 text-primary border-primary/20 animate-pulse-subtle'
                          }
                        `}>
                          {item.sentEmails >= item.totalEmails ? 'Completed' : 'Running'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-background/50 rounded-2xl border border-border/30">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Daily Volume</p>
                          <p className="text-sm font-semibold">{item.totalEmails} emails</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Gap</p>
                          <p className="text-sm font-semibold">{item.interval} min</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Per Account</p>
                          <p className="text-sm font-semibold">{item.emailsPerAccount}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Ends On</p>
                          <p className="text-sm font-semibold">{new Date(item.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-72 space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold text-muted-foreground uppercase">Progress</span>
                          <span className="text-lg font-black text-primary">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden border border-border/30">
                          <div
                            className="h-full bg-primary transition-all duration-1000 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground px-0.5">
                          <span>{item.sentEmails} SENT</span>
                          <span>{item.totalEmails} TARGET</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVisibleEmails(prev => ({ ...prev, [entryId]: !showEmails }))}
                          className="flex-1 h-9 rounded-xl hover:bg-primary/5 text-primary text-xs font-bold gap-2"
                        >
                          {showEmails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {showEmails ? 'Hide Details' : 'View Accounts'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSchedule(item.templateId)}
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {showEmails && (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-background/40 rounded-2xl border border-border/30 animate-in fade-in slide-in-from-top-2 duration-300">
                      {item.emailAccounts.map(account => {
                        const emailAccount = allEmailAccounts.find(a => a.id === account.id);
                        const accProgress = (account.sent / item.emailsPerAccount) * 100;
                        return (
                          <div key={account.id} className="flex flex-col gap-1.5 p-3 bg-muted/20 rounded-xl border border-border/30">
                            <span className="text-xs font-semibold truncate text-foreground">{emailAccount?.email || 'Unknown'}</span>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>{account.sent} / {item.emailsPerAccount}</span>
                              <span className="font-mono">{Math.round(accProgress)}%</span>
                            </div>
                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/60" style={{ width: `${accProgress}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-muted/5 rounded-[2rem] border-2 border-dashed border-border/50">
              <div className="p-4 bg-primary/5 rounded-full mb-4">
                <Mail className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-1">No Active Schedules</h4>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Once you configure the launcher above, your campaign sequences will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleEditor;

