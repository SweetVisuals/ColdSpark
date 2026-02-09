import React, { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/use-toast';
import EmailAccountsList from '../components/email/EmailAccountsList';
import AddEmailModal from '../components/modals/AddEmailModal';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/layout/PageHeader';

const EmailAccounts = () => {
  const [showAddEmailModal, setShowAddEmailModal] = useState(false);
  const { emailAccounts, deleteEmailAccount } = useApp();
  const { toast } = useToast();

  const handleCleanup = async () => {
    const invalidEmails = ['manirae2@coldspark.org', 'nicolas@coldspark.org'];
    const toDelete = emailAccounts.filter(acc => invalidEmails.includes(acc.email));

    if (toDelete.length === 0) {
      toast({ title: "No invalid emails found", description: "The specified emails were not found in your accounts list." });
      return;
    }

    let deletedCount = 0;
    for (const acc of toDelete) {
      try {
        await deleteEmailAccount(acc.id);
        deletedCount++;
      } catch (err) {
        console.error(err);
      }
    }

    if (deletedCount > 0) {
      toast({ title: "Cleanup Successful", description: `Removed ${deletedCount} invalid email accounts.` });
    } else {
      toast({ title: "Cleanup Failed", description: "Could not delete accounts due to an error.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Email Accounts"
        description="Manage your connected email accounts"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search accounts..."
            className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleCleanup}
          className="flex items-center space-x-2 bg-destructive/10 text-destructive px-4 py-2 rounded-lg hover:bg-destructive/20 transition-colors shadow-sm text-sm font-medium"
        >
          <Trash2 size={18} />
          <span>Cleanup Invalid</span>
        </button>
        <button
          onClick={() => setShowAddEmailModal(true)}
          className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={18} />
          <span>Add Account</span>
        </button>
      </PageHeader>

      <EmailAccountsList />
      {showAddEmailModal && (
        <AddEmailModal onClose={() => setShowAddEmailModal(false)} />
      )}
    </Layout>
  );
};

export default EmailAccounts;
