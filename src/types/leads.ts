export interface Lead {
  id?: string;
  user_id?: string;
  email: string;
  name?: string;
  company?: string;
  title?: string;
  phone?: string;
  linkedin?: string;
  industry?: string;
  location?: string;
  employees?: string;
  company_news?: string;
  created_at?: string;
  personalized_email?: string;
  website?: string;
  summary?: string;
}

export interface CampaignLead {
  campaign_id: string;
  lead_id: string;
}

export interface ListLead {
  list_id: string;
  lead_id: string;
}
