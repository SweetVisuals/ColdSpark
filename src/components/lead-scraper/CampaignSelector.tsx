import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Lead } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { createLeads } from '@/lib/api/leads';
import { toast } from '@/components/ui/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedLeads: Set<string>;
  leads: Lead[];
  onSuccess: () => void;
}

export const CampaignSelector: React.FC<Props> = ({
  open,
  onClose,
  selectedLeads,
  leads,
  onSuccess
}) => {
  const { campaigns } = useApp();
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [isAddingLeads, setIsAddingLeads] = useState(false);

  const handleAddToCampaign = async () => {
    if (!selectedCampaign) return;

    try {
      setIsAddingLeads(true);
      const selectedLeadsArray = leads.filter(lead => selectedLeads.has(lead.id));
      
      await createLeads(selectedCampaign, selectedLeadsArray);
      
      toast({
        title: "Success",
        description: `Added ${selectedLeadsArray.length} leads to campaign`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding leads:', error);
      toast({
        title: "Error",
        description: "Failed to add leads to campaign",
        variant: "destructive",
      });
    } finally {
      setIsAddingLeads(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger>
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddToCampaign}
              disabled={!selectedCampaign || isAddingLeads}
            >
              {isAddingLeads ? 'Adding...' : 'Add to Campaign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
