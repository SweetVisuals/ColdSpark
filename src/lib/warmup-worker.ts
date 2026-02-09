import { supabase } from './supabase';
import { EmailAccount } from '../types';
import nodemailer from 'nodemailer';
import { WARMUP_RECIPIENTS } from '../constants/warmup-emails';

interface WarmupJob {
  emailAccount: EmailAccount;
  targetEmails: number;
}

export class WarmupWorker {
  private running = false;

  async start() {
    if (this.running) return;
    this.running = true;
    
    // Run daily at 9 AM
    setInterval(async () => {
      await this.processWarmupEmails();
    }, 24 * 60 * 60 * 1000);

    // Initial run
    await this.processWarmupEmails();
  }

  private async processWarmupEmails() {
    try {
      // Get all email accounts with warmup enabled
      const { data: emailAccounts, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('warmup_enabled', true)
        .eq('warmup_status', 'enabled');

      if (error) throw error;

      // Process each account
      for (const account of emailAccounts || []) {
        const job: WarmupJob = {
          emailAccount: account,
          targetEmails: await this.calculateTargetEmails(account)
        };

        await this.processAccount(job);
      }
    } catch (error) {
      console.error('Error processing warmup emails:', error);
    }
  }

  private async calculateTargetEmails(account: EmailAccount): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get yesterday's progress
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: progress } = await supabase
      .from('email_warmup_progress')
      .select('emails_sent')
      .eq('email_account_id', account.id)
      .eq('date', yesterdayStr)
      .single();

    const previousDaySent = progress?.emails_sent || 0;
    return Math.min(
      previousDaySent + account.warmup_increase_per_day,
      account.warmup_daily_limit
    );
  }

  private async processAccount(job: WarmupJob) {
    const { emailAccount, targetEmails } = job;
    const today = new Date().toISOString().split('T')[0];

    // Get today's progress
    const { data: progress } = await supabase
      .from('email_warmup_progress')
      .select('emails_sent')
      .eq('email_account_id', emailAccount.id)
      .eq('date', today)
      .single();

    let emailsSentToday = progress?.emails_sent || 0;
    const emailsToSend = targetEmails - emailsSentToday;

    if (emailsToSend <= 0) return;

    // Send emails
    for (let i = 0; i < emailsToSend; i++) {
      try {
        // Create transporter using SMTP settings
        const transporter = nodemailer.createTransport({
          host: emailAccount.smtp_host,
          port: parseInt(emailAccount.smtp_port),
          secure: true,
          auth: {
            user: emailAccount.email,
            pass: '' // Password would need to be securely stored
          }
        });

        // Send email
        const targetEmails = WARMUP_RECIPIENTS;

        const emailTemplates = [
          `Hi there,

I recently came across your company and was impressed by your innovative approach. I believe there could be some interesting synergies between our work.

Would you be available for a quick chat next week to explore potential collaboration opportunities?

Best regards,
${emailAccount.name}
${emailAccount.email}`,

          `Hello,

I've been following your company's progress and wanted to reach out. Your recent achievements in the industry are truly inspiring.

I'd love to connect and discuss how we might be able to support each other's goals. Are you available for a brief call in the coming days?

Looking forward to your response.

Best,
${emailAccount.name}
${emailAccount.email}`,

          `Dear Recipient,

I wanted to take a moment to introduce myself and explore potential ways we could work together. Your company's reputation in the industry is impressive.

Would you have some time next week for a quick call to discuss potential opportunities?

Warm regards,
${emailAccount.name}
${emailAccount.email}`,

          `Hi,

I came across your profile and was intrigued by your work. I believe there might be some interesting ways we could collaborate.

Would you be open to a brief conversation next week to explore potential synergies?

Best wishes,
${emailAccount.name}
${emailAccount.email}`,

          `Hello there,

Your company's recent achievements caught my attention. I'd love to explore if there are ways we could potentially work together.

Are you available for a quick call next week to discuss?

Looking forward to hearing from you.

Best regards,
${emailAccount.name}
${emailAccount.email}`,

          `Hi,

I've been impressed by your company's growth and wanted to reach out. I believe there could be some valuable opportunities for collaboration.

Would you have some time next week for a quick chat?

Best,
${emailAccount.name}
${emailAccount.email}`,

          `Dear Recipient,

I wanted to connect regarding potential collaboration opportunities. Your work in the industry has been noteworthy.

Would you be available for a brief call next week to discuss?

Warm regards,
${emailAccount.name}
${emailAccount.email}`,

          `Hello,

I came across your company and was impressed by your innovative solutions. I'd love to explore if there are ways we could potentially work together.

Are you available for a quick call next week?

Best wishes,
${emailAccount.name}
${emailAccount.email}`,

          `Hi there,

Your company's recent projects have been impressive. I wanted to reach out and explore potential collaboration opportunities.

Would you have some time next week for a brief conversation?

Best regards,
${emailAccount.name}
${emailAccount.email}`,

          `Hello,

I've been following your company's progress and wanted to connect. I believe there could be some interesting ways we could support each other's goals.

Would you be available for a quick call next week?

Best,
${emailAccount.name}
${emailAccount.email}`,

          `Hi,

I wanted to reach out regarding potential collaboration opportunities. Your work in the industry has been impressive.

Would you have some time next week for a brief chat?

Best wishes,
${emailAccount.name}
${emailAccount.email}`,

          `Hello there,

I came across your company and was intrigued by your innovative approach. I'd love to explore potential ways we could work together.

Are you available for a quick call next week?

Best regards,
${emailAccount.name}
${emailAccount.email}`,

          `Hi,

Your company's recent achievements caught my attention. I wanted to reach out and explore potential collaboration opportunities.

Would you have some time next week for a brief conversation?

Best,
${emailAccount.name}
${emailAccount.email}`,

          `Hello,

I've been impressed by your company's growth and wanted to connect. I believe there could be some valuable opportunities for collaboration.

Would you be available for a quick call next week?

Best wishes,
${emailAccount.name}
${emailAccount.email}`,

          `Hi there,

I wanted to take a moment to introduce myself and explore potential ways we could work together. Your company's reputation in the industry is impressive.

Would you have some time next week for a quick chat?

Warm regards,
${emailAccount.name}
${emailAccount.email}`,

          `Hello,

I came across your profile and was intrigued by your work. I believe there might be some interesting ways we could collaborate.

Would you be open to a brief conversation next week to explore potential synergies?

Best regards,
${emailAccount.name}
${emailAccount.email}`,

          `Hi,

I've been following your company's progress and wanted to reach out. Your recent achievements in the industry are truly inspiring.

I'd love to connect and discuss how we might be able to support each other's goals. Are you available for a brief call in the coming days?

Best,
${emailAccount.name}
${emailAccount.email}`,

          `Hello there,

I recently came across your company and was impressed by your innovative approach. I believe there could be some interesting synergies between our work.

Would you be available for a quick chat next week to explore potential collaboration opportunities?

Best wishes,
${emailAccount.name}
${emailAccount.email}`,

          `Hi,

Your company's recent projects have been impressive. I wanted to reach out and explore potential collaboration opportunities.

Would you have some time next week for a brief conversation?

Best regards,
${emailAccount.name}
${emailAccount.email}`,

          `Hello,

I wanted to connect regarding potential collaboration opportunities. Your work in the industry has been noteworthy.

Would you be available for a brief call next week to discuss?

Warm regards,
${emailAccount.name}
${emailAccount.email}`
        ];

        const emailContent = emailTemplates[i % emailTemplates.length];

        await transporter.sendMail({
          from: emailAccount.email,
          to: targetEmails[i % targetEmails.length], // Rotate through target emails
          subject: `Exploring Collaboration Opportunities`,
          text: emailContent
        });

        // Track sent email
        emailsSentToday++;
        const { error: upsertError } = await supabase
          .from('email_warmup_progress')
          .upsert({
            email_account_id: emailAccount.id,
            date: today,
            emails_sent: emailsSentToday
          }, { onConflict: 'email_account_id,date' });

        if (upsertError) {
          console.error(`Failed to update progress for ${emailAccount.email}:`, upsertError);
        } else {
            console.log(`Sent warmup email ${i+1} for ${emailAccount.email}`);
        }

      } catch (error) {
        console.error('Error sending warmup email:', error);
        break;
      }
    }
  }
}

// Start the worker
const worker = new WarmupWorker();
worker.start();
