import { supabase } from '../supabase';
import { generateUUID } from '../utils/uuid';
import { Lead } from '../../types';

export async function createList(name: string, rawLeads: Lead[]) {
  // Deduplicate leads by email to prevent unique constraint violations
  const leads = Array.from(new Map(rawLeads.map(lead => [lead.email, lead])).values());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Create the list first
  const { data: list, error: listError } = await supabase
    .from('saved_lists')
    .insert({
      id: generateUUID(),
      user_id: user.id,
      name,
    })
    .select()
    .single();

  if (listError) throw listError;

  // Check for existing leads by email to avoid duplicates
  const emails = leads.map(lead => lead.email);
  const { data: existingLeads, error: existingError } = await supabase
    .from('leads')
    .select('id, email')
    .in('email', emails);

  if (existingError) throw existingError;

  // Create a map of existing leads by email
  const existingLeadsMap = new Map(
    existingLeads?.map(lead => [lead.email, lead.id]) || []
  );

  // Filter out new leads that need to be created
  const newLeads = leads.filter(lead => !existingLeadsMap.has(lead.email));

  // Insert new leads if any
  let allLeadIds: string[] = [];
  
  if (newLeads.length > 0) {
    const { data: insertedLeads, error: leadsError } = await supabase
      .from('leads')
      .insert(
        newLeads.map(lead => {
          // Remove temporary ID and any non-DB fields like snippet (from scraper)
          const { id: _tempId, snippet, ...leadData } = lead as any;
          return {
            id: generateUUID(),
            user_id: user.id,
            ...leadData
          };
        })
      )
      .select('id, email');

    if (leadsError) throw leadsError;
    
    // Add newly inserted lead IDs to the map
    insertedLeads?.forEach(lead => existingLeadsMap.set(lead.email, lead.id));
  }

  // Get all lead IDs (both existing and new)
  allLeadIds = leads.map(lead => existingLeadsMap.get(lead.email)!);

  // Create list associations
  const { error: listLeadsError } = await supabase
    .from('list_leads')
    .insert(
      allLeadIds.map(leadId => ({
        list_id: list.id,
        lead_id: leadId
      }))
    );

  if (listLeadsError) throw listLeadsError;

  return list;
}

export async function fetchLists() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('saved_lists')
    .select(`
      *,
      list_leads (
        lead:leads (*)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteList(listId: string) {
  const { error } = await supabase
    .from('saved_lists')
    .delete()
    .eq('id', listId);

  if (error) throw error;
}

export async function addListToCampaign(listId: string, campaignId: string) {
  // Verify campaign belongs to authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('user_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign || campaign.user_id !== user.id) {
    throw new Error('Campaign not found or unauthorized');
  }

  // Get all leads from the list
  const { data: listLeads, error: listError } = await supabase
    .from('list_leads')
    .select('lead:leads (*)')
    .eq('list_id', listId);

  if (listError) throw listError;
  if (!listLeads || listLeads.length === 0) return 0;

  // Get all existing leads in the campaign to deduplicate by email and ID
  // We use !inner to ensure we ignore any broken relationships
  const { data: existingCampaignLeads, error: existingError } = await supabase
    .from('campaign_leads')
    .select('lead_id, lead:leads!inner (email)')
    .eq('campaign_id', campaignId);

  if (existingError) throw existingError;

  // Create sets for existing IDs and Emails
  const existingIds = new Set(existingCampaignLeads?.map(item => item.lead_id));
  const existingEmails = new Set(
    existingCampaignLeads?.map((item: any) => item.lead?.email?.toLowerCase()).filter(Boolean) || []
  );

  // Filter out leads where the ID or email is already in the campaign
  const newAssociations = listLeads
    .filter((item: any) => {
      const lead = item.lead;
      
      // Check ID first
      if (existingIds.has(lead.id)) return false;

      // Check Email
      const email = lead?.email?.toLowerCase();
      if (email && existingEmails.has(email)) return false;

      return true;
    })
    .map((item: any) => ({
      campaign_id: campaignId,
      lead_id: item.lead.id
    }));

  // Add new associations if any
  if (newAssociations.length > 0) {
    const { error: insertError } = await supabase
      .from('campaign_leads')
      .insert(newAssociations);

    if (insertError) throw insertError;
  }

  return newAssociations.length;
}


export async function removeListFromCampaign(listId: string, campaignId: string) {
  // Get all leads from the list
  const { data: listLeads, error: listError } = await supabase
    .from('list_leads')
    .select('lead_id')
    .eq('list_id', listId);

  if (listError) throw listError;

  // Remove leads from campaign
  const { error: campaignError } = await supabase
    .from('campaign_leads')
    .delete()
    .eq('campaign_id', campaignId)
    .in('lead_id', listLeads.map(l => l.lead_id));

  if (campaignError) throw campaignError;
}

export async function removeDuplicatesFromList(listId: string) {
  // Get all leads in the list
  const { data: listLeads, error: listError } = await supabase
    .from('list_leads')
    .select(`
      id,
      lead_id,
      lead:leads (
        id,
        email
      )
    `)
    .eq('list_id', listId);

  if (listError) throw listError;
  if (!listLeads || listLeads.length === 0) return 0;

  // Group by email to find duplicates
  const emailMap = new Map<string, any[]>();
  
  listLeads.forEach((item: any) => {
    const email = item.lead?.email?.toLowerCase();
    if (email) {
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email)!.push(item);
    }
  });

  const idsToRemove: string[] = [];

  // For each email, keep one and remove the rest
  emailMap.forEach((items) => {
    if (items.length > 1) {
      // Sort by some criteria if needed, or just keep the first one
      // Here we keep the first one and remove the rest
      const [_keep, ...remove] = items;
      remove.forEach(item => idsToRemove.push(item.id)); // Removing the list_leads association ID
    }
  });

  if (idsToRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('list_leads')
      .delete()
      .in('id', idsToRemove);

    if (deleteError) throw deleteError;
  }

  return idsToRemove.length;
}

export async function removeLeadFromList(listId: string, leadId: string) {
  const { error } = await supabase
    .from('list_leads')
    .delete()
    .eq('list_id', listId)
    .eq('lead_id', leadId);

  if (error) throw error;
}
