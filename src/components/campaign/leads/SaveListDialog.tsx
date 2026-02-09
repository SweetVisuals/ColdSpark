import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lead } from '@/types';
import { createList } from '@/lib/api/lists';
import { toast } from '@/components/ui/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  leads: Lead[];
  onSuccess: () => void;
}

export const SaveListDialog: React.FC<Props> = ({
  open,
  onClose,
  leads,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      await createList(name, leads);
      toast({
        title: "Success",
        description: `Created list "${name}" with ${leads.length} leads`,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating list:', error);
      toast({
        title: "Error",
        description: "Failed to create list",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>List Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter list name"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save List'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
