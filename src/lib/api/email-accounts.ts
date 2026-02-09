import { supabase } from '../supabase';
import { EmailAccount } from '../../types';

export const fetchEmailAccounts = async (campaignId?: string): Promise<EmailAccount[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  if (campaignId) {
    // First verify the campaign belongs to the user
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      throw new Error('Campaign not found or access denied');
    }

    const { data, error } = await supabase
      .from('campaign_email_accounts')
      .select(`
        email_accounts:email_accounts!fk_campaign_email_accounts_email_accounts (
          id,
          user_id,
          email,
          name,
          signature,
          imap_host,
          imap_port,
          smtp_host,
          smtp_port,
          created_at,
          warmup_enabled,
          warmup_filter_tag,
          warmup_increase_per_day,
          warmup_daily_limit,
          warmup_start_date,
          warmup_status
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('email_accounts.user_id', user.id); // Ensure only user's email accounts

    if (error) {
      throw new Error(error.message);
    }

    return data?.map((cea: any) => ({
      id: cea.email_accounts.id,
      user_id: cea.email_accounts.user_id,
      email: cea.email_accounts.email,
      name: cea.email_accounts.name,
      signature: cea.email_accounts.signature,
      imap_host: cea.email_accounts.imap_host,
      imap_port: cea.email_accounts.imap_port,
      smtp_host: cea.email_accounts.smtp_host,
      smtp_port: cea.email_accounts.smtp_port,
      created_at: cea.email_accounts.created_at,
      warmup_enabled: cea.email_accounts.warmup_enabled,
      warmup_filter_tag: cea.email_accounts.warmup_filter_tag,
      warmup_increase_per_day: cea.email_accounts.warmup_increase_per_day,
      warmup_daily_limit: cea.email_accounts.warmup_daily_limit,
      warmup_start_date: cea.email_accounts.warmup_start_date,
      warmup_status: cea.email_accounts.warmup_status,
      smtp_password: '',
      password: '',
      encrypted_password: cea.email_accounts.encrypted_password
    })) || [];
  }

  const { data, error } = await supabase
    .rpc('get_email_accounts_with_stats', { p_user_id: user.id });
  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((account: any) => ({
    ...account,
    emailsSent: account.total_sent,
    warmupEmails: account.total_warmup,
    healthScore: account.health_score?.toString()
  }));
};

export interface CreateEmailAccountParams {
  email: string;
  name: string;
  imap_host: string;
  imap_port: string;
  smtp_host: string;
  smtp_port: string;
  user_id: string;
  encrypted_password?: string;
}

export const createEmailAccount = async (
  params: CreateEmailAccountParams
): Promise<EmailAccount> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Verify the user_id matches the authenticated user
  if (params.user_id && params.user_id !== user.id) {
    throw new Error('Invalid user ID');
  }

  // Set user_id from authenticated user
  params.user_id = user.id;
  console.log('Authenticated user ID:', user.id);
  console.log('Auth.uid() value:', (await supabase.auth.getUser()).data.user?.id);

  // Check if email already exists for this user
  const { data: existingAccounts, error: lookupError } = await supabase
    .from('email_accounts')
    .select('email')
    .eq('email', params.email)
    .eq('user_id', user.id);

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existingAccounts && existingAccounts.length > 0) {
    throw new Error('An account with this email already exists');
  }

  try {
    // Generate a random 8-character string for the warmup filter tag
    const warmupFilterTag = Math.random().toString(36).substring(2, 10).toUpperCase();

    const insertData = {
      ...params,
      user_id: user.id, // Explicitly set user_id from authenticated user
      warmup_enabled: false,
      warmup_filter_tag: warmupFilterTag,
      warmup_increase_per_day: 0,
      warmup_daily_limit: 0,
      warmup_status: 'disabled',
      warmup_start_date: null,
      encrypted_password: params.encrypted_password
    };
    
    console.log('Inserting email account with user_id:', insertData.user_id);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    console.log('Current auth.uid():', currentUser?.id);
    
    const { data, error } = await supabase
      .from('email_accounts')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Failed to create email account');
    }

    return {
      id: data.id,
      user_id: data.user_id,
      email: data.email,
      name: data.name,
      imap_host: data.imap_host,
      imap_port: data.imap_port,
      smtp_host: data.smtp_host,
      smtp_port: data.smtp_port,
      created_at: data.created_at,
      warmup_enabled: data.warmup_enabled,
      warmup_filter_tag: data.warmup_filter_tag,
      warmup_increase_per_day: data.warmup_increase_per_day,
      warmup_daily_limit: data.warmup_daily_limit,
      warmup_start_date: data.warmup_start_date,
      warmup_status: data.warmup_status,
      encrypted_password: data.encrypted_password,
      smtp_password: '',
      password: ''
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new Error('An account with this email already exists');
    }
    throw error;
  }
};

export const deleteEmailAccount = async (id: string): Promise<void> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // First verify the email account belongs to the user
  const { data: emailAccount, error: lookupError } = await supabase
    .from('email_accounts')
    .select('user_id')
    .eq('id', id)
    .single();

  if (lookupError || !emailAccount || emailAccount.user_id !== user.id) {
    throw new Error('Email account not found or access denied');
  }

  const { error } = await supabase
    .from('email_accounts')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

export const addEmailAccountsToCampaign = async (
  campaignId: string,
  accountIds: string[]
): Promise<void> => {
  const { error } = await supabase
    .from('campaign_email_accounts')
    .insert(accountIds.map(accountId => ({
      campaign_id: campaignId,
      email_account_id: accountId
    })));

  if (error) {
    throw new Error(error.message);
  }
};

export interface UpdateWarmupSettingsParams {
  emailAccountId: string;
  warmup_enabled?: boolean;
  warmup_filter_tag?: string | null;
  warmup_increase_per_day?: number;
  warmup_daily_limit?: number;
  warmup_status?: 'disabled' | 'enabled' | 'paused';
}

export const updateWarmupSettings = async (
  params: UpdateWarmupSettingsParams
): Promise<EmailAccount> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Verify the email account belongs to the user
  const { data: emailAccount, error: lookupError } = await supabase
    .from('email_accounts')
    .select('user_id')
    .eq('id', params.emailAccountId)
    .single();

  if (lookupError || !emailAccount || emailAccount.user_id !== user.id) {
    throw new Error('Email account not found or access denied');
  }

  const { data, error } = await supabase
    .from('email_accounts')
    .update({
      warmup_enabled: params.warmup_enabled,
      warmup_filter_tag: params.warmup_filter_tag,
      warmup_increase_per_day: params.warmup_increase_per_day,
      warmup_daily_limit: params.warmup_daily_limit,
      warmup_status: params.warmup_status,
      warmup_start_date: params.warmup_status === 'enabled' ? new Date().toISOString() : null
    })
    .eq('id', params.emailAccountId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getWarmupProgress = async (
  emailAccountId: string
): Promise<Array<{
  date: string;
  emails_sent: number;
  emails_received: number;
}>> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Verify the email account belongs to the user
  const { data: emailAccount, error: lookupError } = await supabase
    .from('email_accounts')
    .select('user_id')
    .eq('id', emailAccountId)
    .single();

  if (lookupError || !emailAccount || emailAccount.user_id !== user.id) {
    throw new Error('Email account not found or access denied');
  }

  const { data, error } = await supabase
    .from('email_warmup_progress')
    .select('date, emails_sent, emails_received')
    .eq('email_account_id', emailAccountId)
    .order('date', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

export const removeEmailAccountFromCampaign = async (
  campaignId: string,
  emailAccountId: string
): Promise<void> => {
  const { error } = await supabase
    .from('campaign_email_accounts')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('email_account_id', emailAccountId);

  if (error) {
    throw new Error(error.message);
  }
};

export const updateEmailAccount = async (
  accountId: string,
  updates: Partial<EmailAccount>
): Promise<EmailAccount> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Verify the email account belongs to the user
  const { data: emailAccount, error: lookupError } = await supabase
    .from('email_accounts')
    .select('user_id')
    .eq('id', accountId)
    .single();

  if (lookupError || !emailAccount || emailAccount.user_id !== user.id) {
    throw new Error('Email account not found or access denied');
  }

  // Clean updates to only allow valid fields
  const cleanUpdates: any = {};
  if (updates.name !== undefined) cleanUpdates.name = updates.name;
  if (updates.signature !== undefined) cleanUpdates.signature = updates.signature;
  if (updates.warmup_daily_limit !== undefined) cleanUpdates.warmup_daily_limit = updates.warmup_daily_limit;
  if (updates.warmup_increase_per_day !== undefined) cleanUpdates.warmup_increase_per_day = updates.warmup_increase_per_day;
  if (updates.warmup_filter_tag !== undefined) cleanUpdates.warmup_filter_tag = updates.warmup_filter_tag;

  const { data, error } = await supabase
    .from('email_accounts')
    .update(cleanUpdates)
    .eq('id', accountId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
