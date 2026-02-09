export interface Campaign {
  id: string;
  name: string;
  status: 'Active' | 'Paused' | 'Draft' | 'scheduled' | 'in_progress';
  prospects: string;
  replies: string;
  openRate: string;
  niche?: string;
  emailTemplate?: string;
  schedule?: {
    frequency: 'daily' | 'weekly';
    maxEmailsPerDay: number;
  };
  company_name?: string;
  contact_number?: string;
  primary_email?: string;
}

export interface EmailAccount {
  id: string;
  user_id: string;
  email: string;
  name: string;
  imap_host: string;
  imap_port: string;
  smtp_host: string;
  smtp_port: string;
  created_at: string;
  warmup_enabled: boolean;
  warmup_filter_tag: string | null;
  warmup_increase_per_day: number;
  warmup_daily_limit: number;
  warmup_status: 'enabled' | 'paused' | 'disabled';
  emailsSent?: number;
  warmupEmails?: number;
  healthScore?: string;
  warmup_start_date: string | null;
  warmupEmailsReceived?: number;
  warmupEmailsSent?: number;
  spamSaved?: number;
  warmupStats?: {
    received: Record<string, number>;
    sent: Record<string, number>;
  };
  signature?: string;
  smtp_password: string;
  password: string;
  encrypted_password?: string;
  company?: string;
  phone_number?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

export interface CampaignStat {
  label: string;
  value: string;
  percentage?: string;
  separator?: boolean;
  money?: string;
}

export interface Lead {
  id: string;
  email: string;
  name: string;
  company: string;
  title: string;
  role?: string;
  phone?: string;
  linkedin?: string;
  industry?: string;
  location?: string;
  employees?: string;
  company_news?: string;
  website?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  source?: string;
  status?: string;
  summary?: string;
  personalized_email?: string;
  validation_status?: 'valid' | 'invalid' | 'warning';
  validation_details?: string;
}

export interface EmailMessage {
  id: string;
  uid: number;
  accountId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  folder: 'inbox' | 'sent' | 'archive';
  isRead: boolean;
  text?: string;
  html?: string;
}
