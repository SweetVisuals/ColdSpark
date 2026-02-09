import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Flame, MoreVertical } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { EmailAccount } from '../../types';
import EmailAccountSidebar from './EmailAccountSidebar';
import { EmailAccountRow } from './EmailAccountRow';
import { EmailAccountsHeader } from './EmailAccountsHeader';

const EmailAccountsList: React.FC = () => {
  const navigate = useNavigate();
  const { emailAccounts, updateEmailAccount, deleteEmailAccount } = useApp();
  const { toast } = useToast();
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);

  // Initialize and update selectedAccount when emailAccounts change
  useEffect(() => {
    if (emailAccounts.length > 0) {
      // If there's a selected account, update it
      if (selectedAccount) {
        const updatedAccount = emailAccounts.find(a => a.id === selectedAccount.id);
        if (updatedAccount) {
          // Only update if there are actual changes
          if (JSON.stringify(updatedAccount) !== JSON.stringify(selectedAccount)) {
            setSelectedAccount(updatedAccount);
          }
        }
      }
      // If no account is selected but there are accounts, select the first one
      else if (!selectedAccount) {
        setSelectedAccount(emailAccounts[0]);
        setShowSidebar(true);
      }
    } else {
      // If there are no accounts, clear the selection
      setSelectedAccount(null);
      setShowSidebar(false);
    }
  }, [emailAccounts, selectedAccount]);
  const [showSidebar, setShowSidebar] = useState(false);

  const handleAccountClick = (account: EmailAccount) => {
    setSelectedAccount(account);
    setShowSidebar(true);
  };

  const toggleWarmup = async (account: EmailAccount, e: React.MouseEvent, resume?: boolean) => {
    e.stopPropagation();
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

    try {
      await updateEmailAccount(account.id, updates);

      toast({
        title: nextStatus === 'enabled' ? 'Warmup Enabled' :
          nextStatus === 'paused' ? 'Warmup Paused' : 'Warmup Disabled',
        description: `Warmup is now ${nextStatus} for ${account.email}`,
      });
    } catch (error) {
      console.error('Error toggling warmup:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle warmup',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="relative flex">
      <div className="flex-1 bg-card rounded-lg shadow-sm border border-border">
        <table className="min-w-full divide-y divide-border">
          <EmailAccountsHeader />
          <tbody className="bg-card divide-y divide-border">
            {emailAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No email accounts found. Add your first email to get started.
                </td>
              </tr>
            ) : (
              emailAccounts.map((account) => (
                <EmailAccountRow
                  key={account.id}
                  account={account}
                  onAccountClick={handleAccountClick}
                  onToggleWarmup={toggleWarmup}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {showSidebar && selectedAccount && (
        <EmailAccountSidebar
          account={selectedAccount}
          onClose={() => setShowSidebar(false)}
          onToggleWarmup={toggleWarmup}
          onDeleteAccount={async (account) => {
            try {
              await deleteEmailAccount(account.id);
              toast({
                title: 'Success',
                description: 'Email account deleted successfully',
              });
            } catch (error) {
              toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to delete email account',
                variant: 'destructive',
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default EmailAccountsList;
