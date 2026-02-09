import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { fetchLists, removeDuplicatesFromList, removeLeadFromList } from '../lib/api/lists';
import { Lead } from '../types';
import { LeadTable } from '../components/lead-scraper/LeadTable';
import { CampaignSelector } from '../components/lead-scraper/CampaignSelector';
import { List, Search, Hash, AlertTriangle, Check } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from '../components/ui/use-toast';

import { cn } from '../lib/utils';

const Lists = () => {
    const [lists, setLists] = useState<any[]>([]);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [showCampaignSelect, setShowCampaignSelect] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);

    useEffect(() => {
        loadLists();
    }, []);

    const loadLists = async () => {
        try {
            setLoading(true);
            const data = await fetchLists();
            setLists(data);
            if (data.length > 0 && !selectedListId) {
                setSelectedListId(data[0].id);
            }
        } catch (error) {
            console.error('Error loading lists:', error);
        } finally {
            setLoading(false);
        }
    };

    const hasDuplicates = (list: any) => {
        if (!list || !list.list_leads) return false;
        const emails = list.list_leads
            .map((item: any) => item.lead?.email?.toLowerCase())
            .filter(Boolean);
        const uniqueEmails = new Set(emails);
        return emails.length > uniqueEmails.size;
    };

    const handleRemoveDuplicates = async (listId: string) => {
        try {
            setIsCleaning(true);
            const removedCount = await removeDuplicatesFromList(listId);
            toast({
                title: "Success",
                description: `Removed ${removedCount} duplicates from the list`,
            });
            await loadLists();
        } catch (error) {
            console.error('Error removing duplicates:', error);
            toast({
                title: "Error",
                description: "Failed to remove duplicates",
                variant: "destructive",
            });
        } finally {
            setIsCleaning(false);
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        if (!selectedListId) return;

        try {
            // Optimistic update
            setLists(prevLists => prevLists.map(list => {
                if (list.id === selectedListId) {
                    return {
                        ...list,
                        list_leads: list.list_leads.filter((item: any) => item.lead.id !== leadId)
                    };
                }
                return list;
            }));

            await removeLeadFromList(selectedListId, leadId);

            toast({
                title: "Success",
                description: "Lead removed from list",
            });
        } catch (error) {
            console.error('Error removing lead:', error);
            // Revert changes on error
            await loadLists();
            toast({
                title: "Error",
                description: "Failed to remove lead",
                variant: "destructive",
            });
        }
    };

    const selectedList = lists.find(l => l.id === selectedListId);

    // Extract leads from the selected list's join table structure
    // The API returns list_leads -> lead, so we need to flatten this
    const currentLeads: Lead[] = selectedList?.list_leads?.map((item: any) => item.lead) || [];
    const duplicatesFound = selectedList ? hasDuplicates(selectedList) : false;

    const filteredLists = lists.filter(list =>
        list.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Layout>
            <div className="flex h-[calc(100vh-theme(spacing.20))] gap-6">
                {/* Sidebar */}
                <div className="w-80 flex-shrink-0 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">My Lists</h1>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                            {lists.length}
                        </span>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search lists..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-card border-border/50 focus:border-primary/50"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {loading ? (
                            // Loading Skeletons
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-20 bg-card animate-pulse rounded-xl border border-border/50" />
                            ))
                        ) : filteredLists.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No lists found</p>
                            </div>
                        ) : (
                            filteredLists.map((list) => {
                                const isDuplicate = hasDuplicates(list);
                                return (
                                    <div
                                        key={list.id}
                                        onClick={() => setSelectedListId(list.id)}
                                        className={cn(
                                            "cursor-pointer p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                                            selectedListId === list.id
                                                ? "bg-primary/5 border-primary/50 shadow-sm"
                                                : "bg-card border-border/50 hover:border-primary/30 hover:shadow-sm"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-background border border-border/50 text-primary">
                                                    <List size={18} />
                                                </div>
                                                {isDuplicate && (
                                                    <span className="flex items-center justify-center bg-destructive/10 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider h-5">
                                                        Duplicates
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                                <Hash size={12} />
                                                {list.list_leads?.length || 0}
                                            </span>
                                        </div>
                                        <h3 className={cn(
                                            "font-bold truncate pr-4 transition-colors",
                                            selectedListId === list.id ? "text-primary" : "text-card-foreground group-hover:text-primary/80"
                                        )}>
                                            {list.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(list.created_at).toLocaleDateString()}
                                        </p>

                                        {selectedListId === list.id && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full overflow-hidden glass-card border border-border/50 rounded-2xl">
                    {selectedList ? (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-border/50 bg-muted/20 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-foreground">{selectedList.name}</h2>
                                        {duplicatesFound && (
                                            <span className="flex items-center gap-1 bg-destructive/10 text-destructive text-xs font-bold px-2 py-1 rounded-md">
                                                <AlertTriangle size={12} />
                                                Duplicates Found
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Contains {currentLeads.length} leads
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {duplicatesFound && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveDuplicates(selectedList.id)}
                                            disabled={isCleaning}
                                            className="border-destructive/50 text-destructive hover:bg-destructive/10"
                                        >
                                            {isCleaning ? "Cleaning..." : "Remove Duplicates"}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <LeadTable
                                    leads={currentLeads}
                                    selectedLeads={selectedLeads}
                                    onLeadSelect={setSelectedLeads}
                                    onAddToCampaign={() => setShowCampaignSelect(true)}
                                    isLoading={false}
                                    onDelete={handleDeleteLead}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <div className="p-4 rounded-full bg-muted mb-4">
                                <List size={40} className="text-muted-foreground/50" />
                            </div>
                            <p className="text-lg font-medium">Select a list to view leads</p>
                        </div>
                    )}
                </div>
            </div>

            <CampaignSelector
                open={showCampaignSelect}
                onClose={() => setShowCampaignSelect(false)}
                selectedLeads={selectedLeads}
                leads={currentLeads}
                onSuccess={() => {
                    setSelectedLeads(new Set());
                    setShowCampaignSelect(false);
                }}
            />
        </Layout>
    );
};

export default Lists;
