import React from 'react';
import { Lead } from '@/types';
import { Button } from '@/components/ui/button';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';
import { SaveListDialog } from '../campaign/leads/SaveListDialog';
import { ShieldCheck, Loader2 } from 'lucide-react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';

interface Props {
  leads: Lead[];
  selectedLeads: Set<string>;
  onLeadSelect: (selected: Set<string>) => void;
  onAddToCampaign: () => void;
  isLoading: boolean;
  onDelete?: (id: string) => void;
}

const LoadingState = () => {
  const [messageIndex, setMessageIndex] = React.useState(0);
  const messages = [
    "Searching Google Maps...",
    "Identifying companies...",
    "Visiting company websites...",
    "Extracting contact details...",
    "Verifying emails and phone numbers...",
    "Finalizing high-quality leads..."
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center py-12 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground text-lg animate-pulse">{messages[messageIndex]}</p>
    </div>
  );
};

export const LeadTable: React.FC<Props> = ({
  leads,
  selectedLeads,
  onLeadSelect,
  onAddToCampaign,
  isLoading,
  onDelete
}) => {
  const [showSaveList, setShowSaveList] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationResults, setValidationResults] = React.useState<Record<string, { status: 'idle' | 'loading' | 'valid' | 'warning' | 'invalid', msg: string }>>({});

  const handleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      onLeadSelect(new Set());
    } else {
      onLeadSelect(new Set(leads.map(lead => lead.id)));
    }
  };

  const handleValidateLeads = async (leadIds?: string[]) => {
    const idsToValidate = leadIds || Array.from(selectedLeads);
    if (idsToValidate.length === 0) return;

    setIsValidating(true);

    // Mark as loading
    setValidationResults(prev => {
      const next = { ...prev };
      idsToValidate.forEach(id => {
        next[id] = { status: 'loading', msg: 'Validating...' };
      });
      return next;
    });

    try {
      // Process in chunks of 5
      const chunkSize = 5;
      for (let i = 0; i < idsToValidate.length; i += chunkSize) {
        const chunk = idsToValidate.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (id) => {
          const lead = leads.find(l => l.id === id);
          if (!lead?.email) {
            setValidationResults(prev => ({
              ...prev,
              [id]: { status: 'invalid', msg: 'No email' }
            }));
            return;
          }


          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await axios.post('/api/validate-email', {
              email: lead.email,
              leadId: lead.id
            }, {
              headers: {
                Authorization: token ? `Bearer ${token}` : ''
              }
            });

            if (res.data.success) {
              const status = res.data.isValid ? (res.data.warning ? 'warning' : 'valid') : 'invalid';
              const msg = res.data.isValid ? (res.data.warning ? res.data.details : 'Valid') : (res.data.reason || 'Invalid');

              setValidationResults(prev => ({
                ...prev,
                [id]: { status, msg }
              }));
            } else {
              setValidationResults(prev => ({
                ...prev,
                [id]: { status: 'invalid', msg: res.data.error || 'Validation error' }
              }));
            }
          } catch (e) {
            setValidationResults(prev => ({
              ...prev,
              [id]: { status: 'invalid', msg: 'Network error' }
            }));
          }
        }));
      }
    } finally {
      setIsValidating(false);
    }
  };

  const selectedLeadsArray = leads.filter(lead => selectedLeads.has(lead.id));

  // Hide Name/Role columns unless we have LinkedIn leads (which have these fields)
  // If we have mixed results (Maps + LinkedIn), we show the columns for the LinkedIn leads.
  const hidePersonalColumns = !leads.some(lead => lead.source === 'LinkedIn');

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden mt-8">
      <div className="p-6 flex justify-between items-center border-b border-border bg-muted/20">
        <div className="space-x-3 flex items-center">
          <Button
            onClick={onAddToCampaign}
            disabled={selectedLeads.size === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-5 shadow-lg shadow-primary/20 border border-primary/20"
          >
            Add to Campaign
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSaveList(true)}
            disabled={selectedLeads.size === 0}
            className="border-border bg-background hover:bg-muted text-foreground rounded-xl px-5"
          >
            Save to List
          </Button>

          <div className="h-6 w-px bg-border mx-2"></div>

          <Button
            variant="secondary"
            onClick={() => handleValidateLeads()}
            disabled={selectedLeads.size === 0 || isValidating}
            className="rounded-xl px-5 gap-2"
          >
            {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Validate Selected
          </Button>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
          {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <TableHeader
            onSelectAll={handleSelectAll}
            allSelected={selectedLeads.size === leads.length}
            totalLeads={leads.length}
            hidePersonalColumns={hidePersonalColumns}
            showActions={!!onDelete}
          />
          <tbody className="divide-y divide-border">
            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                lead={lead}
                selected={selectedLeads.has(lead.id)}
                hidePersonalColumns={hidePersonalColumns}
                validationStatus={validationResults[lead.id]?.status || lead.validation_status}
                validationMessage={validationResults[lead.id]?.msg || lead.validation_details}
                onValidate={() => handleValidateLeads([lead.id])}
                onDelete={onDelete}
                onSelect={(id) => {
                  const newSelected = new Set(selectedLeads);
                  if (newSelected.has(id)) {
                    newSelected.delete(id);
                  } else {
                    newSelected.add(id);
                  }
                  onLeadSelect(newSelected);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <SaveListDialog
        open={showSaveList}
        onClose={() => setShowSaveList(false)}
        leads={selectedLeadsArray}
        onSuccess={() => {
          onLeadSelect(new Set());
          setShowSaveList(false);
        }}
      />
    </div>
  );
};
