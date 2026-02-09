import { useEffect, useState } from 'react';
import { CampaignStat } from '../../types';
import { Card, CardContent } from '../ui/card';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

interface CampaignStatsProps {
  campaignId?: string;
}

const CampaignStats = ({ campaignId }: CampaignStatsProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CampaignStat[]>([
    { label: 'Sequence started', value: '0%' },
    { label: 'Open rate', value: '0', percentage: '0%' },
    { label: 'Click rate', value: '0', percentage: '0%' },
    { label: 'Opportunities', value: '0', money: '$0' },
    { label: 'Conversions', value: '0', money: '$0' }
  ]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!campaignId) return;

      try {
        setLoading(true);

        // Fetch campaign data for open rate
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('open_rate')
          .eq('id', campaignId)
          .single();

        // Fetch leads count for Opportunities and Conversions
        // Get all leads associated with this campaign
        const { data: campaignLeads } = await supabase
          .from('campaign_leads')
          .select('lead_id')
          .eq('campaign_id', campaignId);

        const leadIds = campaignLeads?.map(cl => cl.lead_id) || [];

        let opportunities = 0;
        let conversions = 0;
        let totalLeads = leadIds.length;

        if (leadIds.length > 0) {
          const { data: leadsData } = await supabase
            .from('leads')
            .select('status')
            .in('id', leadIds);

          if (leadsData) {
            opportunities = leadsData.filter(l =>
              ['Opportunity', 'Active', 'Interested', 'Meeting Booked'].includes(l.status || '')
            ).length;

            conversions = leadsData.filter(l =>
              ['Converted', 'Closed', 'Client', 'Deal Won'].includes(l.status || '')
            ).length;
          }
        }

        // Fetch sent count from campaign_progress
        const { count: sentCount } = await supabase
          .from('campaign_progress')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
          .eq('status', 'sent');

        // Calculate sequence started percentage
        const sequenceStarted = totalLeads > 0
          ? Math.round(((sentCount || 0) / totalLeads) * 100)
          : 0;

        // Calculate open rate percentage (using campaign data or progress data if we had tracking)
        // For now using the campaign.open_rate is fine as it's likely updated by a webhook or backend process
        const openRate = campaign?.open_rate || 0;

        // Calculate actual opens count (extrapolated for now from rate + sent, or 0 if no tracking table)
        // Since we don't have a specific 'opens' table yet, we'll display the rate
        const opensCount = Math.round((sentCount || 0) * (openRate / 100));

        setStats([
          {
            label: 'Sequence started',
            value: `${sequenceStarted}%`,
            percentage: `${sentCount || 0}/${totalLeads} leads`
          },
          {
            label: 'Open rate',
            value: `${opensCount}`,
            percentage: `${openRate}%`
          },
          {
            label: 'Click rate',
            value: '0',
            percentage: '0%'
          },
          {
            label: 'Opportunities',
            value: opportunities.toString(),
            money: '$0' // We don't have deal value yet
          },
          {
            label: 'Conversions',
            value: conversions.toString(),
            money: '$0'
          }
        ]);

        setHasData(totalLeads > 0);

      } catch (error) {
        console.error('Error fetching campaign stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const StatItem = ({ label, value, percentage, money }: CampaignStat) => (
    <div className="text-center group transition-all duration-300 hover:scale-105">
      {percentage ? (
        <>
          <div className="text-3xl font-bold text-foreground mb-1">
            {value}
          </div>
          <div className="text-sm text-muted-foreground mb-1">
            {percentage}
          </div>
        </>
      ) : (
        <div className="text-3xl font-bold text-foreground mb-1">
          {value}
        </div>
      )}
      {money && (
        <div className="text-sm text-muted-foreground mb-1">{money}</div>
      )}
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );

  return (
    <>
      <Card className="bg-card border-border shadow-xl">
        <CardContent className="p-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {stats.map((stat) => (
              <StatItem key={stat.label} {...stat} />
            ))}
          </div>
        </CardContent>
      </Card>

      {!hasData && (
        <Card className="mt-8 bg-card border-border border-dashed shadow-none">
          <CardContent className="p-12 flex flex-col items-center justify-center min-h-[200px] text-center">
            <div className="text-muted-foreground mb-2">
              No data available yet
            </div>
            <p className="text-xs text-muted-foreground/60 max-w-[250px]">
              Stats will appear here once you add leads and your campaign starts sending emails.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default CampaignStats;
