import { supabase } from '../supabase';
import { handleApiError } from './error';

interface ScheduleParams {
  campaignId: string;
  templateId: string;
  startDate: string;
  endDate: string;
  emailsPerDay: number;
  intervalMinutes: number;
  emailsPerAccount: number;
}

export async function scheduleEmails(params: ScheduleParams) {
  try {
    // Get leads and email accounts for the campaign
    const [{ data: leads, error: leadsError }, { data: emailAccounts, error: emailAccountsError }] = await Promise.all([
      supabase
        .from('leads')
        .select('id')
        .eq('campaign_id', params.campaignId)
        .order('created_at', { ascending: true }),
      supabase
        .from('campaign_email_accounts')
        .select('email_account_id')
        .eq('campaign_id', params.campaignId)
    ]);

    if (leadsError) throw leadsError;
    if (emailAccountsError) throw emailAccountsError;
    if (!emailAccounts?.length) throw new Error('No email accounts found for campaign');

    const startTime = new Date(params.startDate);
    const endTime = new Date(params.endDate);

    // Create schedule entry
    const { data: schedule, error: scheduleError } = await supabase
      .from('scheduled_emails')
      .insert({
        campaign_id: params.campaignId,
        template_id: params.templateId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        emails_per_day: params.emailsPerDay,
        interval_minutes: params.intervalMinutes,
        status: 'pending'
      })
      .select()
      .single();

    if (scheduleError) throw scheduleError;

    // Add email accounts to schedule
    const scheduleAccounts = emailAccounts.map(account => ({
      schedule_id: schedule.id,
      email_account_id: account.email_account_id,
      emails_remaining: params.emailsPerAccount
    }));

    const { error: accountsError } = await supabase
      .from('schedule_email_accounts')
      .insert(scheduleAccounts);

    if (accountsError) throw accountsError;

    // Create progress records for leads
    const progressRecords = leads.map(lead => ({
      campaign_id: params.campaignId,
      schedule_id: schedule.id,
      lead_id: lead.id,
      status: 'pending'
    }));

    const { error: progressError } = await supabase
      .from('campaign_progress')
      .insert(progressRecords);

    if (progressError) throw progressError;

    return schedule;
  } catch (error) {
    return handleApiError(error);
  }
}
