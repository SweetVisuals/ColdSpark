import { useState, useEffect } from 'react';
import { Mail, Plus, Trash } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from '../ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { fetchEmailAccounts, addEmailAccountsToCampaign, removeEmailAccountFromCampaign } from '../../lib/api/email-accounts';

interface Props {
  campaignId: string;
}

const CampaignEmails = ({ campaignId }: Props) => {
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadEmailAccounts();
  }, []);

  const loadEmailAccounts = async () => {
    try {
      setIsLoading(true);
      const [campaignAccounts, availableAccounts] = await Promise.all([
        fetchEmailAccounts(campaignId),
        fetchEmailAccounts()
      ]);

      console.log('Fetched campaign accounts:', campaignAccounts);
      console.log('Fetched available accounts:', availableAccounts);

      setEmailAccounts(campaignAccounts);
      setAvailableAccounts(availableAccounts);
    } catch (error) {
      console.error('Error loading email accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load email accounts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setSelectedAccounts([]);
    setIsDialogOpen(true);
  };

  const handleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleAddEmailAccounts = async () => {
    try {
      if (selectedAccounts.length === 0) {
        toast({
          title: "Warning",
          description: "Please select at least one email account",
          variant: "default",
        });
        return;
      }

      await addEmailAccountsToCampaign(campaignId, selectedAccounts);
      toast({
        title: "Success",
        description: `${selectedAccounts.length} email accounts added to campaign`,
      });
      setIsDialogOpen(false);
      loadEmailAccounts();
    } catch (error) {
      console.error('Error adding email accounts:', error);
      toast({
        title: "Error",
        description: "Failed to add email accounts to campaign",
        variant: "destructive",
      });
    }
  };

  const handleRemoveEmailAccount = async (emailAccountId: string) => {
    try {
      await removeEmailAccountFromCampaign(campaignId, emailAccountId);
      toast({
        title: "Success",
        description: "Email account removed from campaign",
      });
      loadEmailAccounts();
    } catch (error) {
      console.error('Error removing email account:', error);
      toast({
        title: "Error",
        description: "Failed to remove email account from campaign",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="space-y-4">
          <div className="h-20 bg-muted rounded-xl"></div>
          <div className="h-20 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-foreground">Email Accounts</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenDialog}
          className="rounded-xl border-border hover:bg-muted text-foreground transition-all"
        >
          <Plus size={16} className="mr-2" />
          Add Email Account
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Add Email Accounts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {availableAccounts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No email accounts found.</p>
            ) : (
              availableAccounts.map(account => (
                <div key={account.id} className="flex items-center space-x-3 p-3 rounded-xl border border-border bg-background/50 hover:bg-muted/30 transition-all cursor-pointer" onClick={() => handleAccountSelection(account.id)}>
                  <Checkbox
                    id={`dialog-${account.id}`}
                    checked={selectedAccounts.includes(account.id)}
                    onCheckedChange={() => handleAccountSelection(account.id)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor={`dialog-${account.id}`} className="text-sm font-medium text-foreground cursor-pointer flex-1">
                    {account.email}
                  </label>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end mt-8">
            <Button
              onClick={handleAddEmailAccounts}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-lg shadow-primary/20 w-full py-6"
            >
              Add Selected Accounts
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {emailAccounts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-16 border border-dashed border-border rounded-2xl bg-muted/10">
            <div className="p-5 bg-muted/20 rounded-full text-muted-foreground mb-6">
              <Mail size={48} />
            </div>
            <p className="text-foreground font-bold text-lg mb-2">No accounts connected</p>
            <p className="text-muted-foreground text-center max-w-[300px]">Link email accounts to this campaign to start sending your sequence.</p>
          </div>
        ) : (
          emailAccounts.map((account) => (
            <div key={account.id} className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-5 hover:shadow-md transition-all group">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/5 rounded-xl text-primary group-hover:bg-primary/10 transition-colors">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{account.email}</h4>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-0.5">{account.provider}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveEmailAccount(account.id)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                >
                  <Trash size={18} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CampaignEmails;
