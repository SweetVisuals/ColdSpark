import React, { useState, useEffect } from 'react';
import { User, Send, Activity } from 'lucide-react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { EmailAccount } from '../../../types';
import { updateEmailAccount } from '../../../lib/api/email-accounts';
import { useToast } from '../../ui/use-toast';

interface SettingsTabProps {
  account: EmailAccount;
  onUpdate?: (account: EmailAccount) => void;
}

const SettingsTab = ({ account, onUpdate }: SettingsTabProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (field: keyof EmailAccount, value: any, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const updated = await updateEmailAccount(account.id, { [field]: value });
      onUpdate?.(updated);
      if (!silent) {
        toast({
          title: 'Success',
          description: 'Settings updated successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!account.warmup_filter_tag) {
      const newTag = Math.random().toString(36).substring(2, 10).toUpperCase();
      handleUpdate('warmup_filter_tag', newTag, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.warmup_filter_tag]);

  return (
    <div className="space-y-8 p-4">
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Sender Details</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Sender Name</Label>
          <Input
            id="name"
            type="text"
            defaultValue={account.name}
            disabled={loading}
            className="focus-visible:ring-primary"
            onBlur={(e) => {
              if (e.target.value !== account.name) {
                handleUpdate('name', e.target.value);
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signature" className="text-sm font-medium">Signature</Label>
          <Textarea
            id="signature"
            className="min-h-[100px] focus-visible:ring-primary"
            defaultValue={account.signature || ''}
            disabled={loading}
            onBlur={(e) => {
              if (e.target.value !== (account.signature || '')) {
                handleUpdate('signature', e.target.value);
              }
            }}
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <Send className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Campaign Settings</h3>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="dailyLimit" className="text-sm font-medium">Daily campaign limit</Label>
            <div className="flex items-center gap-3">
              <Input
                id="dailyLimit"
                type="number"
                defaultValue="30"
                className="w-20 focus-visible:ring-primary"
                disabled // Disabled as we are not updating campaign limit in this scope yet
              />
              <span className="text-sm text-muted-foreground">emails (Global setting coming soon)</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Warmup Settings</h3>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="filterTag" className="text-sm font-medium">Warmup filter tag</Label>
            <Input
              id="filterTag"
              type="text"
              value={account.warmup_filter_tag || 'Not Set'}
              disabled={true} // Uneditable as per user request
              className="bg-muted text-muted-foreground cursor-not-allowed"
              readOnly
            />
            <p className="text-xs text-muted-foreground">This tag is unique to this account and cannot be changed.</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="increasePerDay" className="text-sm font-medium">Increase per day</Label>
              <Input
                id="increasePerDay"
                type="number"
                defaultValue={account.warmup_increase_per_day}
                min="1"
                max="10"
                disabled={loading}
                className="focus-visible:ring-primary"
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (val !== account.warmup_increase_per_day) {
                    handleUpdate('warmup_increase_per_day', val);
                  }
                }}
              />
              <span className="text-sm text-muted-foreground">(Recommended: 3)</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyWarmupLimit" className="text-sm font-medium">Daily warmup limit (Max)</Label>
              <Input
                id="dailyWarmupLimit"
                type="number"
                defaultValue={account.warmup_daily_limit}
                disabled={loading}
                className="focus-visible:ring-primary"
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (val !== account.warmup_daily_limit) {
                    handleUpdate('warmup_daily_limit', val);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsTab;
