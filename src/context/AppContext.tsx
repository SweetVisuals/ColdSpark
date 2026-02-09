import React, { createContext, useContext, useState, useEffect } from 'react';
import { Campaign, EmailAccount } from '../types';
import * as campaignApi from '../lib/api/campaigns';
import * as emailAccountsApi from '../lib/api/email-accounts';
import { useAuth } from './AuthContext';

interface AppContextType {
  campaigns: Campaign[];
  emailAccounts: EmailAccount[];
  addCampaign: (campaign: Omit<Campaign, 'id'>) => Promise<Campaign>;
  updateCampaign: (id: string, campaign: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  addEmailAccount: (account: EmailAccount) => void;
  updateEmailAccount: (id: string, account: Partial<EmailAccount>) => void;
  deleteEmailAccount: (id: string) => void;
  loading: boolean;
  error: Error | null;
  retry: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await campaignApi.fetchCampaigns();
      setCampaigns(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load campaigns'));
    } finally {
      setLoading(false);
    }
  };

  const loadEmailAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await emailAccountsApi.fetchEmailAccounts();
      setEmailAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load email accounts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCampaigns();
      loadEmailAccounts();
    }
  }, [user]);

  const addCampaign = async (campaign: Omit<Campaign, 'id'>) => {
    const newCampaign = await campaignApi.createCampaign(campaign);
    setCampaigns([newCampaign, ...campaigns]);
    return newCampaign;
  };

  const updateCampaign = async (id: string, updatedCampaign: Partial<Campaign>) => {
    await campaignApi.updateCampaign(id, updatedCampaign);
    setCampaigns(campaigns.map(campaign =>
      campaign.id === id ? { ...campaign, ...updatedCampaign } : campaign
    ));
  };

  const deleteCampaign = async (id: string) => {
    await campaignApi.deleteCampaign(id);
    setCampaigns(campaigns.filter(campaign => campaign.id !== id));
  };

  const addEmailAccount = async (account: EmailAccount) => {
    try {
      const createdAccount = await emailAccountsApi.createEmailAccount({
        email: account.email,
        name: account.name,
        imap_host: account.imap_host,
        imap_port: account.imap_port,
        smtp_host: account.smtp_host,
        smtp_port: account.smtp_port,
        user_id: user?.id || '',
        encrypted_password: account.encrypted_password
      });
      setEmailAccounts([...emailAccounts, createdAccount]);
    } catch (error) {
      console.error('Error adding email account:', error);
      throw error;
    }
  };

  const updateEmailAccount = async (id: string, updatedAccount: Partial<EmailAccount>) => {
    try {
      // Update in Supabase first
      const updated = await emailAccountsApi.updateWarmupSettings({
        emailAccountId: id,
        ...updatedAccount
      });

      // Then update local state
      setEmailAccounts(emailAccounts.map(account =>
        account.id === id ? { ...account, ...updated } : account
      ));
    } catch (error) {
      console.error('Error updating email account:', error);
      throw error;
    }
  };

  const deleteEmailAccount = async (id: string) => {
    try {
      await emailAccountsApi.deleteEmailAccount(id);
      setEmailAccounts(emailAccounts.filter(account => account.id !== id));
    } catch (error) {
      console.error('Error deleting email account:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      campaigns,
      emailAccounts,
      addCampaign,
      updateCampaign,
      deleteCampaign,
      addEmailAccount,
      updateEmailAccount,
      deleteEmailAccount,
      loading,
      error,
      retry: async () => {
        await Promise.all([loadCampaigns(), loadEmailAccounts()]);
      }
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
