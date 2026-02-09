export type DbCampaign = Database['public']['Tables']['campaigns']['Row'] & {
  niche?: string;
  schedule?: any;
  prospects: number;
  replies: number;
  open_rate: number;
  company_name?: string;
  contact_number?: string;
  primary_email?: string;
};

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string;
          name: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          status: string;
        };
        Insert: {
          id?: string;
          name: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          status?: string;
        };
        Update: {
          id?: string;
          name?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          status?: string;
        };
      };
      campaign_progress: {
        Row: {
          id: string;
          campaign_id: string;
          email_account_id: string;
          lead_id: string;
          status: 'pending' | 'sent' | 'failed';
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          email_account_id: string;
          lead_id: string;
          status: 'pending' | 'sent' | 'failed';
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          email_account_id?: string;
          lead_id?: string;
          status?: 'pending' | 'sent' | 'failed';
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_warmup_progress: {
        Row: {
          id: string;
          email_account_id: string;
          date: string;
          emails_sent: number;
          emails_received: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email_account_id: string;
          date: string;
          emails_sent?: number;
          emails_received?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email_account_id?: string;
          date?: string;
          emails_sent?: number;
          emails_received?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
