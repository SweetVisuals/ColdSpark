import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Trash2 } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { ConfirmationDialog } from '../ui/confirmation-dialog';

interface OptionsTabProps {
  campaignName: string;
  onNameChange: (newName: string) => void;
  onDelete: () => void;
}

const OptionsTab = ({ campaignName, onNameChange, onDelete }: OptionsTabProps) => {
  const [name, setName] = useState(campaignName);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSaveName = () => {
    onNameChange(name);
    toast({
      title: 'Campaign name updated',
      description: 'Your campaign name has been successfully updated.',
    });
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    toast({
      title: 'Campaign deleted',
      description: 'Your campaign has been successfully deleted.',
    });
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <div className="flex gap-2">
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button onClick={handleSaveName}>Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-red-600">
                Delete this campaign permanently
              </p>
              <p className="text-sm text-red-600">
                This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? This action cannot be undone."
      />
    </div>
  );
};

export default OptionsTab;
