import { DbCampaign } from '../../types/database';
import { Campaign } from '../../types';

export function transformDbCampaignToFrontend(dbCampaign: DbCampaign): Campaign {
  return {
    id: dbCampaign.id,
    name: dbCampaign.name,
    status: dbCampaign.status as any,
    niche: dbCampaign.niche,
    schedule: dbCampaign.schedule,
    prospects: String(dbCampaign.prospects),
    replies: String(dbCampaign.replies),
    openRate: `${dbCampaign.open_rate}%`,
    company_name: dbCampaign.company_name,
    contact_number: dbCampaign.contact_number,
    primary_email: dbCampaign.primary_email
  };
}

export function transformFrontendCampaignToDb(campaign: Partial<Campaign>): Partial<DbCampaign> {
  const { openRate, prospects, replies, ...rest } = campaign;
  
  return {
    ...rest,
    open_rate: openRate ? parseFloat(openRate.replace('%', '')) : 0,
    prospects: prospects ? parseInt(prospects, 10) : 0,
    replies: replies ? parseInt(replies, 10) : 0,
    company_name: campaign.company_name,
    contact_number: campaign.contact_number,
    primary_email: campaign.primary_email
  };
}
