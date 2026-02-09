import { supabase } from '../supabase.js';
import { EmailTemplate } from '../../types/index.js';
import { toast } from '../../components/ui/use-toast.js';

export async function fetchTemplates(campaignId: string) {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching templates:', error);
    toast({
      title: "Error",
      description: "Failed to load templates",
      variant: "destructive"
    });
    return [];
  }
}

export async function createTemplate(campaignId: string, template: Omit<EmailTemplate, 'id'>) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    console.log('Creating template:', { campaignId, template });
    const { data, error } = await supabase
      .from('templates')
      .insert({
        campaign_id: campaignId,
        name: template.name || '',
        subject: template.subject || '',
        content: template.content || ''
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating template:', error);
    toast({
      title: "Error",
      description: "Failed to create template",
      variant: "destructive"
    });
    throw error;
  }
}

export async function updateTemplate(campaignId: string, template: EmailTemplate) {
  try {
    const { data, error } = await supabase
      .from('templates')
      .update({
        name: template.name || '',
        subject: template.subject || '',
        content: template.content || ''
      })
      .eq('id', template.id)
      .eq('campaign_id', campaignId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating template:', error);
    toast({
      title: "Error",
      description: "Failed to update template",
      variant: "destructive"
    });
    throw error;
  }
}

export async function deleteTemplate(campaignId: string, templateId: string) {
  try {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId)
      .eq('campaign_id', campaignId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting template:', error);
    toast({
      title: "Error",
      description: "Failed to delete template",
      variant: "destructive"
    });
    throw error;
  }
}
