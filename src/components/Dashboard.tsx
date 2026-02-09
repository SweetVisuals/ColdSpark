import React from 'react';

import { useNavigate } from 'react-router-dom';
import { PlusCircle, AlertCircle } from 'lucide-react';
import CampaignCard from './CampaignCard';
import EmptyState from './EmptyState';
import { useApp } from '../context/AppContext';
import LoadingSpinner from './auth/LoadingSpinner';
import Layout from './layout/Layout';
import PageHeader from './layout/PageHeader';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { campaigns, loading, error } = useApp();

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
          <div className="bg-destructive/10 p-4 rounded-full mb-4 ring-1 ring-destructive/20">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">Failed to Load Campaigns</h3>
          <p className="text-muted-foreground text-center mb-6">
            Please check your internet connection and try again
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl hover:bg-primary/90 font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (campaigns.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            {...campaign}
            onClick={() => navigate(`/campaign/${campaign.id}`)}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <PageHeader
        title="Campaigns"
        description="Manage and monitor your outreach campaigns"
      >
        <button
          onClick={() => navigate('/create-campaign')}
          className="flex items-center space-x-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20"
        >
          <PlusCircle size={20} />
          <span className="font-medium">New Campaign</span>
        </button>
      </PageHeader>

      {renderContent()}
    </Layout>
  );
};
