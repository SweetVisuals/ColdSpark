import { createClient } from 'jsr:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.13';

// Config - Hardcoded for immediate deployment
const DEEPSEEK_API_KEY = 'sk-5fe28a74c7664c2e99080c25820124b2';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const SUPABASE_URL = 'https://wmoyigdovtpuayjxezzc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtb3lpZ2RvdnRwdWF5anhlenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcxOTMwMywiZXhwIjoyMDg1Mjk1MzAzfQ.lutBH8ZXbQ3LcYDGKvk3i-7PKm64FgO5OUL9j4NOz3Y';

Deno.serve(async (req) => {
  try {
    // 1. Create Supabase Client
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    console.log("Checking for scheduled campaigns...");

    // 2. Fetch Active Schedules
    // Check 'scheduled_emails' where status=scheduled AND Campaign is Active
    const { data: activeSchedules, error } = await supabaseAdmin
        .from('scheduled_emails')
        .select(`
            *,
            campaigns!fk_scheduled_emails_campaigns!inner (
                id,
                name,
                status,
                company_name,
                contact_number,
                primary_email
            ),
            templates!scheduled_emails_template_id_fkey!inner (*)
        `)
        .eq('status', 'scheduled')
        .eq('campaigns.status', 'in_progress'); // Must be strictly In Progress

    if (error) {
        throw error;
    }

    if (!activeSchedules || activeSchedules.length === 0) {
        return new Response(JSON.stringify({ message: 'No active schedules' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const results = [];

    // 3. Process each schedule
    for (const schedule of activeSchedules) {
        // Check time window
        const now = new Date();
        const startDate = new Date(schedule.start_date);
        const endDate = new Date(schedule.end_date);
        
        if (now < startDate || now > endDate) continue;

        // Get Accounts
        const { data: accounts } = await supabaseAdmin
           .from('schedule_email_accounts')
           .select(`*, email_accounts!inner(*)`)
           .eq('schedule_id', schedule.id);

        if (!accounts || accounts.length === 0) continue;

        // Find Pending Leads (Not yet sent)
        const { data: pendingLeads, error: pendingError } = await supabaseAdmin
            .rpc('get_pending_campaign_leads', { campaign_id_param: schedule.campaign_id })
            .limit(5); // Limit 5 per run

        if (pendingError) {
             console.error("Error fetching pending leads", pendingError);
             continue;
        }

        if (!pendingLeads || pendingLeads.length === 0) {
             continue; // No leads left or all handled
        }

        // Logic: Check for assigned account -> if none, Round Robin & Assign
        let sentCount = 0;
        let accountIndex = 0;

        for (const lead of pendingLeads) {
             if (sentCount >= 5) break; 

             let account = null;
             
             // 1. Check for existing assignment
             if (lead.assigned_email_account_id) {
                 const found = accounts.find(a => a.email_accounts.id === lead.assigned_email_account_id);
                 if (found) {
                     account = found.email_accounts;
                 } else {
                     console.warn(`Assigned account ${lead.assigned_email_account_id} not found in this schedule. Re-assigning.`);
                 }
             }

             // 2. If no valid assignment, Pick Round Robin & Save it
             if (!account) {
                 const accountEntry = accounts[accountIndex % accounts.length];
                 account = accountEntry.email_accounts;
                 accountIndex++;

                 // Persist assignment for future steps (consistency)
                 try {
                     await supabaseAdmin
                        .from('campaign_leads')
                        .update({ assigned_email_account_id: account.id })
                        .eq('campaign_id', schedule.campaign_id)
                        .eq('lead_id', lead.id);
                 } catch (assignErr) {
                     console.error("Failed to save account assignment", assignErr);
                 }
             }


             // JIT PERSONALIZATION
             let bodyContent = lead.personalized_email;
             let isPersonalized = false;
             
             if (!bodyContent && lead.summary) {
                 // Call DeepSeek
                 try {
                     const systemPrompt = `You are a friendly B2B professional companion.
REWRITE the email body for a specific lead.
Goal: Use the provided NOTES to make a relatable, "fan-like" observation.
Instructions:
1. Use the notes/summary to show you actually know them. Be specific.
2. Tone: Admiring, witty, warm.
3. Length: VERY SHORT (<100 words).
4. Output: ONLY the email body text. NO SIGN-OFF.
`;
                     const userPrompt = `Template Body: "${schedule.templates.content}"
Lead Company: ${lead.company}
Lead Summary: "${lead.summary}"
Rewrite the email body for this lead.`;

                     const aiResp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: 'deepseek-chat',
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: userPrompt }
                            ]
                        })
                     });
                     
                     const aiData = await aiResp.json();
                     if (aiData.choices && aiData.choices[0]) {
                         bodyContent = aiData.choices[0].message.content.trim();
                         isPersonalized = true;
                         
                         // Save it
                         await supabaseAdmin
                             .from('leads')
                             .update({ personalized_email: bodyContent })
                             .eq('id', lead.id);
                     }
                 } catch (err) {
                     console.error("AI Personalization Failed", err);
                     // Fallback to template
                     bodyContent = schedule.templates.content;
                 }
             } else if (bodyContent) {
                 // Already had personalized email saved
                 isPersonalized = true;
             } else {
                 bodyContent = schedule.templates.content;
             }

             // If personalized, append signature as it likely lacks one
             if (isPersonalized) {
                 bodyContent += `\n\nBest,\n{{sender_name}}\n{{sender_email}}\n{{sender_phone}}\n{{sender_company}}`;
             }

             // --- SMARTER VARIABLE SUBSTITUTION ---
             let firstName = (lead.name || '').trim();
             let companyName = (lead.company || '').trim();
             
             // "Hi The..." prevention
             let safeFirstName = firstName.split(' ')[0];
             const lowerName = firstName.toLowerCase();
             
             if (
                 !firstName ||
                 lowerName === 'the' ||
                 lowerName.startsWith('the ') ||
                 lowerName.startsWith('a ') || 
                 lowerName.startsWith('an ') ||
                 (companyName && lowerName === companyName.toLowerCase())
             ) {
                 safeFirstName = 'there';
             }

             // Variable Calc
             let finalBody = bodyContent
                  .replace(/{{name}}/g, lead.name || '')
                  .replace(/{{company}}/g, lead.company || '')
                  .replace(/{{first_name}}/g, safeFirstName)
                  .replace(/{{title}}/g, lead.title || '')
                  .replace(/{{location}}/g, lead.location || '')
                  .replace(/{{industry}}/g, lead.industry || 'industry')
             // Sender Details - Prioritize Campaign Settings
             const senderName = schedule.campaigns.company_name || account.company || account.name || 'Sender';
             const senderEmail = schedule.campaigns.primary_email || account.email;
             const senderPhone = schedule.campaigns.contact_number || account.phone_number || '';
             const senderCompany = schedule.campaigns.company_name || account.company || '';

             // Variable Calc
             let finalBody = bodyContent
                  .replace(/{{name}}/g, lead.name || '')
                  .replace(/{{company}}/g, lead.company || '')
                  .replace(/{{first_name}}/g, safeFirstName)
                  .replace(/{{title}}/g, lead.title || '')
                  .replace(/{{location}}/g, lead.location || '')
                  .replace(/{{industry}}/g, lead.industry || 'industry')
                  // Sender / Signature variables
                  .replace(/{{sender_name}}/g, senderName)
                  .replace(/{{sender_email}}/g, senderEmail)
                  .replace(/{sender-email}/g, senderEmail) // User reported variant
                  .replace(/<primaryemail>/g, senderEmail)
                  .replace(/{{sender_phone}}/g, senderPhone)
                  .replace(/{phone-number}/g, senderPhone) // User reported variant
                  .replace(/<contactnumber>/g, senderPhone)
                  .replace(/{{sender_company}}/g, senderCompany)
                  .replace(/<company>/g, senderCompany);
             
             let finalSubject = schedule.templates.subject
                  .replace(/{{company}}/g, lead.company || '')
                  .replace(/{{name}}/g, lead.name || '')
                  .replace(/{{first_name}}/g, safeFirstName);


             // --- VALIDATION & QA STEP ---
             
             // 1. Basic Regex Check (Placeholders)
             const placeholderRegex = /{{.*?}}|\[.*?\]|<.*?>/g;
             // Allow <br> or <b> tags, so be specific about placeholders if needed, 
             // but usually placeholders are {{}} or []. 
             const matches = (finalBody.match(placeholderRegex) || [])
                            .filter(m => !m.match(/^<br\s*\/?>$/i) && !m.match(/^<\/?b>$/i) && !m.match(/^<\/?p>$/i) && !m.match(/^<\/?div>$/i));
             
             const hasPlaceholders = matches.length > 0 || (finalSubject.match(placeholderRegex) || []).length > 0;

             let validationError = null;
             if (hasPlaceholders) validationError = "Contains unreplaced placeholders";

             // 2. AI Auditor Call
             if (!validationError) {
                 try {
                     const qaSystemPrompt = `You are a strict QA Auditor for B2B emails.
Check the email for:
1. Unfilled placeholders (e.g. {{name}}, [Company]).
2. Awkward starts like "Hi The," or "Hi A," or "Hi [Company]".
3. Missing signatures or abrupt endings (e.g. ending with "Cheers," but no name).
4. Generic/Robotic tone if it's supposed to be personalized.
5. Bad formatting (excessive newlines).

Return JSON ONLY: { "valid": boolean, "reason": "string" }`;

                     const qaUserPrompt = `Subject: ${finalSubject}
Body:
${finalBody}

--
Sender Name: ${account.name || "(MISSING)"}
Lead Name: ${lead.name}
Lead Company: ${lead.company}

Is this email ready to send?`;

                     const qaResp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: 'deepseek-chat',
                            messages: [
                                { role: 'system', content: qaSystemPrompt },
                                { role: 'user', content: qaUserPrompt }
                            ],
                            response_format: { type: 'json_object' }
                        })
                     });

                     const qaData = await qaResp.json();
                     if (qaData.choices && qaData.choices[0]) {
                         const content = qaData.choices[0].message.content;
                         // Handle potential markdown backticks
                         const jsonStr = content.replace(/```json\n|\n```/g, '').trim();
                         const verification = JSON.parse(jsonStr);
                         
                         if (!verification.valid) {
                             validationError = `AI QA Failed: ${verification.reason}`;
                         }
                     }
                 } catch (qaErr) {
                     console.error("QA Validation Error", qaErr);
                     validationError = "QA System Error";
                 }
             }

             // --- HANDLE VALIDATION RESULT ---
             if (validationError) {
                 console.warn(`Email Validation Failed for ${lead.email}: ${validationError}`);
                 
                 // 1. Log Failure
                 await supabaseAdmin.from('campaign_progress').upsert({
                    campaign_id: schedule.campaign_id,
                    lead_id: lead.id,
                    email_account_id: account.id,
                    status: 'failed', 
                    updated_at: new Date().toISOString()
                }, { onConflict: 'campaign_id,lead_id' });

                 // 2. Self-Healing: Clear the bad personalization so it regenerates next time
                 if (lead.personalized_email) {
                     await supabaseAdmin
                         .from('leads')
                         .update({ personalized_email: null })
                         .eq('id', lead.id);
                 }
                 
                 continue; // SKIP SENDING
             }

             // Decrypt Password
             const { data: decrypted } = await supabaseAdmin.rpc('decrypt_password', { 
                 encrypted_password: account.encrypted_password 
             });

             if (!decrypted) {
                 console.error("Failed to decrypt password");
                 continue;
             }

             // SEND via Nodemailer
             try {
                const transporter = nodemailer.createTransport({
                    host: account.smtp_host,
                    port: account.smtp_port,
                    secure: account.smtp_port === 465,
                    auth: {
                        user: account.email,
                        pass: decrypted
                    }
                });

                await transporter.sendMail({
                    from: account.name ? `"${account.name}" <${account.email}>` : account.email,
                    to: lead.email,
                    subject: finalSubject,
                    html: finalBody.replace(/\n/g, '<br/>'),
                    text: finalBody
                });

                // Log Success
                await supabaseAdmin.from('campaign_progress').upsert({
                    campaign_id: schedule.campaign_id,
                    lead_id: lead.id,
                    email_account_id: account.id,
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'campaign_id,lead_id' });

                // Update Stats
                 const { data: currentStats } = await supabaseAdmin
                       .from('scheduled_emails')
                       .select('sent_emails')
                       .eq('id', schedule.id)
                       .single();
                   
                 if (currentStats) {
                       await supabaseAdmin
                           .from('scheduled_emails')
                           .update({ sent_emails: (currentStats.sent_emails || 0) + 1 })
                           .eq('id', schedule.id);
                 }

                 // Insert to Inbox
                  await supabaseAdmin.from('inbox_emails').insert({
                       email_account_id: account.id,
                       folder: 'sent',
                       uid: Math.floor(Math.random() * 1000000000), 
                       from: account.email,
                       to: lead.email,
                       subject: finalSubject,
                       body_text: finalBody,
                       received_at: new Date().toISOString(),
                       is_read: true,
                       campaign_id: schedule.campaign_id
                   });
                
                sentCount++;
                results.push({ email: lead.email, status: 'sent' });
                console.log(`Sent email to ${lead.email} from ${account.email}`);

             } catch (sendErr) {
                 console.error("Send Failed", sendErr);
                 await supabaseAdmin.from('campaign_progress').upsert({
                    campaign_id: schedule.campaign_id,
                    lead_id: lead.id,
                    email_account_id: account.id,
                    status: 'failed',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'campaign_id,lead_id' });
             }
        }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
     console.error("Global Error:", err);
     return new Response(String(err?.message ?? err), { status: 500 });
  }
});
