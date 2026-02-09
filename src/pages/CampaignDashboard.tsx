import { useState, useEffect } from 'react';
import { Title } from '../components/ui/title';
import { supabase } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/layout/PageHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AlertCircle } from 'lucide-react';
import CampaignStats from '../components/campaign/CampaignStats';
import CampaignTabs from '../components/campaign/CampaignTabs';
import LeadsTable from '../components/campaign/LeadsTable';
import SequenceEditor from '../components/campaign/SequenceEditor';
import ScheduleEditor from '../components/campaign/schedule/ScheduleEditor';
import SavedLists from '../components/campaign/SavedLists';
import CampaignEmails from '../components/campaign/CampaignEmails';
import CampaignInbox from '../components/campaign/CampaignInbox';
import BackButton from '../components/common/BackButton';
import ProgressTab from '../components/campaign/ProgressTab';
import OptionsTab from '../components/campaign/OptionsTab';
import { Card } from '../components/ui/card';

interface CampaignDashboardProps {
  onScheduleChange?: () => void;
}

const CampaignDashboard = ({ onScheduleChange }: CampaignDashboardProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campaigns, updateCampaign, deleteCampaign } = useApp();
  const [activeTab, setActiveTab] = useState('analytics');
  const [refreshLeads, setRefreshLeads] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [hasScheduledEntries, setHasScheduledEntries] = useState(false);
  const campaign = campaigns.find(c => c.id === id);

  const checkScheduledEntries = async () => {
    if (!campaign) return;

    // Check if there are any scheduled entries for this campaign
    const { data: schedules, error } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('campaign_id', campaign.id);

    if (!error && schedules && schedules.length > 0) {
      setHasScheduledEntries(true);
      if (campaign.status === 'Draft') {
        updateCampaign(campaign.id, { status: 'in_progress' });
      }
    } else {
      setHasScheduledEntries(false);
      if (campaign.status === 'in_progress') {
        updateCampaign(campaign.id, { status: 'Draft' });
      }
    }
  };

  useEffect(() => {
    checkScheduledEntries();
  }, [campaign, isScheduled]);

  // Add additional effect to handle immediate updates
  useEffect(() => {
    if (onScheduleChange) {
      checkScheduledEntries();
    }
  }, [onScheduleChange]);

  useEffect(() => {
    if (campaign?.status === 'scheduled') {
      updateCampaign(campaign.id, { status: 'in_progress' });
      setIsScheduled(true);
    }
  }, [campaign?.status]);


  // ... (existing helper functions)

  if (!campaign) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <div className="bg-muted p-6 rounded-full mb-6">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
          </div>
          <Title className="text-foreground text-2xl mb-2">Campaign not found</Title>
          <p className="text-muted-foreground max-w-md mx-auto">
            The campaign you're looking for doesn't exist or you don't have access to it.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-8 px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  const handleLeadsRefresh = () => {
    setRefreshLeads(prev => !prev);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <CampaignStats campaignId={campaign.id} />;
      case 'leads':
        return (
          <div className="space-y-6">
            <SavedLists
              campaignId={campaign.id}
              onLeadsAdded={handleLeadsRefresh}
            />
            <LeadsTable
              campaignId={campaign.id}
              refreshTrigger={refreshLeads}
            />
          </div>
        );
      case 'sequences':
        return <SequenceEditor />;
      case 'schedule':
        return (
          <div className="space-y-6">
            <ScheduleEditor
              campaignId={campaign.id}
              onScheduleChange={() => checkScheduledEntries()}
            />
            {isScheduled && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Campaign Progress</h3>
                <ProgressTab campaignId={campaign.id} />
              </Card>
            )}
          </div>
        );
      case 'emails':
        return <CampaignEmails campaignId={campaign.id} />;
      case 'inbox':
        return <CampaignInbox campaignId={campaign.id} />;
      case 'progress':
        return <ProgressTab campaignId={campaign.id} />;
      case 'options':
        return (
          <OptionsTab
            campaignName={campaign.name}
            onNameChange={(newName) => updateCampaign(campaign.id, { name: newName })}
            onDelete={() => deleteCampaign(campaign.id)}
          />
        );
      default:
        return <CampaignStats campaignId={campaign.id} />;
    }
  };

  return (
    <Layout>
      <div className="mb-4">
        <BackButton onClick={() => navigate('/dashboard')} />
      </div>

      <PageHeader
        title={campaign.name}
        description={activeTab === 'analytics' ? 'Campaign Overview' : `Manage ${activeTab}`}
      >
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 ${hasScheduledEntries
          ? 'bg-primary/10 text-primary border-primary/20'
          : 'bg-muted text-muted-foreground border-border'
          }`}>
          <div className={`w-2 h-2 rounded-full ${hasScheduledEntries ? 'bg-primary animate-pulse' : 'bg-muted-foreground/50'}`} />
          {hasScheduledEntries ? 'In Progress' : 'Draft'}
        </div>
      </PageHeader>

      <CampaignTabs active={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {renderTabContent()}
      </div>
    </Layout>
  );
};

export default CampaignDashboard;
