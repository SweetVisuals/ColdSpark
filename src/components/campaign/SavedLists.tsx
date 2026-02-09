import React, { useState, useEffect } from 'react';
import { List, Trash, Plus, Check, Calendar, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchLists, deleteList, addListToCampaign, removeListFromCampaign } from '@/lib/api/lists';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface Props {
  campaignId: string;
  onLeadsAdded: () => void;
}

const ITEMS_PER_PAGE = 100;

const SavedLists: React.FC<Props> = ({ campaignId, onLeadsAdded }) => {
  const [lists, setLists] = useState<any[]>([]);
  const [addedLists, setAddedLists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setIsLoading(true);
      const data = await fetchLists();
      setLists(data);
    } catch (error) {
      console.error('Error loading lists:', error);
      toast({
        title: "Error",
        description: "Failed to load saved lists",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      await deleteList(id);
      setLists(lists.filter(list => list.id !== id));
      toast({
        title: "Success",
        description: "List deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting list:', error);
      toast({
        title: "Error",
        description: "Failed to delete list",
        variant: "destructive",
      });
    }
  };

  const handleAddToCampaign = async (listId: string) => {
    if (!campaignId) {
      toast({
        title: "Error",
        description: "No campaign selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const addedCount = await addListToCampaign(listId, campaignId);
      toast({
        title: "Success",
        description: `Added ${addedCount} leads to campaign`,
      });

      // Add to added lists if not already present
      const list = lists.find(l => l.id === listId);
      if (list && !addedLists.some(al => al.id === listId)) {
        setAddedLists(prev => [...prev, list]);
      }

      if (onLeadsAdded) {
        onLeadsAdded();
      }
    } catch (error) {
      console.error('Error adding list to campaign:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add leads to campaign",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromCampaign = async (listId: string) => {
    try {
      await removeListFromCampaign(listId, campaignId);
      toast({
        title: "Success",
        description: "Leads removed from campaign",
      });
      // Remove from added lists
      setAddedLists(prev => prev.filter(list => list.id !== listId));
      if (onLeadsAdded) {
        onLeadsAdded();
      }
    } catch (error) {
      console.error('Error removing list from campaign:', error);
      toast({
        title: "Error",
        description: "Failed to remove leads from campaign",
        variant: "destructive",
      });
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(lists.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentLists = lists.slice(startIndex, endIndex);

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
      <div className="glass-card rounded-2xl overflow-hidden mt-8 p-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4 mx-auto"></div>
          <div className="space-y-3">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl overflow-hidden mt-8 shadow-sm border border-border">
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b border-border bg-muted/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <List className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Saved Lists</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
              {lists.length} list{lists.length !== 1 ? 's' : ''} available
            </span>
            {lists.length > ITEMS_PER_PAGE && (
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
        </div>

        {lists.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <List className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h4 className="text-lg font-medium text-foreground mb-1">No saved lists</h4>
            <p className="text-muted-foreground max-w-sm mx-auto">
              You haven't created any saved lists yet. Use the Lead Scraper to find and save leads.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-transparent border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest w-1/3">
                      List Name
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      Leads
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentLists.map((list) => {
                    const isAdded = addedLists.some(al => al.id === list.id);
                    const leadsCount = list.list_leads?.length || 0;

                    return (
                      <tr key={list.id} className="transition-colors duration-200 border-b border-border hover:bg-muted/50 group">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                              <List className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-foreground">{list.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 mr-2 text-muted-foreground/50" />
                            {leadsCount}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground/50" />
                            {list.created_at ? format(new Date(list.created_at), 'MMM d, yyyy') : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {isAdded ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveFromCampaign(list.id)}
                                className="h-8 bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20 hover:text-emerald-700 hover:border-emerald-300 dark:border-emerald-500/20"
                              >
                                <Check className="w-3.5 h-3.5 mr-1.5" />
                                Added
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAddToCampaign(list.id)}
                                className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Add
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteList(list.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {lists.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to <span className="font-medium text-foreground">{Math.min(endIndex, lists.length)}</span> of <span className="font-medium text-foreground">{lists.length}</span> lists
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
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SavedLists;
