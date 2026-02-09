import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TemplateList from './sequence/TemplateList';
import TemplateEditor from './sequence/TemplateEditor';
import { EmailTemplate, Campaign, Lead } from '../../types';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/api/templates';
import { fetchLeads } from '@/lib/api/leads';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { useApp } from '@/context/AppContext';
import { Sparkles, Building2, Mail, Loader2, Users, ChevronRight, Zap } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

const SequenceEditor = () => {
  const { id: campaignId } = useParams();
  const { campaigns, updateCampaign, emailAccounts } = useApp();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);

  const campaign = campaigns.find(c => c.id === campaignId);

  useEffect(() => {
    if (campaignId) {
      loadTemplates();
      loadLeads();
    }
  }, [campaignId]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await fetchTemplates(campaignId!);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeads = async () => {
    if (!campaignId) return;
    try {
      const data = await fetchLeads(campaignId) as Lead[];
      setLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const handleCampaignUpdate = async (field: keyof Campaign, value: string) => {
    if (!campaignId) return;
    try {
      await updateCampaign(campaignId, { [field]: value });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update campaign settings",
        variant: "destructive"
      });
    }
  };

  const generateAISequences = async () => {
    if (!campaign) return;

    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:3001/api/generate-sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: campaign.name,
          niche: campaign.niche || 'General Business',
          company: campaign.company_name,
          contactNumber: campaign.contact_number,
          primaryEmail: campaign.primary_email,
          count: 5
        })
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error);

      console.log('Generated sequences:', result.data);

      const newTemplates = [];
      let validCount = 0;

      for (const seq of result.data) {
        if (!seq.name || !seq.subject || !seq.content) {
          console.warn('Skipping invalid sequence:', seq);
          continue;
        }

        const matchingAccount = emailAccounts.find(acc => acc.email === campaign.primary_email);
        const senderName = matchingAccount?.name || campaign.primary_email?.split('@')[0] || 'Sender';

        const signature = `\n\n{ender}\n<company>\n\n${senderName}\n${campaign.primary_email}\n${campaign.contact_number || ''}`;

        const template = await createTemplate(campaignId!, {
          name: seq.name,
          subject: seq.subject,
          content: seq.content + signature
        });
        newTemplates.push(template);
        validCount++;
      }

      if (validCount === 0) {
        throw new Error('AI generated sequences but they were invalid or empty. Please try again.');
      }

      setTemplates([...templates, ...newTemplates]);
      toast({
        title: "Success",
        description: `Generated ${result.data.length} templates.`
      });
    } catch (error) {
      toast({
        title: "AI Generation Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBulkPersonalize = async () => {
    if (!selectedTemplate || !leads.length || !campaign) {
      toast({
        title: "Missing data",
        description: "Ensure you have a template selected and leads in this campaign.",
        variant: "destructive"
      });
      return;
    }

    setIsPersonalizing(true);
    try {
      const response = await fetch('http://localhost:3001/api/generate-lead-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          templateId: selectedTemplate.id,
          templateSubject: selectedTemplate.subject,
          templateContent: selectedTemplate.content,
          leads: leads.map(l => ({
            id: l.id,
            name: l.name,
            company: l.company,
            summary: l.company_news || '' // Mapping company_news to summary/notes
          })),
          company: campaign.company_name,
          contactNumber: campaign.contact_number,
          primaryEmail: campaign.primary_email
        })
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error);

      for (const item of result.data) {
        if (item.error) continue;

        await supabase
          .from('leads')
          .update({ personalized_email: item.content })
          .eq('id', item.leadId);
      }

      toast({
        title: "Personalization Complete",
        description: `Generated unique emails for ${result.data.filter((r: any) => !r.error).length} leads.`
      });
      loadLeads(); // Refresh leads to show progress
    } catch (error) {
      toast({
        title: "Personalization Failed",
        description: error instanceof Error ? error.message : "Failed to personalize emails",
        variant: "destructive"
      });
    } finally {
      setIsPersonalizing(false);
    }
  };

  const createNewTemplate = () => {
    const newTemplate: EmailTemplate = {
      id: crypto.randomUUID(),
      name: '',
      subject: '',
      content: '',
    };
    setSelectedTemplate(newTemplate);
  };

  const handleSave = async () => {
    if (!selectedTemplate || !campaignId) return;
    try {
      if (templates.find(t => t.id === selectedTemplate.id)) {
        await updateTemplate(campaignId, selectedTemplate);
        setTemplates(templates.map(t => t.id === selectedTemplate.id ? selectedTemplate : t));
      } else {
        const newTemplate = await createTemplate(campaignId, selectedTemplate);
        setTemplates([...templates, newTemplate]);
      }
      toast({ title: "Success", description: "Template saved successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate || !campaignId) return;
    try {
      await deleteTemplate(campaignId, selectedTemplate.id);
      setTemplates(templates.filter(t => t.id !== selectedTemplate.id));
      setSelectedTemplate(null);
      toast({ title: "Success", description: "Template deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm p-6 border border-border animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="h-40 bg-muted rounded"></div>
      </div>
    );
  }

  const leadsWithPersonalizedEmail = leads.filter(l => !!l.personalized_email).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 p-6 border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Campaign Identity</h3>
              <p className="text-xs text-muted-foreground">These details will be used for your &lt;placeholder&gt; tags</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1">Company Name</Label>
              <Input
                value={campaign?.company_name || ''}
                onChange={(e) => handleCampaignUpdate('company_name', e.target.value)}
                placeholder="e.g. ColdSpark AI"
                className="bg-background/50 border-border focus:ring-primary/20 transition-all h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1">Phone Number</Label>
              <Input
                value={campaign?.contact_number || ''}
                onChange={(e) => handleCampaignUpdate('contact_number', e.target.value)}
                placeholder="+1..."
                className="bg-background/50 border-border focus:ring-primary/20 transition-all h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1">Sender Email</Label>
              <Input
                value={campaign?.primary_email || ''}
                onChange={(e) => handleCampaignUpdate('primary_email', e.target.value)}
                placeholder="hello@..."
                className="bg-background/50 border-border focus:ring-primary/20 transition-all h-11 rounded-xl"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-16 h-16 text-primary" />
          </div>
          <div className="relative z-10 w-full">
            <div className="bg-primary/20 p-2.5 rounded-2xl w-fit mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-bold mb-1">Generate</h3>
            <p className="text-[10px] text-muted-foreground mb-6 uppercase tracking-wider font-semibold">AI Writing Studio</p>
            <Button
              onClick={generateAISequences}
              disabled={isGenerating || !campaign?.company_name}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/30 py-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ChevronRight className="w-5 h-5 mr-1" />}
              {isGenerating ? 'Writing...' : 'Draft Sequences'}
            </Button>
            {!campaign?.company_name && (
              <div className="mt-3 py-1 px-3 bg-destructive/10 rounded-full border border-destructive/20 w-fit mx-auto">
                <p className="text-[9px] text-destructive font-bold uppercase tracking-tighter">Enter company details first</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl shadow-xl flex border border-border overflow-hidden min-h-[650px] relative">
        <TemplateList
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelect={setSelectedTemplate}
          onCreateNew={createNewTemplate}
        />

        <div className="flex-1 flex flex-col bg-background/30">
          {selectedTemplate ? (
            <>
              <div className="px-6 py-4 border-b border-border bg-card/40 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20 ring-4 ring-primary/5">
                    <Users className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">Personalization Engine</p>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{leadsWithPersonalizedEmail}/{leads.length} Personalized</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">Writing individual emails based on lead notes</p>
                  </div>
                </div>
                <Button
                  onClick={handleBulkPersonalize}
                  disabled={isPersonalizing || !leads.length}
                  className="bg-background hover:bg-muted border-border text-foreground font-bold rounded-xl px-5 py-2 h-10 shadow-sm border"
                >
                  {isPersonalizing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Zap className="w-3 h-3 mr-2 text-primary fill-primary" />}
                  {isPersonalizing ? 'Processing...' : 'Personalize All'}
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <TemplateEditor
                  template={selectedTemplate}
                  onChange={setSelectedTemplate}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                <div className="relative p-8 bg-card border border-border rounded-3xl shadow-2xl">
                  <Mail className="w-12 h-12 opacity-10" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="font-bold text-foreground">Drafting Workspace</p>
                <p className="text-sm max-w-xs mx-auto text-muted-foreground/70">Pick a sequence from the left sidebar or use the Generate engine to draft 5 variants instantly.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SequenceEditor;
