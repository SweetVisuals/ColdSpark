import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import AddEmailModal from '../components/modals/AddEmailModal';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/layout/PageHeader';

const EmailWarmer = () => {
  const [showAddEmailModal, setShowAddEmailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailAccounts] = useState<any[]>([]); // Will be populated from context

  return (
    <Layout>
      <PageHeader
        title="Email Warmer"
        description="Monitor and improve your email reputation"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search emails..."
            className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAddEmailModal(true)}
          className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={18} />
          <span>Add Email</span>
        </button>
      </PageHeader>

      <div className="bg-card rounded-lg shadow-sm border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Emails Sent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Warmup Emails</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Health Score</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {emailAccounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  No email accounts found. Add your first email to get started.
                </td>
              </tr>
            ) : (
              emailAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{account.email}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{account.emailsSent}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{account.warmupEmails}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{account.healthScore}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddEmailModal && (
        <AddEmailModal onClose={() => setShowAddEmailModal(false)} />
      )}
    </Layout>
  );
};

export default EmailWarmer;
