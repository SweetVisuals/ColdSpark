import React, { useState } from 'react';
import { Plus, Sparkles, Trash, Search, ChevronLeft, ChevronRight, Mail, User, Building2, Briefcase, Phone, Linkedin, MoreHorizontal, Loader2, Eye, X } from 'lucide-react';
import { Lead } from '@/types';
import { LeadUploader } from './leads/LeadUploader';
import { LeadForm } from './leads/LeadForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createLead, createLeads, fetchLeads, deleteLead } from '@/lib/api/leads';
import { toast } from '@/components/ui/use-toast';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';

interface Props {
  campaignId: string;
  refreshTrigger?: boolean;
}

const ITEMS_PER_PAGE = 100;

const LeadsTable: React.FC<Props> = ({ campaignId, refreshTrigger }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddLead, setShowAddLead] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [totalToDelete, setTotalToDelete] = useState(0);
  const [viewingDraft, setViewingDraft] = useState<Lead | null>(null);

  React.useEffect(() => {
    loadLeads();
  }, [campaignId, refreshTrigger]);

  const deduplicateLeads = (leads: Lead[]): Lead[] => {
    const leadMap = new Map<string, Lead>();

    leads.forEach(lead => {
      const existing = leadMap.get(lead.email);

      if (!existing) {
        leadMap.set(lead.email, lead);
        return;
      }

      // Calculate completeness scores
      const existingScore = Object.values(existing).filter(Boolean).length;
      const newScore = Object.values(lead).filter(Boolean).length;

      // Keep the more complete lead
      if (newScore > existingScore) {
        leadMap.set(lead.email, lead);
      }
    });

    return Array.from(leadMap.values());
  };

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      const data = await fetchLeads(campaignId) as Lead[];
      const deduplicated = deduplicateLeads(data);
      setLeads(deduplicated);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast({
        title: "Error",
        description: "Failed to load leads",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLead = async (lead: Lead) => {
    try {
      await createLead(campaignId, lead);
      await loadLeads();
      setShowAddLead(false);
      toast({
        title: "Success",
        description: "Lead added successfully"
      });
    } catch (error) {
      console.error('Error adding lead:', error);
      toast({
        title: "Error",
        description: "Failed to add lead",
        variant: "destructive"
      });
    }
  };

  const handleUploadLeads = async (uploadedLeads: Lead[]) => {
    try {
      const deduplicated = deduplicateLeads(uploadedLeads);
      await createLeads(campaignId, deduplicated);
      await loadLeads();
      toast({
        title: "Success",
        description: `${uploadedLeads.length} leads uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading leads:', error);
      toast({
        title: "Error",
        description: "Failed to upload leads",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      setDeletingId(leadId);
      await deleteLead(campaignId, leadId);
      setLeads(leads.filter(lead => lead.id !== leadId));
      setSelectedLeads(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      toast({
        title: "Success",
        description: "Lead deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const leadsToDelete = Array.from(selectedLeads);
      setDeletingId('BULK');
      setDeleteProgress(0);
      setTotalToDelete(leadsToDelete.length);

      // Execute deletions in parallel with progress tracking
      await Promise.all(leadsToDelete.map(async (id) => {
        await deleteLead(campaignId, id);
        setDeleteProgress(prev => prev + 1);
      }));

      setLeads(leads.filter(lead => !selectedLeads.has(lead.id)));
      setSelectedLeads(new Set());

      toast({
        title: "Success",
        description: `${leadsToDelete.length} leads deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({
        title: "Error",
        description: "Failed to delete selected leads",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
      setDeleteProgress(0);
      setTotalToDelete(0);
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === currentLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(currentLeads.map(l => l.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredLeads = leads.filter((lead) =>
    Object.values(lead).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentLeads = filteredLeads.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden mt-8 p-12 text-center border border-border">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground font-medium">Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl shadow-sm border border-border overflow-hidden mt-8">
      {/* Header / Toolbar */}
      <div className="p-6 border-b border-border bg-muted/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search leads..."
              className="pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl w-72 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            {selectedLeads.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={deletingId === 'BULK'}
                className="rounded-xl shadow-sm"
              >
                {deletingId === 'BULK' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting ({deleteProgress}/{totalToDelete})
                  </>
                ) : (
                  <>
                    <Trash className="w-4 h-4 mr-2" />
                    Delete ({selectedLeads.size})
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => setShowAddLead(true)}
              className="flex items-center space-x-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-bold"
            >
              <Plus size={18} />
              <span>Add Lead</span>
            </Button>
          </div>
        </div>

        <LeadUploader onUpload={handleUploadLeads} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-transparent border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left w-[60px]">
                <CustomCheckbox
                  checked={currentLeads.length > 0 && selectedLeads.size === currentLeads.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                Email
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                Name
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                Company
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                Title
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                AI Draft
              </th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card/50 divide-y divide-border/50">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-4 bg-muted/30 rounded-full">
                      <User className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="font-medium text-lg text-foreground">No leads found</p>
                      <p className="text-sm">Add your first lead or upload a CSV file to get started.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              currentLeads.map((lead) => {
                const isSelected = selectedLeads.has(lead.id);
                return (
                  <tr key={lead.id} className={`transition-colors duration-200 border-b border-border hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}>
                    <td className="px-6 py-4">
                      <CustomCheckbox
                        checked={isSelected}
                        onChange={() => handleSelectOne(lead.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span className="text-sm font-medium text-foreground/90">{lead.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">{lead.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.company ? (
                        <div className="flex items-center space-x-2 text-foreground/80">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground/50" />
                          <span className="text-sm">{lead.company}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">{lead.title || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{lead.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.personalized_email ? (
                        <div className="flex items-center">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider cursor-help border border-emerald-500/20"
                            title="AI Draft Ready"
                          >
                            <Sparkles className="w-3 h-3" />
                            Ready
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingDraft(lead)}
                            className="h-6 w-6 ml-1 p-0 rounded-full hover:bg-emerald-500/20 text-emerald-600"
                            title="View Draft"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider border border-border">
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLead(lead.id)}
                        disabled={deletingId === lead.id || deletingId === 'BULK'}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                      >
                        {deletingId === lead.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash className="w-4 h-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {
        filteredLeads.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to <span className="font-medium text-foreground">{Math.min(endIndex, filteredLeads.length)}</span> of <span className="font-medium text-foreground">{filteredLeads.length}</span> leads
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium px-2">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      }

      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <LeadForm
            onSubmit={handleAddLead}
            onCancel={() => setShowAddLead(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingDraft} onOpenChange={(open) => !open && setViewingDraft(null)}>
        <DialogContent className="glass-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>AI Draft for {viewingDraft?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground border-b border-border pb-3">
                <span>To: <span className="text-foreground font-medium">{viewingDraft?.email}</span></span>
                {viewingDraft?.company && <span>Company: <span className="text-foreground font-medium">{viewingDraft?.company}</span></span>}
              </div>
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90 max-h-[400px] overflow-y-auto custom-scrollbar">
                {viewingDraft?.personalized_email}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setViewingDraft(null)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default LeadsTable;
