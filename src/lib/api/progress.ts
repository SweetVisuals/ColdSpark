import { supabase } from '../supabase';
import { Database } from '../../types/database';

type Progress = Database['public']['Tables']['campaign_progress']['Row'];

export const getCampaignProgress = async (campaignId: string) => {
  const { data, error } = await supabase
    .from('campaign_progress')
    .select('*')
    .eq('campaign_id', campaignId);

  if (error) throw error;
  return data;
};

export const getEmailAccountsProgress = async (campaignId: string) => {
  const { data, error } = await supabase
    .from('email_accounts')
    .select('id, email, campaign_progress!inner(*)')
    .eq('campaign_progress.campaign_id', campaignId);

  if (error) throw error;
  return data;
};

export const getLeadsProgress = async (campaignId: string) => {
  const { data, error } = await supabase
    .from('leads')
    .select('id, email, campaign_progress!inner(*)')
    .eq('campaign_progress.campaign_id', campaignId);

  if (error) throw error;
  return data;
};
