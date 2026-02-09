import { supabase } from '../supabase';
import { Lead } from '../../types/leads';
import { generateUUID } from '../utils/uuid';

export async function createLead(campaignId: string, lead: Lead) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('User not authenticated');

  // Verify campaign belongs to user
  const { data: campaign, error: verifyCampaignError } = await supabase
    .from('campaigns')
    .select('user_id')
    .eq('id', campaignId)
    .single();

  if (verifyCampaignError || !campaign || campaign.user_id !== user.id) {
    throw new Error('Campaign not found or unauthorized');
  }

  // Create lead with user_id
  const { data: newLead, error: leadError } = await supabase
    .from('leads')
    .insert({
      id: generateUUID(),
      user_id: user.id,
      ...lead
    })
    .select()
    .single();

  if (leadError) throw leadError;

  // Create campaign association
  const { error: createCampaignError } = await supabase
    .from('campaign_leads')
    .insert({
      campaign_id: campaignId,
      lead_id: newLead.id
    });

  if (createCampaignError) throw createCampaignError;
  return newLead;
}

export async function createLeads(campaignId: string, leads: Lead[]) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('User not authenticated');

  // Verify campaign exists and belongs to user
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, user_id')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single();

  if (campaignError || !campaign) {
    throw new Error('Campaign not found or unauthorized');
  }

  // Get existing leads by email
  const { data: existingLeads, error: existingLeadsError } = await supabase
    .from('leads')
    .select('id, email')
    .in('email', leads.map(lead => lead.email))
    .eq('user_id', user.id);

  if (existingLeadsError) throw existingLeadsError;

  const existingLeadMap = new Map(existingLeads.map(lead => [lead.email, lead.id]));

  // Prepare leads for upsert
  const leadsToUpsert = leads.map(lead => ({
    id: existingLeadMap.get(lead.email) || generateUUID(),
    user_id: user.id,
    campaign_id: campaignId,
    ...lead
  }));

  // Upsert leads
  const { data: upsertedLeads, error: upsertError } = await supabase
    .from('leads')
    .upsert(leadsToUpsert)
    .select();

  if (upsertError) throw upsertError;

  // Create campaign associations
  for (const lead of upsertedLeads) {
    try {
      await supabase
        .from('campaign_leads')
        .insert({
          campaign_id: campaignId,
          lead_id: lead.id
        });
    } catch (error: any) {
      // Ignore duplicate key errors (23505) since they just mean the lead is already in the campaign
      if (error?.code !== '23505') {
        throw error;
      }
    }
  }
  return upsertedLeads;
}

export async function fetchLeads(campaignId: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('User not authenticated');

  // Verify campaign belongs to user
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('user_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign || campaign.user_id !== user.id) {
    throw new Error('Campaign not found or unauthorized');
  }

  // Fetch leads with user verification
  const { data, error } = await supabase
    .from('campaign_leads')
    .select(`
      lead:leads (
        id,
        user_id,
        email,
        name,
        company,
        title,
        phone,
        linkedin,
        industry,
        location,
        employees,
        company_news,
        personalized_email,
        created_at
      )
    `)
    .eq('campaign_id', campaignId)
    .eq('leads.user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(row => Array.isArray(row.lead) ? row.lead[0] : row.lead).filter(Boolean);
}

export async function deleteLead(campaignId: string, leadId: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('User not authenticated');

  // Verify lead belongs to user
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('user_id')
    .eq('id', leadId)
    .single();

  if (leadError || !lead || lead.user_id !== user.id) {
    throw new Error('Lead not found or unauthorized');
  }

  // Verify campaign belongs to user
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('user_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign || campaign.user_id !== user.id) {
    throw new Error('Campaign not found or unauthorized');
  }

  // Delete campaign association
  const { error } = await supabase
    .from('campaign_leads')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('lead_id', leadId);

  if (error) throw error;
}
