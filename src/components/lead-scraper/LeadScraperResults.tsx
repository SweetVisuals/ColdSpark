import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { mockLeads } from '@/lib/data/mockLeads';
import { LeadTable } from './LeadTable';
import { CampaignSelector } from './CampaignSelector';
import { Lead } from '@/types';

interface Props {
  results: Lead[];
  isLoading: boolean;
  hasSearched: boolean;
  logs?: { timestamp: string, message: string }[];
}

// Loading Component: Spinner + Single Latest Real Log
const ScraperProgress = ({ logs }: { logs: { timestamp: string, message: string }[] }) => {
  const latestLog = logs.length > 0 ? logs[logs.length - 1].message : "Starting scraper...";

  return (
    <div className="glass-card rounded-xl p-12 text-center space-y-6 border border-border/50">
      <div className="space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        {/* specific styling for the log message to look like a status update */}
        <p className="text-muted-foreground text-lg font-medium animate-pulse transition-all duration-300">
          {latestLog}
        </p>
      </div>
    </div>
  );
};

const LeadScraperResults: React.FC<Props> = ({ results, isLoading, hasSearched, logs = [] }) => {
  const [selectedLeads, setSelectedLeads] = useState(new Set<string>());
  const [showCampaignSelect, setShowCampaignSelect] = useState(false);

  // Only show mock leads if we haven't searched yet.
  const displayResults = hasSearched ? results : mockLeads;

  // Detect empty state after search
  const isEmptyAfterSearch = !isLoading && hasSearched && results.length === 0;

  if (isEmptyAfterSearch) {
    return (
      <div className="glass-card rounded-xl p-12 text-center border border-border/50">
        <h3 className="text-lg font-medium text-foreground">No leads found</h3>
        <p className="text-muted-foreground mt-2">
          No leads met your strict criteria (Must have Email/Phone). Try a broader search or different location.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isLoading && <ScraperProgress logs={logs} />}

      {/* Show table if we have results OR if we are not loading. 
          If loading and no results, the ScraperProgress above covers it. 
      */}
      {(results.length > 0 || !isLoading) && (
        <LeadTable
          leads={displayResults}
          selectedLeads={selectedLeads}
          onLeadSelect={setSelectedLeads}
          onAddToCampaign={() => setShowCampaignSelect(true)}
          isLoading={false}
        />
      )}

      <CampaignSelector
        open={showCampaignSelect}
        onClose={() => setShowCampaignSelect(false)}
        selectedLeads={selectedLeads}
        leads={displayResults}
        onSuccess={() => {
          setSelectedLeads(new Set());
          setShowCampaignSelect(false);
        }}
      />
    </div>
  );
};

export default LeadScraperResults;
