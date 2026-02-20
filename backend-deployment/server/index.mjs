import 'dotenv/config'; // triggerrestart

import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { validateEmail } from './email-validation.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL ERROR: SUPABASE_URL or SUPABASE_ANON_KEY is missing from environment variables.');
}

// Create client only if vars exist to prevent crash, otherwise null
const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const app = express();

// CORS must be first — before all routes and body parsers
const corsOptions = {
  origin: true, // Reflect request origin to allow all
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-campaign-id']
};
app.use(cors(corsOptions));

// Handle preflight requests explicitly with the same config
app.options('*', cors(corsOptions));

app.use(express.json());

// Add a root route for health check
app.get('/', (req, res) => {
  res.send('ColdSpark Backend API is running. Time: ' + new Date().toISOString());
});
app.get('/api', (req, res) => {
  res.send('API Root Accessible');
});

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-d703ac9c0fe74d05b1693c50a81ea9bc';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

app.post('/api/generate-sequences', async (req, res) => {
  try {
    const { campaignName, niche, company, contactNumber, primaryEmail, count = 5 } = req.body;

    const systemPrompt = `You are a top-tier B2B Cold Outreach Marketer.
Your goal is to write a 5-STEP SEQUENCE that feels professional, credible, and human.
Style: Professional, concise, respectful, yet friendly and witty. You are a peer starting a conversation, not a desperate salesperson.
CRITICAL: The first email must be VALUE-LED and RELATABLE. Use the [[notes]] placeholder to prove you've done research, but ensure it has MEANING.

Structure:
Step 1: The Hook. MUST use this exact opening structure: "Hi {{first_name}},\n\nSaw [[notes]] and thought it was a clever approach in the {{industry}} space. Your work as {{title}} at {{company}} in {{location}} caught my attention." Then, transition into a meaningful point about why you are reaching out. (Target 60-80 words).
Step 2: The value proposition. Connect their context to your solution. (MAX 75 words).
Step 3: The Insight. Share a brief industry insight or case study hint.
Step 4: The Break-up. Professional but lighthearted.
Step 5: Final courtesy.

Rules:
1. Length: Max 100 words per email. Concise is professional.
2. Tone: Professional B2B. Confident, not arrogant. Witty, not silly.
3. Formatting: Standard email format. Use normal newlines for paragraphs. NO HTML TAGS.
   - Structure: Greeting -> empty line -> Body.
   - CRITICAL: DO NOT INCLUDE A SIGN-OFF (e.g. "Cheers", "Best", "Sincerely"). This is added automatically.
4. Placeholders:
   - {{company}}: Lead's company
   - {{first_name}}: Lead's first name
   - {{title}}: Lead's job title
   - {{location}}: Lead's city/location
   - {{industry}}: Lead's specific industry.
   - [[notes]]: Specific notes/observations about the lead.
   - <company>, <contactnumber>, <primaryemail>: Your details.
5. GENERICITY: DO NOT assume specific assets unless known.
   - BAD: "Saw your truck at [[notes]]"
   - GOOD: "Saw [[notes]] and was impressed."
   - Rule: The text AROUND the placeholders must be 100% generic but sound specific when filled.
   - AVOID CREEPINESS: Do not mention personal details or things that sound like you are stalking them. Stick to professional observations.
6. GRAMMAR: Do NOT use "As a {{title}}...". It sounds like YOU are the {{title}}.
   - GOOD: "Your work as CEO is impressive."
7. NATURAL FLOW: DO NOT "stuff" placeholders. Use them where they sound human.
8. MANDATORY: You MUST generate EXACTLY 5 emails (Step 1 to Step 5).
9. SUBJECT LINES: Professional, concise, internal-sounding.
   - RULE: Always use Sentence case (Capitalize the first letter). Never use all lowercase.
   - GOOD: "Thoughts on {{company}}", "Question for {{first_name}}", "Connect", "Referral", "Chat?".
   - BAD: "regarding {{company}}" (bad capitalization), "Partnership opportunity" (too salesy), "Quick question" (cliché).
10. Output Format: JSON object with "sequences" array (EXACTLY 5 objects).
   - "name": "Step 1...", "Step 2...", etc.
   - "subject": Short, professional, properly capitalized.
   - "content": REQUIRED. DO NOT INCLUDE SIGN-OFF.
`;

    const userPrompt = `Generate ${count} MASTER TEMPLATES for a cold outreach campaign in the "${niche}" niche.
Structure: 5 Steps. Step 1 MUST be a "Hook" based on the leads' notes.
Use the [[notes]] placeholder as the anchor for personalization. DO NOT invent specific facts.`;

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
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
        ],
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    console.log('DeepSeek Response:', data);

    if (data.error) {
      throw new Error(data.error.message || 'DeepSeek API Error');
    }

    const contentString = data.choices[0].message.content;
    console.log('AI Content:', contentString);

    const content = JSON.parse(contentString);

    // Improved normalization: Look for any array in the object if sequences/emails not found
    let sequences = Array.isArray(content) ? content : (content.sequences || content.emails);

    if (!sequences && typeof content === 'object') {
      // Fallback: search for the first property that is an array
      const firstArrayKey = Object.keys(content).find(key => Array.isArray(content[key]));
      if (firstArrayKey) {
        sequences = content[firstArrayKey];
      }
    }

    sequences = sequences || [];

    res.json({ success: true, data: sequences });
  } catch (error) {
    console.error('Sequence Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate sequences'
    });
  }
});
app.post('/api/generate-lead-emails', async (req, res) => {
  try {
    const { campaignId, leads, templateContent, templateSubject, company, contactNumber, primaryEmail } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new Error('No leads provided');
    }

    const results = [];

    // Process leads in parallel but with a small concurrency limit to avoid hitting DeepSeek rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (lead) => {
        const systemPrompt = `You are a professional B2B Cold Outreach Marketer.
REWRITE this email template for a lead.
Goal: Use the provided NOTES to make a highly relatable, credible observation that feels meaningful and not creepy.
Instructions:
1. Replace [[notes]] with a specific, professional, witty observation based on the provided notes/summary.
2. Tone: "I did my research". Professional, confident, friendly.
3. Length: Keep it strictly to the template length.
4. AVOID CREEPINESS: Do not mention specific personal details that sound like stalking. Stick to professional observations.
5. DO NOT include a sign-off (e.g. "Cheers"). It is added automatically.
6. Output: JSON ("subject", "content").

Context:
Sender: ${company || 'Our Company'}
Lead: ${lead.company}
Notes: "${lead.summary || 'General interest'}"

Template Subject: ${templateSubject}
Template Body: ${templateContent}`;

        const userPrompt = `Rewrite the email template for the contact at ${lead.company}.
Use this background summary for context: "${lead.summary || 'General outreach'}".
CRITICAL: Do not just copy-paste the summary. If the summary is "View the online menu...", say something like "I saw you have a great menu online..." instead.
Ensure the witty tone of the template is preserved but made specific to them.
Return ONLY a JSON object with 'subject' and 'content' keys.`;

        try {
          const aiResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
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
              ],
              response_format: { type: 'json_object' }
            })
          });

          const data = await aiResponse.json();
          if (data.error) throw new Error(data.error.message);

          const personalized = JSON.parse(data.choices[0].message.content);

          return {
            leadId: lead.id,
            subject: personalized.subject,
            content: personalized.content
          };
        } catch (err) {
          console.error(`Error personalizing for lead ${lead.id}:`, err);
          return { leadId: lead.id, error: err.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Lead personalization Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to personalize emails'
    });
  }
});
app.post('/api/verify-smtp', async (req, res) => {
  try {
    const { host, port, email, password } = req.body;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: email,
        pass: password,
      },
    });

    await transporter.verify();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    });
  }
});

app.post('/api/verify-imap', async (req, res) => {
  try {
    const { host, port, email, password } = req.body;

    const client = new ImapFlow({
      host,
      port,
      secure: port === 993,
      auth: {
        user: email,
        pass: password,
      },
    });

    await client.connect();
    await client.logout();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'IMAP verification failed'
    });
  }
});

import { scrapeGoogleMaps, scrapeLinkedIn, scrapeGeneralSearch, performDeepResearch } from './scraper.mjs';

// User-specific stores for live updates
const userLogs = new Map();
const userResults = new Map();
const activeScrapes = new Map();

app.get('/api/scraper-active', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.json({ active: false });

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.json({ active: false });

    res.json({ active: activeScrapes.get(user.id) || false });
  } catch (e) {
    res.json({ active: false });
  }
});

app.get('/api/scraper-logs', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.json([]);

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.json([]);

    res.json(userLogs.get(user.id) || []);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/scraper-results', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.json([]);

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.json([]);

    const results = userResults.get(user.id) || [];
    console.log(`[API] Serving ${results.length} leads to user ${user.id}.`);
    res.json(results);
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/deep-research', async (req, res) => {
  try {
    const { company, website, notesContext } = req.body;
    if (!company) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }

    const report = await performDeepResearch(company, website, notesContext);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Deep Research API Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Deep Research failed'
    });
  }
});

app.post('/api/scrape-leads', async (req, res) => {
  let user;
  try {
    const { platforms, business, location, keywords, notesContext, limit = 75 } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    user = authUser;

    // Initialize user-specific stores
    userLogs.set(user.id, []);
    userResults.set(user.id, []);
    activeScrapes.set(user.id, true);

    const log = (message) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${user.id}] ${message}`);
      const logs = userLogs.get(user.id) || [];
      logs.push({ timestamp, message });
      if (logs.length > 500) logs.shift();
      userLogs.set(user.id, logs);
    };

    const onResult = async (lead) => {
      const results = userResults.get(user.id) || [];
      const exists = results.some(r => (r.email && r.email === lead.email) || (r.website && r.website === lead.website && r.company === lead.company));

      if (!exists) {
        results.push(lead);
        userResults.set(user.id, results);
        console.log(`[Main Server] Added lead for ${user.id}: ${lead.company} <${lead.email}>`);

        // Save to Supabase
        const scopedSupabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY,
          { global: { headers: { Authorization: authHeader } } }
        );

        const leadData = {
          user_id: user.id,
          company: lead.company || '',
          email: lead.email || '',
          website: lead.website || '',
          location: lead.location || '',
          phone: lead.phone || '',
          summary: lead.summary || '',
          source: lead.source || 'scraped',
          status: 'new',
          facebook: lead.facebook || '',
          twitter: lead.twitter || '',
          instagram: lead.instagram || '',
          role: lead.role || '',
          name: lead.name || ''
        };

        const { error } = await scopedSupabase
          .from('leads')
          .insert(leadData);

        if (error) {
          console.error('[Main Server] Error saving lead to DB:', error.message);
        }
      }
    };

    log(`Starting scrape for "${business}" in "${location}"... (target: ${limit} leads with emails)`);
    if (notesContext) log(`Custom Notes Focus: ${notesContext}`);

    // ✅ RESPOND IMMEDIATELY — scrape runs in background so navigating away doesn't stop it
    res.json({ success: true, message: 'Scrape started in background. Check logs for progress.' });

    // Run scraping in background (no await — response already sent)
    const runScrape = async () => {
      try {
        if (platforms.google || platforms.all) {
          const query = `${business || keywords} in ${location}`;
          await scrapeGoogleMaps(query, limit, log, onResult, notesContext);
        }

        if (platforms.linkedin || platforms.all) {
          const jobRole = req.body.jobRole || '';
          const businessPart = business ? business : '';
          const rolePart = jobRole ? jobRole : '';
          const locationPart = location ? location : '';
          const linkedInQuery = `site:linkedin.com/in/ ${rolePart} ${businessPart} ${locationPart} ${keywords || ''}`.trim();
          await scrapeLinkedIn(linkedInQuery, limit, log, onResult, notesContext);
        }

        if (platforms.general || platforms.all) {
          const jobRole = req.body.jobRole || '';
          const rolePart = jobRole ? `"${jobRole}"` : '';
          const businessPart = business ? `"${business}"` : (keywords || '');
          const businessQuery = `${rolePart} ${businessPart} ${location} email contact`.trim();
          await scrapeGeneralSearch(businessQuery, limit, log, onResult, notesContext);
        }

        const finalCount = (userResults.get(user.id) || []).length;
        log(`✅ Scrape complete. ${finalCount} leads with emails saved.`);
      } catch (bgError) {
        console.error('[Background Scrape Error]', bgError);
        log(`❌ Scrape error: ${bgError.message}`);
        try {
          fs.appendFileSync('debug_error.log', `[${new Date().toISOString()}] BG Scrape Error: ${bgError.stack || bgError.message}\n`);
        } catch (e) { }
      } finally {
        activeScrapes.set(user.id, false);
        log('Scraper finished.');
      }
    };

    // Fire and forget
    runScrape();

  } catch (error) {
    console.error('Scraping API Error:', error);
    if (user?.id) {
      const logs = userLogs.get(user.id) || [];
      logs.push({ timestamp: new Date().toLocaleTimeString(), message: `ERROR: ${error.message}` });
      userLogs.set(user.id, logs);
      activeScrapes.set(user.id, false);
    }
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Scraping failed' });
    }
  }
});





app.get('/api/emails', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const refresh = req.query.refresh === 'true';

    // specific client for this user request
    const scopedSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Fetch all email accounts for this user
    const { data: emailAccounts, error: accountsError } = await scopedSupabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id);

    if (accountsError) {
      throw new Error(`Failed to fetch email accounts: ${accountsError.message}`);
    }

    if (!emailAccounts || emailAccounts.length === 0) {
      return res.json({ success: true, data: [], errors: [] });
    }

    // Check if we have emails in DB
    const { count, error: countError } = await scopedSupabase
      .from('inbox_emails')
      .select('*', { count: 'exact', head: true })
      .in('email_account_id', emailAccounts.map(a => a.id));

    const shouldSync = refresh || count === 0;

    const accountErrors = [];

    if (shouldSync) {
      console.log(`Syncing emails for ${emailAccounts.length} accounts...`);

      // Process accounts serially
      const TIMEOUT_MS = 60000; // Increased timeout for sync
      const MAX_CONCURRENT = 1;

      const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );

      const accountChunks = chunk(emailAccounts, MAX_CONCURRENT);

      for (const batch of accountChunks) {
        await Promise.all(batch.map(async (account) => {
          if (!account.imap_host || !account.encrypted_password) return;

          let client;
          try {
            const fetchPromise = async () => {
              // Decrypt password
              const { data: decryptedPassword, error: decryptError } = await scopedSupabase
                .rpc('decrypt_password', {
                  encrypted_password: account.encrypted_password
                });

              if (decryptError) {
                throw new Error('Decrypt failed');
              }

              client = new ImapFlow({
                host: account.imap_host,
                port: account.imap_port,
                secure: account.imap_port === 993,
                auth: {
                  user: account.email,
                  pass: decryptedPassword
                },
                logger: false
              });

              await client.connect();

              const fetchRecent = async (path, folderType) => {
                try {
                  let lock = await client.getMailboxLock(path);
                  try {
                    const status = await client.status(path, { messages: true });
                    const total = status.messages;
                    if (total === 0) {
                      lock.release();
                      return;
                    }

                    // Fetch more emails for initial/sync load (e.g., last 50)
                    const fetchCount = 50;
                    const start = Math.max(1, total - (fetchCount - 1));
                    const range = `${start}:*`;

                    for await (const message of client.fetch(range, { envelope: true, source: true, uid: true, flags: true })) {
                      const parsed = await simpleParser(message.source);
                      const isRead = message.flags && message.flags.has ? message.flags.has('\\Seen') : false;

                      const emailData = {
                        email_account_id: account.id,
                        uid: message.uid,
                        folder: folderType,
                        from: parsed.from?.text || 'Unknown',
                        to: parsed.to?.text || 'Unknown',
                        subject: parsed.subject || '(No Subject)',
                        received_at: parsed.date || new Date(),
                        snippet: parsed.text ? parsed.text.substring(0, 100) : '',
                        body_text: parsed.text,
                        body_html: parsed.html || parsed.textAsHtml, // Fallback if needed
                        is_read: isRead,
                        campaign_id: parsed.headers.get('x-campaign-id') || null
                      };

                      // Upsert to DB
                      await scopedSupabase
                        .from('inbox_emails')
                        .upsert(emailData, {
                          onConflict: 'email_account_id,folder,uid'
                        });
                    }
                  } finally {
                    lock.release();
                  }
                } catch (err) {
                  console.warn(`[${account.email}] Could not fetch ${path}: ${err.message}`);
                }
              };

              await fetchRecent('INBOX', 'inbox');

              // Try to guess Sent folder
              const listed = await client.list();
              const sentFolder = listed.find(f =>
                f.specialUse === '\\Sent' ||
                f.name === 'Sent' ||
                f.name === 'Sent Items' ||
                f.path === '[Gmail]/Sent Mail' ||
                f.path === 'INBOX.Sent'
              );

              if (sentFolder) {
                await fetchRecent(sentFolder.path, 'sent');
              }

              await client.logout();
            };

            await Promise.race([
              fetchPromise(),
              new Promise((_, reject) =>
                setTimeout(() => {
                  if (client) {
                    client.close();
                  }
                  reject(new Error('Connection timed out'));
                }, TIMEOUT_MS)
              )
            ]);

          } catch (err) {
            console.error(`Error processing account ${account.email}:`, err.message);
            accountErrors.push({ email: account.email, error: err.message });
          }
        }));
      }
    }

    // Return emails from DB
    let query = scopedSupabase
      .from('inbox_emails')
      .select('*')
      .in('email_account_id', emailAccounts.map(a => a.id));

    if (req.query.campaignId && req.query.campaignId !== 'undefined') {
      query = query.eq('campaign_id', req.query.campaignId);
    }

    if (req.query.emailAccountId && req.query.emailAccountId !== 'undefined') {
      query = query.eq('email_account_id', req.query.emailAccountId);
    }

    const { data: allEmails, error: fetchError } = await query
      .order('received_at', { ascending: false })
      .limit(200); // Limit return size for performance

    if (fetchError) {
      throw new Error(`Failed to fetch emails from DB: ${fetchError.message}`);
    }

    // Transform for frontend
    const transformedEmails = allEmails.map(email => {
      // Find account email
      const account = emailAccounts.find(a => a.id === email.email_account_id);
      return {
        id: email.id,
        uid: email.uid,
        accountId: email.email_account_id,
        from: email.from,
        to: email.to,
        subject: email.subject,
        date: email.received_at,
        snippet: email.snippet,
        folder: email.folder,
        isRead: email.is_read,
        html: email.body_html,
        text: email.body_text,
        accountEmail: account ? account.email : 'Unknown'
      };
    });

    res.json({ success: true, data: transformedEmails, errors: accountErrors });

  } catch (error) {
    console.error('Email fetch error:', error);
    try {
      fs.appendFileSync('server.log', `[${new Date().toISOString()}] /api/emails Error: ${error.stack || error.message}\n`);
    } catch (e) { console.error('Failed to write to log', e); }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch emails'
    });
  }
});

app.post('/api/emails/action', async (req, res) => {
  try {
    const { emailAccountId, uids, action, folder } = req.body;

    if (!emailAccountId || !uids || !Array.isArray(uids) || uids.length === 0 || !action) {
      throw new Error('Missing required fields');
    }

    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error('Missing authorization header');
    const token = authHeader.replace('Bearer ', '');

    const scopedSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await scopedSupabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // Get Account
    const { data: account, error: accountError } = await scopedSupabase
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) throw new Error('Email account not found');

    // Decrypt Password
    const { data: decryptedPassword, error: decryptError } = await scopedSupabase
      .rpc('decrypt_password', { encrypted_password: account.encrypted_password });

    if (decryptError) throw new Error('Decrypt failed');

    const client = new ImapFlow({
      host: account.imap_host,
      port: account.imap_port,
      secure: account.imap_port === 993,
      auth: { user: account.email, pass: decryptedPassword },
      logger: false
    });

    await client.connect();

    try {
      let lock = await client.getMailboxLock('INBOX');
      try {
        let actualPath = 'INBOX';

        if (folder === 'sent') {
          const listed = await client.list();
          const sentF = listed.find(f => f.specialUse === '\\Sent' || f.name === 'Sent' || f.path === '[Gmail]/Sent Mail');
          if (sentF) actualPath = sentF.path;
        }

        if (actualPath !== 'INBOX') {
          lock.release();
          lock = await client.getMailboxLock(actualPath);
        }

        if (action === 'delete') {
          // IMAP Delete
          const listed = await client.list();
          const trashResults = listed.find(f => f.specialUse === '\\Trash' || f.name === 'Trash' || f.name === 'Bin' || f.path === '[Gmail]/Trash');

          if (trashResults) {
            await client.messageMove(uids, trashResults.path, { uid: true });
          } else {
            await client.messageDelete(uids, { uid: true });
          }

          // DB Delete
          await scopedSupabase
            .from('inbox_emails')
            .delete()
            .eq('email_account_id', emailAccountId)
            .in('uid', uids)
            .eq('folder', folder);

        } else if (action === 'archive') {
          // IMAP Archive
          const listed = await client.list();
          const archiveFolder = listed.find(f =>
            f.specialUse === '\\Archive' ||
            f.name === 'Archive' ||
            f.path === '[Gmail]/All Mail'
          );

          if (archiveFolder) {
            await client.messageMove(uids, archiveFolder.path, { uid: true });

            // DB Archive
            await scopedSupabase
              .from('inbox_emails')
              .update({ folder: 'archive' })
              .eq('email_account_id', emailAccountId)
              .in('uid', uids)
              .eq('folder', folder);
          } else {
            throw new Error('Archive folder not found');
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Action error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Action failed'
    });
  }
});

app.post('/api/validate-email', async (req, res) => {
  try {
    const { email, leadId } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Optional: caching/persistence logic if leadId and auth provided
    const authHeader = req.headers.authorization;
    let scopedSupabase = null;

    if (authHeader && leadId) {
      scopedSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: authHeader } } }
      );

      // Check if already valid
      const { data: lead, error: fetchError } = await scopedSupabase
        .from('leads')
        .select('validation_status, validation_details')
        .eq('id', leadId)
        .single();

      if (!fetchError && lead && lead.validation_status === 'valid') {
        console.log(`[Validation] Returning cached valid status for lead ${leadId}`);
        return res.json({
          success: true,
          isValid: true,
          details: lead.validation_details || 'Valid (Cached)',
          cached: true
        });
      }
    }

    // Run validation
    const result = await validateEmail(email);

    // Save result if we can
    if (scopedSupabase && leadId) {
      const status = result.isValid ? (result.warning ? 'warning' : 'valid') : 'invalid';
      const details = result.isValid ? (result.warning ? result.details : 'Valid') : (result.reason || 'Invalid');

      await scopedSupabase
        .from('leads')
        .update({
          validation_status: status,
          validation_details: details
        })
        .eq('id', leadId);
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ success: false, error: 'Validation failed' });
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { from, to, subject, text, smtp, emailAccountId } = req.body;

    // Get email account warmup settings
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create a scoped Supabase client for this request to ensure RLS policies work
    const scopedSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await scopedSupabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('User not authenticated');
    }
    console.log('User found:', user.id);
    console.log('Looking for email account:', emailAccountId);

    const { data: emailAccount, error: accountError } = await scopedSupabase
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !emailAccount) {
      console.error('Account search error:', accountError);
      throw new Error('Email account not found or access denied');
    }
    console.log('Email account found:', emailAccount.id);

    let emailsSentToday = 0;
    const today = new Date().toISOString().split('T')[0];

    // Check warmup settings if enabled
    if (emailAccount.warmup_enabled && emailAccount.warmup_status === 'enabled') {
      // Get today's warmup progress
      const { data: warmupProgress, error: progressError } = await scopedSupabase
        .from('email_warmup_progress')
        .select('emails_sent')
        .eq('email_account_id', emailAccountId)
        .eq('date', today)
        .single();

      if (progressError && !progressError.message.includes('No rows found')) {
        throw new Error('Failed to check warmup progress');
      }

      emailsSentToday = warmupProgress?.emails_sent || 0;

      // Check daily limit with ramp-up logic
      let effectiveLimit = emailAccount.warmup_daily_limit;

      if (emailAccount.warmup_start_date && emailAccount.warmup_increase_per_day > 0) {
        const startDate = new Date(emailAccount.warmup_start_date);
        const now = new Date();
        const diffTime = now.getTime() - startDate.getTime(); // Use getTime() explicitly
        const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        // Calculate limit: (Day 1 * increase)
        // Day 0 (start date) = increase
        const calculatedLimit = (diffDays + 1) * emailAccount.warmup_increase_per_day;

        effectiveLimit = Math.min(emailAccount.warmup_daily_limit, calculatedLimit);
        console.log(`[Warmup] Account ${emailAccount.email}: Day ${diffDays + 1}, effective limit ${effectiveLimit}/${emailAccount.warmup_daily_limit}`);
      }

      if (emailsSentToday >= effectiveLimit) {
        throw new Error(`Daily warmup limit of ${effectiveLimit} emails reached`);
      }

      // Check if subject contains filter tag if specified
      if (emailAccount.warmup_filter_tag && !subject.includes(emailAccount.warmup_filter_tag)) {
        throw new Error(`Email subject must contain warmup filter tag: ${emailAccount.warmup_filter_tag}`);
      }
    }

    // Check if we have an encrypted password
    if (!smtp.auth.pass) {
      throw new Error('Email account credentials key is missing. Please remove and re-add this email account to fix security settings.');
    }

    // Decrypt password
    const { data: decryptedPassword, error: decryptError } = await scopedSupabase
      .rpc('decrypt_password', {
        encrypted_password: smtp.auth.pass
      });

    if (decryptError) {
      throw new Error('Failed to decrypt password');
    }

    // Create transporter using SMTP settings
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.auth.user,
        pass: decryptedPassword
      }
    });

    // Format Sender Name
    let finalFrom = from;
    if (emailAccount.name && (from === emailAccount.email || from.includes(emailAccount.email))) {
      // Only override if it looks like just an email or matches the account email
      // But nodemailer handles "Name <email>" fine. 
      // If 'from' passed is just 'email@domain.com', change it.
      if (!from.includes('<')) {
        finalFrom = `"${emailAccount.name}" <${emailAccount.email}>`;
      }
    }

    // Append Signature
    let finalText = text;
    if (emailAccount.signature) {
      finalText = `${text}\n\n--\n${emailAccount.signature}`;
    }

    // Send email
    await transporter.sendMail({
      from: finalFrom,
      to,
      subject,
      text: finalText
    });

    // Update warmup progress if enabled
    if (emailAccount.warmup_enabled && emailAccount.warmup_status === 'enabled') {
      const today = new Date().toISOString().split('T')[0];

      // Upsert warmup progress
      const { error: upsertError } = await supabase
        .from('email_warmup_progress')
        .upsert({
          email_account_id: emailAccountId,
          date: today,
          emails_sent: emailsSentToday + 1
        }, {
          onConflict: 'email_account_id,date'
        });

      if (!upsertError) {
        // Also update the last_warmup_sent_at timestamp on the account
        await supabase
          .from('email_accounts')
          .update({ last_warmup_sent_at: new Date().toISOString() })
          .eq('id', emailAccountId);
      }

      if (upsertError) {
        throw new Error('Failed to update warmup progress');
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

export default app;
