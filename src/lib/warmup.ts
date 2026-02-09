import { EmailAccount } from '../types/index.js';
import { supabase } from './supabase.js';
import type { ToasterToast } from '../components/ui/use-toast.js';
import { WARMUP_RECIPIENTS } from '../constants/warmup-emails.js';

interface WarmupEmail {
  subject: string;
  body: string;
  to: string;
}

export class WarmupService {
  private account: EmailAccount;
  private toast: (props: ToasterToast) => void;

  constructor(account: EmailAccount, toast: (props: ToasterToast) => void) {
    this.account = account;
    this.toast = toast;
  }

  async sendWarmupEmails() {
    if (!this.account.warmup_enabled || this.account.warmup_status !== 'enabled') {
      return;
    }

    try {
      // Get today's warmup progress
      const today = new Date().toISOString().split('T')[0];
      const { data: progress, error: progressError } = await supabase
        .from('email_warmup_progress')
        .select('emails_sent')
        .eq('email_account_id', this.account.id)
        .eq('date', today)
        .single();

      if (progressError && !progressError.message.includes('No rows found')) {
        throw progressError;
      }

      const emailsSentToday = progress?.emails_sent || 0;
      
      // Calculate effective daily limit
      let effectiveLimit = this.account.warmup_daily_limit;
      if (this.account.warmup_start_date && this.account.warmup_increase_per_day > 0) {
        const startDate = new Date(this.account.warmup_start_date);
        const now = new Date();
        const diffTime = now.getTime() - startDate.getTime();
        const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        
        const calculatedLimit = (diffDays + 1) * this.account.warmup_increase_per_day;
        effectiveLimit = Math.min(this.account.warmup_daily_limit, calculatedLimit);
      }

      const remainingEmails = Math.max(0, effectiveLimit - emailsSentToday);

      if (remainingEmails <= 0) {
        return;
      }

      // Generate warmup emails
      const emails = this.generateWarmupEmails(remainingEmails);

      // Send emails using the account's SMTP settings
      for (const email of emails) {
        await this.sendEmail(email);
        // Stats are updated server-side


      }

      this.toast({
        title: 'Success',
        description: `Sent ${emails.length} warmup emails`,
      });
    } catch (error) {
      this.toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send warmup emails',
        variant: 'destructive',
      });
    }
  }

  private generateWarmupEmails(count: number): WarmupEmail[] {
    const emails: WarmupEmail[] = [];
    
    // Generate simple warmup emails
    // Generate simple warmup emails
    for (let i = 0; i < count; i++) {
      emails.push({
        subject: `Warmup email ${i + 1}`,
        body: `This is a warmup email from ${this.account.email}`,
        to: WARMUP_RECIPIENTS[i % WARMUP_RECIPIENTS.length]
      });
    }

    return emails;
  }

  private async sendEmail(email: WarmupEmail): Promise<void> {
    // Use the account's SMTP settings to send the email
    // This is a simplified example - in a real implementation you would use a proper SMTP client
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.account.email,
        to: email.to,
        subject: email.subject,
        text: email.body,
        smtp: {
          host: this.account.smtp_host,
          port: this.account.smtp_port,
          secure: true,
          auth: {
            user: this.account.email,
            pass: this.account.smtp_password // Note: You should securely store and retrieve the password
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }
  }
}
