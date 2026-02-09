import React, { useState, useEffect } from 'react';
import { EmailAccount } from '../../types';
import { X, User, Send, Activity, Trash2 } from 'lucide-react';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import WarmupTab from './sidebar/WarmupTab';
import SettingsTab from './sidebar/SettingsTab';
import CampaignsTab from './sidebar/CampaignsTab';
import { toast } from '../ui/use-toast';
import { fetchEmailAccounts, updateWarmupSettings } from '../../lib/api/email-accounts';

interface EmailAccountSidebarProps {
  account: EmailAccount;
  onClose: () => void;
  onToggleWarmup?: (account: EmailAccount, e: React.MouseEvent, resume?: boolean) => void;
  onDeleteAccount?: (account: EmailAccount) => Promise<void>;
}

const EmailAccountSidebar = ({ account, onClose, onToggleWarmup, onDeleteAccount }: EmailAccountSidebarProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(account);
  const [activeTab, setActiveTab] = useState('warmup');

  // Fetch latest account data on mount and when account prop changes
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const accounts = await fetchEmailAccounts();
        const updatedAccount = accounts.find(a => a.id === account.id);
        if (updatedAccount) {
          setCurrentAccount(updatedAccount);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to fetch account data',
          variant: 'destructive',
        });
      }
    };

    fetchAccount();
  }, [account.id]);

  const handleToggleWarmup = async (account: EmailAccount, e: React.MouseEvent, resume?: boolean) => {
    try {
      const currentStatus = account.warmup_status || 'disabled';
      const nextStatus: 'enabled' | 'paused' | 'disabled' =
        resume ? 'enabled' :
          currentStatus === 'disabled' ? 'enabled' :
            currentStatus === 'enabled' ? 'paused' : 'disabled';

      const updates = {
        warmup_status: nextStatus,
        warmup_start_date: nextStatus === 'enabled' ? new Date().toISOString() :
          nextStatus === 'disabled' ? null : account.warmup_start_date
      };

      const updatedAccount = await updateWarmupSettings({
        emailAccountId: account.id,
        ...updates
      });

      // Update both local state and parent component
      setCurrentAccount(updatedAccount);

      if (onToggleWarmup) {
        onToggleWarmup(updatedAccount, e, resume);
      }

      // Force re-render of WarmupTab by updating activeTab state - trick to refresh
      setActiveTab(prev => {
        return prev; // No need to switch tabs if we update state correctly
      });

      toast({
        title: 'Success',
        description: `Warmup ${nextStatus === 'enabled' ? 'enabled' : 'paused'} successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update warmup status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      if (onDeleteAccount) {
        await onDeleteAccount(account);
        toast({
          title: 'Success',
          description: 'Email account deleted successfully',
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete email account',
        variant: 'destructive',
      });
    }
  };

  const tabs = [
    { id: 'warmup', label: 'Warmup', icon: Activity },
    { id: 'settings', label: 'Settings', icon: User },
    { id: 'campaigns', label: 'Campaigns', icon: Send },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'warmup':
        return <WarmupTab account={currentAccount} onToggleWarmup={handleToggleWarmup} />;
      case 'settings':
        return <SettingsTab account={currentAccount} onUpdate={setCurrentAccount} />;
      case 'campaigns':
        return <CampaignsTab account={currentAccount} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 w-[600px] bg-background shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
        <div className="p-6 flex-shrink-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">{currentAccount.email}</h2>
              <p className="text-sm text-muted-foreground mt-1">{currentAccount.name || 'No name set'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete account"
              >
                <Trash2 size={20} />
              </button>
              <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Delete Email Account"
                description="Are you sure you want to delete this email account? This action cannot be undone."
              />
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex justify-start space-x-1 bg-white/5 p-1 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {renderTabContent()}
        </div>
      </div>
    </>
  );
};

export default EmailAccountSidebar;
