// import puppeteer from 'puppeteer'; // Removed for dynamic import
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { validateEmail, validateEmailFast } from './email-validation.mjs';
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const getChromePath = () => {
    // 1. Try generic system paths
    const paths = [
        '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium', '/usr/bin/chromium-browser',
        '/usr/bin/brave-browser'
    ];
    for (const p of paths) if (fs.existsSync(p)) return p;

    // 2. Try User Cache (Generic search)
    try {
        const homedir = os.homedir();
        const cacheRoot = path.join(homedir, '.cache/puppeteer');
        if (fs.existsSync(cacheRoot)) {
            // Find 'chrome' binary recursively that is executable
            // Try to find the chrome binary inside cache
            const out = execSync(`find "${cacheRoot}" -name chrome -type f -executable 2>/dev/null | head -n 1`, { timeout: 3000 });
            const found = out.toString().trim();
            if (found && fs.existsSync(found)) return found;
        }
    } catch (e) { console.error('Error finding chrome in cache:', e); }

    return null;
};

const createLogger = (onLog) => (message) => {
    console.log(message);
    if (onLog && typeof onLog === 'function') {
        try {
            onLog(message);
        } catch (e) {
            console.error('Error in onLog callback:', e);
        }
    }
};


// Helper: Clean text
const cleanText = (text) => {
    return text
        .replace(/\s+/g, ' ')
        .trim();
};

// Helper to auto-scroll a page (for websites) to trigger lazy loads
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 15000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 50); // Fast scroll
        });
    });
}

// Helper to setup browser consistently
async function setupBrowser(log) {
    let browser;
    let puppeteer;
    let executablePath = null;
    let args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--start-maximized'
    ];

    // STRATEGY: Prioritize @sparticuz/chromium because standard Chrome is broken on this server (missing libs).
    // Even if 'puppeteer' is installed, we should avoid using its bundled chrome.

    // 1. Try Sparticuz (Preferred for cPanel/Serverless)
    try {
        const localTmp = path.join(os.homedir(), 'api.relaysolutions.net', '.local_chrome');
        if (!fs.existsSync(localTmp)) { fs.mkdirSync(localTmp, { recursive: true }); }

        // CRITICAL Environment setup for Sparticuz
        process.env.TMPDIR = localTmp;
        process.env.HOME = localTmp;

        const sparticuz = require('@sparticuz/chromium');
        // sparticuz.setHeadlessMode = true; // explicitly set headless
        // sparticuz.setGraphicsMode = false;

        executablePath = await sparticuz.executablePath();
        args = [...sparticuz.args, '--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'];

        const { addExtra } = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer = addExtra(require('puppeteer-core'));
        puppeteer.use(StealthPlugin());
        log('Using @sparticuz/chromium + puppeteer-core (Stealth Match)');

    } catch (e) {
        log(`Sparticuz failed/missing: ${e.message}. Falling back to standard puppeteer.`);

        // 2. Fallback to Standard Puppeteer
        try {
            const { addExtra } = require('puppeteer-extra');
            const StealthPlugin = require('puppeteer-extra-plugin-stealth');
            puppeteer = addExtra(require('puppeteer'));
            puppeteer.use(StealthPlugin());
            log('Using puppeteer-extra with stealth plugin.');
        } catch (e2) {
            // 3. Last Ditch: Puppeteer Core only (expects local chrome)
            try {
                const { addExtra } = require('puppeteer-extra');
                const StealthPlugin = require('puppeteer-extra-plugin-stealth');
                puppeteer = addExtra(require('puppeteer-core'));
                puppeteer.use(StealthPlugin());

                const exe = getChromePath();
                if (exe) {
                    executablePath = exe;
                    log(`Using local chrome discovery (Stealth): ${exe}`);
                }
            } catch (e3) {
                throw new Error('Puppeteer dependency missing (All methods failed).');
            }
        }
    }

    if (process.env.BROWSER_WS_ENDPOINT) {
        log(`Connecting to remote browser...`);
        browser = await puppeteer.connect({ browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT });
    } else {
        const launchOptions = {
            headless: "new",
            args: args,
            ignoreHTTPSErrors: true
        };
        if (executablePath) launchOptions.executablePath = executablePath;

        browser = await puppeteer.launch(launchOptions);
    }
    return { browser, puppeteer };
}

export async function scrapeGoogleMaps(query, limit = 50, onLog = null, onResult = null, notesContext = '') {
    const log = createLogger(onLog);
    // Increase limit for variety - minimal 75
    const targetLimit = Math.max(limit, 75);
    log(`Starting Google Maps scraper for: ${query} (Target: ${targetLimit})`);

    let browser;
    let puppeteer;
    try {
        log('Launching browser...');
        const setup = await setupBrowser(log);
        browser = setup.browser;
        puppeteer = setup.puppeteer;
        log('Browser launched successfully.');
    } catch (e) {
        log(`CRITICAL: Browser Launch Failed: ${e.message}`);
        return [];
    }

    try {
        process.env.TZ = 'America/New_York'; // Helps with some scraping issues

        log('Opening new page...');
        const page = await browser.newPage();

        // Ensure browser is closed if page crashes
        page.on('error', err => log(`Page Error: ${err.message}`));

        // Set huge viewport to find more results without scrolling initially
        await page.setViewport({ width: 1440, height: 900 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        log('Navigating to Google Maps...');
        // Use domcontentloaded — networkidle2 hangs on Google Maps (it never goes fully idle)
        await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 30000 });
        // Extra wait for the JS to render the search box
        await new Promise(r => setTimeout(r, 3000));
        log('Google Maps loaded.');

        // helper to handle consent
        const handleConsent = async () => {
            try {
                const consentSelectors = [
                    'button[aria-label="Accept all"]',
                    'button[aria-label="Agree to the use of cookies and other data for the purposes described"]',
                    'form[action*="consent"] button',
                    'div[role="dialog"] button:last-of-type'
                ];
                for (const selector of consentSelectors) {
                    if (await page.$(selector)) {
                        await page.click(selector);
                        await page.waitForNavigation({ timeout: 5000 }).catch(() => { });
                        return;
                    }
                }
            } catch (e) { }
        };

        await handleConsent();
        log('Consent handled. Looking for search box...');

        // Robust Search Box Finding
        const searchSelectors = [
            '#searchboxinput',
            'input[name="q"]',
            'input[aria-label*="Search"]',
            'input[aria-label*="Suche"]',
            'input#searchbox-searchbutton + input',
            '#searchbox form input'
        ];

        let searchInputSelector = null;

        for (const selector of searchSelectors) {
            try {
                if (await page.$(selector)) {
                    searchInputSelector = selector;
                    log(`Found search box: ${selector}`);
                    break;
                }
                // Short wait for each
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    if (await page.$(selector)) {
                        searchInputSelector = selector;
                        break;
                    }
                } catch (e) { }
            } catch (e) { }
        }

        if (!searchInputSelector) {
            log('Search box ID not found, trying generic input...');
            try {
                await page.waitForSelector('input', { timeout: 5000 });
                searchInputSelector = 'input';
            } catch (e) { }
        }

        if (!searchInputSelector) {
            throw new Error(`Could not find search box.`);
        }

        log(`Using search selector: ${searchInputSelector}`);

        // Ensure clear and type
        await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) el.value = '';
        }, searchInputSelector);

        await page.type(searchInputSelector, query);
        await page.keyboard.press('Enter');

        try {
            await page.waitForSelector('div[role="feed"]', { timeout: 10000 });
        } catch (e) {
            // Fallback for single result
        }

        const leads = [];
        const processedIds = new Set();
        let noNewResultsCount = 0;
        let noNewElementsStreak = 0;
        let totalProcessed = 0;
        let leadsWithEmail = 0; // Track leads that actually have emails
        const feedSelector = 'div[role="feed"]';

        // Keep scrolling until we have targetLimit leads WITH emails
        while (leadsWithEmail < targetLimit && noNewResultsCount < 60) {
            const elements = await page.$$('div[role="article"]');

            if (elements.length === 0 && leadsWithEmail === 0) {
                log('WARNING: Google Maps returned 0 local business results. This usually means your server IP was blocked by a CAPTCHA/Consent screen, or the search query found no matches.');
            }

            // Collect unprocessed elements first
            const pendingElements = [];
            for (const el of elements) {
                if (leadsWithEmail >= targetLimit) break;

                const ariaLabel = await el.evaluate(e => e.getAttribute('aria-label'));
                if (processedIds.has(ariaLabel)) continue;

                // RELEVANCE FILTER: Check if name matches query context
                const lowerName = ariaLabel.toLowerCase();
                const lowerQuery = query.toLowerCase();

                // Simple negative keywords based on common mixups or map ads
                if (lowerQuery.includes('food') || lowerQuery.includes('market') || lowerQuery.includes('truck')) {
                    if (lowerName.includes('car wash') ||
                        lowerName.includes('mechanic') ||
                        lowerName.includes('repair') ||
                        lowerName.includes('accountant') ||
                        lowerName.includes('solicitor') ||
                        lowerName.includes('dental') ||
                        lowerName.includes('clinic')) {
                        log(`Skipped ${ariaLabel}: Irrelevant to food query.`);
                        continue;
                    }
                }

                processedIds.add(ariaLabel);
                totalProcessed++;

                pendingElements.push({ el, ariaLabel });
            }

            // Process in batches of 5 to avoid overwhelming the server
            const BATCH_SIZE = 5;
            for (let batchStart = 0; batchStart < pendingElements.length; batchStart += BATCH_SIZE) {
                if (leadsWithEmail >= targetLimit) break;
                const batch = pendingElements.slice(batchStart, batchStart + BATCH_SIZE);
                const batchPromises = batch.map(item => (async () => {
                    const { el, ariaLabel } = item;
                    try {
                        // Helper for robust phone extraction (UK focus)
                        const extractPhoneNumber = (str) => {
                            if (!str) return '';
                            const ukSpecific = str.match(/(?:(?:\+|00)44|(?<!\d)44|(?<!\d)0)(?:2|7)[\d\s-]{8,13}/);
                            if (ukSpecific) return ukSpecific[0].replace(/\s+/g, ' ').trim();
                            const intlMatch = str.match(/(\+|00)[0-9][0-9\s-]{8,20}[0-9]/);
                            if (intlMatch) return intlMatch[0].replace(/\s+/g, ' ').trim();
                            return '';
                        };

                        const text = await el.evaluate(e => e.innerText);
                        let phone = extractPhoneNumber(text);

                        const getCleanUrl = (url) => {
                            if (!url) return '';
                            if (url.includes('google.com/viewer')) return '';
                            if (url.includes('google.com/aclk') || url.includes('google.com/url')) {
                                try {
                                    const extracted = url.split('adurl=')[1] || url.split('q=')[1];
                                    if (extracted) {
                                        return decodeURIComponent(extracted).split('&')[0];
                                    }
                                } catch (e) { return url; }
                            }
                            return url;
                        };

                        let websiteUrl = await el.evaluate(e => {
                            const anchors = Array.from(e.querySelectorAll('a'));
                            const webLink = anchors.find(a => {
                                const href = a.href || '';
                                const label = (a.getAttribute('aria-label') || '').toLowerCase();
                                const dataVal = a.getAttribute('data-value');
                                if (href.includes('google.com/maps')) return false;
                                if (dataVal === 'Website' || label.includes('website')) return true;
                                if (href.startsWith('http') && !href.includes('google.com')) return true;
                                return false;
                            });
                            return webLink ? webLink.href : '';
                        });

                        let website = getCleanUrl(websiteUrl);

                        // DEEP SCRAPE: Click if info missing
                        if (!phone && !website) {
                            try {
                                await el.click();
                                await page.waitForTimeout(3500);
                                await page.waitForSelector('div[role="main"]', { timeout: 5000 }).catch(() => { });

                                const sideData = await page.evaluate(() => {
                                    const res = { phone: '', website: '' };
                                    const main = document.querySelector('div[role="main"]');
                                    if (!main) return res;
                                    const candidates = Array.from(main.querySelectorAll('a, button, div[data-item-id]'));
                                    for (const c of candidates) {
                                        const label = (c.getAttribute('aria-label') || '').toLowerCase();
                                        const itemId = c.getAttribute('data-item-id') || '';
                                        const href = c.href || '';
                                        const txt = c.innerText || '';
                                        if (!res.website) {
                                            const isWeb = itemId.includes('authority') || label.includes('website') || (href && !href.includes('google') && !href.includes('fid='));
                                            if (isWeb && href) res.website = href;
                                        }
                                        if (!res.phone) {
                                            const isPhone = itemId.includes('phone') || label.includes('phone') || label.includes('call') || itemId.includes('call');
                                            if (isPhone) {
                                                const phoneRegex = /(?:(?:\+|00)44|(?:\b)44|(?:\b)0)(?:2|7)[\d\s-]{8,13}/;
                                                const m = (label + ' ' + txt).match(phoneRegex);
                                                if (m) res.phone = m[0].replace(/\s+/g, ' ').trim();
                                            }
                                        }
                                    }
                                    return res;
                                });

                                if (sideData.phone && !phone) phone = sideData.phone;
                                if (sideData.website && !website) website = getCleanUrl(sideData.website);
                            } catch (e) { }
                        }

                        if (website && !website.startsWith('http') && !website.includes('google')) website = 'http://' + website;

                        // FALLBACK: If no website found on Maps, Search DuckDuckGo for it!
                        if (!website || website === 'http://' || website.length < 8 || website.includes('google')) {
                            if (website.length < 8) website = '';
                            try {
                                log(`Maps didn't have website for ${ariaLabel}, searching DuckDuckGo...`);
                                const searchQuery = `${ariaLabel} ${query.replace(' in ', ' ')} official site`;
                                const foundUrl = await findWebsiteViaDuckDuckGo(browser, searchQuery);
                                if (foundUrl) {
                                    website = foundUrl;
                                    log(`Found Website via DDG: ${website}`);
                                } else {
                                    log(`DDG Search returned no website for ${ariaLabel}`);
                                }
                            } catch (e) {
                                log(`Fallback Search Error: ${e.message}`);
                            }
                        }

                        // DATA CONTAINERS
                        let email = '';
                        let summary = '';
                        const social = { twitter: '', facebook: '', instagram: '', linkedin: '' };

                        // DIRECTORY FILTER
                        const DIRECTORY_DOMAINS = ['birdeye.com', 'yell.com', 'yellowpages.com', 'yelp.com', 'facebook.com', 'instagram.com', 'checkatrade.com', 'tripadvisor.com', 'trustpilot.com', 'kompass.com', 'cylex-uk.co.uk'];

                        let isDirectory = false;
                        if (website) isDirectory = DIRECTORY_DOMAINS.some(d => website.includes(d));

                        // FAST EMAIL SEARCH VIA DDG (runs first - faster than visiting website)
                        if (!email) {
                            try {
                                const emailResult = await Promise.race([
                                    googleSearchEmail(browser, ariaLabel, website, log),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('Email search timeout')), 25000))
                                ]);
                                if (emailResult && emailResult.email) {
                                    email = emailResult.email;
                                    // Use DDG page text as summary basis if no website visit planned
                                    if (emailResult.pageText && emailResult.pageText.length > 50) {
                                        summary = emailResult.pageText.substring(0, 800);
                                    }
                                }
                            } catch (e) {
                                log(`DDG email search timed out for ${ariaLabel}`);
                            }
                        }

                        // VISIT WEBSITE — always run for phone/social, also gets email if not found yet
                        if (website && !website.includes('google') && !isDirectory) {
                            try {
                                const webData = await Promise.race([
                                    scrapeWebsite(browser, website, log, notesContext, ariaLabel, true), // skipExternalIntel=true
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('Website visit timeout')), 25000))
                                ]);
                                if (webData.email && !email) email = webData.email;
                                if (webData.phone && !phone) phone = webData.phone;
                                if (webData.summary) summary = webData.summary;
                                Object.assign(social, webData.social);
                            } catch (e) {
                                log(`Website visit failed for ${ariaLabel}: ${e.message}`);
                            }
                        }

                        // LAST RESORT: if still no email and no website, try a broader Google search
                        if (!email && !website) {
                            try {
                                const googleEmail = await Promise.race([
                                    googleSearchEmail(browser, ariaLabel, '', log),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('Fallback email search timeout')), 20000))
                                ]);
                                if (googleEmail && googleEmail.email) email = googleEmail.email;
                            } catch (e) { }
                        }

                        // Directory Email Filter
                        if (email) {
                            const emailParts = email.split('@');
                            if (emailParts.length === 2) {
                                const d = emailParts[1].toLowerCase();
                                if (DIRECTORY_DOMAINS.some(dd => d.includes(dd))) {
                                    log(`Dropped ${ariaLabel}: Email domain (${d}) is a directory/aggregator.`);
                                    email = '';
                                }
                            }
                        }

                        // FILTER: Require both company name AND email for cold outreach
                        if (!ariaLabel || !email) {
                            if (!ariaLabel) log(`Dropped: No company name found.`);
                            else log(`Dropped ${ariaLabel}: No email found.`);
                            return null;
                        }

                        leadsWithEmail++;
                        log(`✅ Lead #${leadsWithEmail}: ${ariaLabel} | Email: ${email} | Phone: ${phone || 'none'} | Website: ${website || 'none'}`);

                        return {
                            id: `scraped-${Math.random().toString(36).substr(2, 9)}`,
                            name: '',
                            status: 'New',
                            company: ariaLabel,
                            email, phone, website, summary,
                            role: '',
                            twitter: social.twitter, facebook: social.facebook, instagram: social.instagram, linkedin: social.linkedin,
                            location: query.split(' in ')[1] || 'Unknown',
                            source: 'Google Maps'
                        };
                    } catch (e) { return null; }
                })());

                const batchResults = (await Promise.all(batchPromises)).filter(x => x);
                leads.push(...batchResults);

                // Emit Live Results
                if (onResult && typeof onResult === 'function') {
                    for (const result of batchResults) {
                        onResult(result).catch(err => log(`Error in onResult callback: ${err.message}`));
                    }
                }
            } // end batch loop

            log(`Progress: ${leadsWithEmail} leads with email. (Scanned ${totalProcessed} total)`);

            // SCROLL to load more results
            if (leadsWithEmail < targetLimit) {
                const prevCount = elements.length;
                await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    if (el) el.scrollBy(0, 5000);
                }, feedSelector);
                await page.mouse.wheel({ deltaY: 2000 });
                await new Promise(r => setTimeout(r, 2500));

                const newEls = await page.$$('div[role="article"]');
                if (newEls.length === prevCount) {
                    noNewElementsStreak++;
                    noNewResultsCount++;
                    if (noNewElementsStreak > 3) {
                        log('No new results loading after multiple scrolls. Stopping.');
                        break;
                    }
                    log(`Scrolling for more results... (${noNewResultsCount}/60)`);
                } else {
                    noNewElementsStreak = 0;
                    noNewResultsCount = 0;
                }
            }
        }
        log(`Scraping Complete. Found ${leadsWithEmail} leads with emails (${totalProcessed} total scanned).`);
        return leads;
    } catch (e) {
        log(`CRITICAL Scraper Error: ${e.message}`);
        return [];
    } finally {
        if (browser) {
            try {
                log('Closing browser...');
                await browser.close();
                log('Browser closed.');
            } catch (e) {
                log(`Error closing browser: ${e.message}`);
            }
        }
    }
}

// LinkedIn Scraper using Google Search
export async function scrapeLinkedIn(query, limit = 20, onLog = null, onResult = null, notesContext = '') {
    const log = createLogger(onLog);
    log(`Starting LinkedIn scraper for: ${query}`);

    let browser;
    try {
        const setup = await setupBrowser(log);
        browser = setup.browser;
        return await scrapeGoogleSearch(browser, query, limit, log, 'linkedin', onResult, notesContext);
    } catch (error) {
        log(`LinkedIn Scraping Error: ${error.message}`);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

// General Business Search (Apollo replacement)
export async function scrapeGeneralSearch(query, limit = 20, onLog = null, onResult = null, notesContext = '') {
    const log = createLogger(onLog);
    log(`Starting General Search for: ${query}`);

    let browser;
    try {
        const setup = await setupBrowser(log);
        browser = setup.browser;
        return await scrapeGoogleSearch(browser, query, limit, log, 'general', onResult, notesContext);
    } catch (error) {
        log(`General Scraping Error: ${error.message}`);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

// Shared Google SERP Scraper
async function scrapeGoogleSearch(browser, query, limit, log, type, onResult = null, notesContext = '') {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Go to Google
    await page.goto('https://www.google.com/search?q=' + encodeURIComponent(query), { waitUntil: 'networkidle2', timeout: 60000 });

    const leads = [];
    let pageNum = 1;

    while (leads.length < limit && pageNum <= 5) { // Limit to 5 pages
        log(`Processing page ${pageNum}...`);

        // Extract results
        const results = await page.$$eval('div.g', (elements, type) => {
            return elements.map(el => {
                const titleEl = el.querySelector('h3');
                const linkEl = el.querySelector('a');
                const snippetEl = el.querySelector('div[style*="-webkit-line-clamp"]') || el.querySelector('span');

                if (!titleEl || !linkEl) return null;

                return {
                    title: titleEl.innerText,
                    url: linkEl.href,
                    snippet: snippetEl ? snippetEl.innerText : ''
                };
            }).filter(r => r !== null);
        }, type);

        log(`Found ${results.length} results on page ${pageNum}`);

        for (const result of results) {
            if (leads.length >= limit) break;

            // processing
            let lead = {
                id: `scraped-${Math.random().toString(36).substr(2, 9)}`,
                status: 'New',
                source: type === 'linkedin' ? 'LinkedIn' : 'General Search',
                name: '',
                company: '',
                role: '',
                email: '',
                phone: '',
                website: '',
                linkedin: '',
                location: ''
            };

            if (type === 'linkedin') {
                // Parse LinkedIn Title: "Name - Role - Company | LinkedIn" or similar
                // Example: "John Doe - CEO - Apple | LinkedIn"
                // Example: "Jane Smith | LinkedIn"
                const cleanTitle = result.title.replace(' | LinkedIn', '').replace(' - LinkedIn', '');
                const parts = cleanTitle.split(' - ');

                if (parts.length >= 1) lead.name = parts[0];
                if (parts.length >= 2) lead.role = parts[1];
                if (parts.length >= 3) lead.company = parts[2];

                lead.linkedin = result.url;
                lead.snippet = result.snippet; // Might contain location

                log(`LinkedIn Lead: ${lead.name} (${lead.role} at ${lead.company})`);
                leads.push(lead);
                if (onResult && typeof onResult === 'function') {
                    onResult(lead).catch(err => log(`Error in onResult callback (LinkedIn): ${err.message}`));
                }
            } else {
                // General Search
                lead.company = result.title;
                lead.website = result.url;

                if (lead.website && !lead.website.includes('google') && !lead.website.includes('linkedin')) {
                    // Try to scrape the website for email details
                    log(`Visiting ${lead.website} for details...`);
                    try {
                        const webData = await scrapeWebsite(browser, lead.website, log, notesContext, lead.company);
                        if (webData.email) lead.email = webData.email;
                        if (webData.phone) lead.phone = webData.phone;
                        if (webData.summary) lead.summary = webData.summary;
                        if (webData.linkedin) lead.linkedin = webData.linkedin;
                        // Only add if we found something useful or if loose mode
                        if (lead.email || lead.phone) {
                            log(`Found: ${lead.company} (Email: ${lead.email || 'No'} | Phone: ${lead.phone || 'No'})`);
                            leads.push(lead);
                            if (onResult && typeof onResult === 'function') {
                                onResult(lead).catch(err => log(`Error in onResult callback (General): ${err.message}`));
                            }
                        } else {
                            log(`Dropped ${lead.company}: No info found.`);
                        }
                    } catch (e) {
                        log(`Failed to visit ${lead.website}: ${e.message}`);
                    }
                }
            }
        }

        if (leads.length >= limit) break;

        // Next page
        try {
            const nextButton = await page.$('a#pnnext');
            if (nextButton) {
                log('Navigating to next page...');
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2' }),
                    nextButton.click()
                ]);
                pageNum++;
            } else {
                log('No next page found.');
                break;
            }
        } catch (e) {
            log('Error navigating to next page.');
            break;
        }
    }

    return leads;
}


// Email search via DuckDuckGo (much less bot detection than Google)
async function googleSearchEmail(browser, companyName, website, log = console.log) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        // Build queries — domain-based first (more precise), then company name
        const queries = [];
        if (website) {
            try {
                const domain = new URL(website).hostname.replace('www.', '');
                queries.push(`${domain} email`);
            } catch (e) { }
        }
        queries.push(`"${companyName}" email contact`);

        const junkDomains = ['google.com', 'duckduckgo.com', 'example.com', 'sentry.io', 'wixpress.com', 'schema.org', 'w3.org', 'bing.com', 'yahoo.com'];
        const junkPrefixes = new Set(['noreply', 'no-reply', 'donotreply', 'bounce', 'mailer-daemon', 'postmaster', 'user', 'email', 'name', 'support', 'info', 'hello', 'contact', 'admin']);

        const extractEmails = (text) => {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const found = text.match(emailRegex) || [];
            return found.filter(e => {
                const [local, domain] = e.toLowerCase().split('@');
                if (!domain) return false;
                if (junkDomains.some(d => domain.includes(d))) return false;
                if (e.match(/\.(png|jpg|svg|css|js|webp|gif|woff|ttf)$/i)) return false;
                const v = validateEmailFast(e);
                return v.isValid;
            });
        };

        for (const query of queries) {
            try {
                // Use DuckDuckGo — far less aggressive bot detection than Google
                const ddgUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;
                log(`DDG email search: ${query}`);
                await page.goto(ddgUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await new Promise(r => setTimeout(r, 2000)); // let JS render

                const text = await page.evaluate(() => document.body.innerText);

                // Debug: show first 200 chars so we can see if it's a block page
                log(`DDG page snippet: ${text.substring(0, 200).replace(/\n/g, ' ')}`);

                const emails = extractEmails(text);
                if (emails.length > 0) {
                    // Prefer non-generic prefixes (e.g. john@company.com over info@company.com)
                    const personal = emails.find(e => !junkPrefixes.has(e.split('@')[0]));
                    const result = personal || emails[0];
                    log(`DDG found email: ${result}`);
                    return { email: result, pageText: text };
                }

                // Also try clicking the first result link and scraping that page for email
                try {
                    const firstResultUrl = await page.evaluate(() => {
                        const links = Array.from(document.querySelectorAll('[data-testid="result-title-a"], .result__a, a[href^="http"]'));
                        for (const a of links) {
                            const href = a.href || '';
                            if (href.startsWith('http') && !href.includes('duckduckgo') && !href.includes('google')) {
                                return href;
                            }
                        }
                        return null;
                    });

                    if (firstResultUrl) {
                        log(`Visiting result page: ${firstResultUrl}`);
                        await page.goto(firstResultUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        const pageText = await page.evaluate(() => document.body.innerText);
                        const pageEmails = extractEmails(pageText);
                        if (pageEmails.length > 0) {
                            const personal = pageEmails.find(e => !junkPrefixes.has(e.split('@')[0]));
                            const result = personal || pageEmails[0];
                            log(`Result page found email: ${result}`);
                            return { email: result, pageText };
                        }
                    }
                } catch (e) { }

            } catch (e) {
                log(`DDG email search failed (${query}): ${e.message}`);
            }
        }

        log(`No email found for: ${companyName}`);
        return { email: '', pageText: '' };
    } catch (e) {
        log(`Email search error: ${e.message}`);
        return { email: '', pageText: '' };
    } finally {
        try { await page.close(); } catch (e) { }
    }
}

// Helper: Find website URL via DuckDuckGo (Fallback)
async function findWebsiteViaDuckDuckGo(browser, query) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        // DuckDuckGo is much friendlier to scrapers
        await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`, { waitUntil: 'domcontentloaded', timeout: 8000 });

        const firstLink = await page.evaluate(() => {
            // Selectors for DDG
            const badDomains = ['yelp', 'tripadvisor', 'facebook', 'instagram', 'linkedin', 'yellowpages', 'thumbtack', 'ubereats', 'deliveroo', 'just-eat', 'checkatrade', 'trustpilot'];

            // DDG uses data-testid="result-title-a" or class "result__a"
            let links = Array.from(document.querySelectorAll('[data-testid="result-title-a"], .result__a, .wLL07_0Xnd1QZpzpfR4W'));

            for (const a of links) {
                const href = a.href;
                if (!href || !href.startsWith('http')) continue;
                if (href.includes('duckduckgo.com')) continue;

                const isBad = badDomains.some(d => href.toLowerCase().includes(d));
                if (isBad) continue;

                return href;
            }
            return null;
        });

        if (!firstLink) console.log(`[DDG Fallback] No results found for: ${query}`);
        else console.log(`[DDG Fallback] Found: ${firstLink}`);

        return firstLink;
    } catch (e) {
        console.error(`[DDG Fallback] Error: ${e.message}`);
        return null;
    } finally {
        try { await page.close(); } catch (e) { }
    }
}

// Helper: Find website URL via Google Search
async function findWebsiteViaGoogle(browser, query) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 8000 });

        // HANDLE CONSENT (Copied from main scraper)
        try {
            const consentSelectors = [
                'button[aria-label="Accept all"]',
                'button[aria-label="Agree to the use of cookies and other data for the purposes described"]',
                'form[action*="consent"] button',
                'div[role="dialog"] button:last-of-type'
            ];
            for (const selector of consentSelectors) {
                if (await page.$(selector)) {
                    await page.click(selector);
                    await page.waitForNavigation({ timeout: 5000 }).catch(() => { });
                    break;
                }
            }
        } catch (e) { }

        // Grab first organic result
        const firstLink = await page.evaluate(() => {
            const badDomains = ['yelp', 'tripadvisor', 'facebook', 'instagram', 'linkedin', 'yellowpages', 'thumbtack', 'ubereats', 'deliveroo', 'just-eat', 'checkatrade', 'trustpilot'];

            // Helper to check domains
            const isGoodLink = (href) => {
                if (!href || !href.startsWith('http')) return false;
                if (href.includes('google.com')) return false;
                if (badDomains.some(d => href.toLowerCase().includes(d))) return false;
                return true;
            };

            // Strategy 1: Standard 'g' class (Desktop)
            let results = Array.from(document.querySelectorAll('div.g a'));

            // Strategy 2: Mobile/Modern containers (data-hveid)
            if (!results.length) results = Array.from(document.querySelectorAll('div[data-hveid] a'));

            // Strategy 3: Nuclear Option (All main content links)
            if (!results.length) results = Array.from(document.querySelectorAll('#search a'));

            if (results.length === 0) {
                // DEBUG: Dump the first 500 chars of body text to see what page we are on
                const bodyText = document.body.innerText.substring(0, 500).replace(/\n/g, ' ');
                return `DEBUG_NO_RESULTS_FOUND (Title: ${document.title}) (Body: ${bodyText})`;
            }

            for (const a of results) {
                if (isGoodLink(a.href)) return a.href;
            }

            return `DEBUG_FILTERED_ALL: ${results.length} found (Title: ${document.title}). First: ${results[0]?.href}`;
        });

        if (firstLink && firstLink.startsWith('DEBUG_')) {
            console.log(`[Fallback Debug] Google Blocked/Failed (${firstLink}). Switch to DuckDuckGo...`);
            return await findWebsiteViaDuckDuckGo(browser, query);
        }

        return firstLink;
    } catch (e) {
        console.error(`[Fallback Debug] Error: ${e.message}`);
        return await findWebsiteViaDuckDuckGo(browser, query);
    } finally {
        try { await page.close(); } catch (e) { }
    }
}

// Helper: Generate AI Summary with strict Deep Research format
async function generateAISummary(text, notesContext = '') {
    const log = console.log;
    try {
        if (!text || text.length < 5) {
            log('GENERATE_AI_SUMMARY: Text too short, returning generic fallback.');
            return "## ⚡ Quick Summary\nUnable to generate summary due to insufficient data.\n\n## 🔬 Deep Research\nNo deep research available.";
        }

        log(`GENERATE_AI_SUMMARY: Generating summary for text length: ${text.length}`);

        // DEEP RESEARCH PROMPT
        let contextInstruction = '';
        if (notesContext && notesContext.trim().length > 0) {
            contextInstruction = `CRITICAL INSTRUCTION: The user specifically wants to know: "${notesContext}". YOU MUST ADDRESS THIS in a dedicated section titled "## 🎯 Response to Query" at the very beginning of your report. If the info is found, state it clearly. If not, state "Information not found".`;
        }

        // ALWAYS perform Deep Research, but include specific context if requested.
        const systemPrompt = `You are an elite business intelligence researcher. 
Your task is to write a detailed "Deep Research" report (approx 400-600 words) about the target company.

${contextInstruction}

Structure your response exactly as follows:

## ⚡ Quick Summary
(Write 2-3 concise sentences summarizing the company and its key value proposition. This is for quick scanning.)

## 🔬 Deep Research
(The detailed report starts here.)

Focus Areas for Deep Research:
1. **Executive Summary**: What they do, their niche, their "vibe".
2. **Key People**: Identify CEO, Founders, or key roles if present in the data. *Crucial*: Try to find specific names.
3. **Social Presence**: Analyze their social media footprint.
4. **Specific Observations**: Quirky details, specific "things they like".
5. **Business Data**: Briefly mention how we found them (Website, Search).

Tone: Professional, insightful, "Sherlock Holmes" style.
Format: Markdown (headers ##, bullet points).
`;

        const API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-d703ac9c0fe74d05b1693c50a81ea9bc';
        const BASE_URL = 'https://api.deepseek.com';

        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Here is the gathered data:\n\n${text.substring(0, 15000)}` } // increased limit slightly
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errText}`);
        }

        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const content = data.choices[0].message.content.trim();
            if (content.length < 10) throw new Error('AI returned empty/too short content');

            // Validate headers
            if (!content.includes('##')) {
                // If AI decided to skip headers, force add them
                return `## ⚡ Quick Summary\n${content.substring(0, 200)}...\n\n## 🔬 Deep Research\n${content}`;
            }
            return content;
        }
        throw new Error('No choices returned from API');

    } catch (e) {
        console.error('AI Summary Generation Fatal Error:', e);
        // Fallback that LOOKS like a summary so the UI doesn't show "No summary available"
        return `## ⚡ Quick Summary\nAutomated research encountered an error: ${e.message}\n\n## 🔬 Deep Research\nCould not complete deep research due to an error.`;
    }
}

// Helper: Gather External Intel (Google Search for People/Socials) to append to context
async function gatherExternalIntel(browser, companyName) {
    if (!companyName) return '';
    let extraData = '';

    // We reuse the browser instance but ensure we don't leak pages
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Search 1: CEO / Team
        try {
            const query = `${companyName} CEO founder owner team linkedin`;
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 8000 });

            const searchResults = await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('div.g')).slice(0, 5);
                return els.map(el => el.innerText).join('\n---\n');
            });
            extraData += `\n[EXTERNAL_INTEL_PEOPLE]:\n${searchResults}\n`;
        } catch (e) { console.log(`Intel Search 1 failed: ${e.message}`); }

        // Search 2: Social Media / Reviews
        try {
            const querySocial = `${companyName} reviews social media facebook instagram twitter`;
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(querySocial)}`, { waitUntil: 'domcontentloaded', timeout: 8000 });
            const searchResults = await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('div.g')).slice(0, 5);
                return els.map(el => el.innerText).join('\n---\n');
            });
            extraData += `\n[EXTERNAL_INTEL_SOCIAL]:\n${searchResults}\n`;
        } catch (e) { console.log(`Intel Search 2 failed: ${e.message}`); }

    } catch (e) {
        console.log(`gatherExternalIntel failed: ${e.message}`);
    } finally {
        try { await page.close(); } catch (e) { }
    }
    return extraData;
}

// FIXED WEBSITE SCRAPER
// skipExternalIntel: skip the 2 extra Google searches per lead (use during bulk Maps scraping)
async function scrapeWebsite(browser, url, log = console.log, notesContext = '', companyNameOverride = '', skipExternalIntel = false) {
    const page = await browser.newPage();
    const data = { email: '', phone: '', summary: '', social: { twitter: '', facebook: '', instagram: '', linkedin: '' } };

    // Aggregated text for AI summary
    let aggregatedText = '';
    const allFoundEmails = new Set();

    // Junk filter for scraper (same as validation)
    const JUNK_LOCAL_PARTS = new Set([
        'wght', 'width', 'height', 'size', 'color', 'background', 'url', 'src',
        'href', 'image', 'img', 'icon', 'logo', 'svg', 'png', 'jpg', 'jpeg',
        'domain', 'user', 'name', 'firstname', 'lastname', 'email'
    ]);

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        // --- ATTEMPT WEBSITE VISIT ---
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

            // 2. COOKIE ACCEPTANCE
            const handleCookieBanner = async (p) => {
                try {
                    const selectors = [
                        '#onetrust-accept-btn-handler',
                        'button[id*="accept"]',
                        'button[class*="accept"]',
                        'a[class*="accept"]',
                        'button[aria-label*="Agree"]',
                        'button[aria-label*="Accept"]',
                        'button:contains("Accept")',
                        'button:contains("Allow All")',
                        'div[role="dialog"] button:first-of-type'
                    ];

                    const accepted = await p.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button, a'));
                        const acceptBtn = buttons.find(b => {
                            const t = b.innerText.toLowerCase();
                            return (t.includes('accept') || t.includes('agree') || t.includes('allow all') || t === 'ok')
                                && !t.includes('show') && !t.includes('manage');
                        });
                        if (acceptBtn) {
                            acceptBtn.click();
                            return true;
                        }
                        return false;
                    });

                    if (accepted) {
                        await new Promise(r => setTimeout(r, 1000));
                    }
                } catch (e) { }
            };

            await handleCookieBanner(page);
            await autoScroll(page);

            // 3. Extract Core Data (Helper)
            const extractContacts = async (p) => {
                const content = await p.content();
                const found = new Set();

                // Get ALL mailto links
                const mailtos = await p.evaluate(() => {
                    return Array.from(document.querySelectorAll('a[href^="mailto:"]'))
                        .map(a => a.href.replace('mailto:', '').split('?')[0]);
                });
                mailtos.forEach(e => found.add(e.toLowerCase()));

                // Regex Search in Body
                const text = await p.evaluate(() => document.body.innerText);
                const matches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [];
                matches.forEach(e => found.add(e.toLowerCase()));

                // Filter Logic
                const validEmails = [...found].filter(e => {
                    if (e.match(/\.(png|jpg|svg|css|js|webp)$/i)) return false;
                    if (e.includes('example') || e.includes('sentry') || e.includes('wixpress')) return false;
                    if (e.match(/@\d+\.\d+\.\d+/)) return false; // IP address domain

                    const localPart = e.split('@')[0];
                    if (JUNK_LOCAL_PARTS.has(localPart)) return false;

                    return true;
                });

                // Phone
                let phone = '';
                const phones = content.match(/(?:\+?\d{1,3}[-. ]?)?\(?\d{2,4}\)?[-. ]?\d{3,4}[-. ]?\d{3,4}/g) || [];
                if (phones.length) phone = phones[0];

                // Socials
                const social = { twitter: '', facebook: '', instagram: '', linkedin: '' };
                const hrefs = await p.$$eval('a', as => as.map(a => a.href));
                hrefs.forEach(href => {
                    if (href.includes('facebook.com') && !href.includes('sharer')) social.facebook = href;
                    if (href.includes('twitter.com') || href.includes('x.com')) social.twitter = href;
                    if (href.includes('instagram.com')) social.instagram = href;
                    if (href.includes('linkedin.com/in') || href.includes('linkedin.com/company')) social.linkedin = href;
                });

                // Text for AI
                const rawText = await p.evaluate(() => {
                    const clone = document.body.cloneNode(true);
                    clone.querySelectorAll('nav, footer, script, style, noscript, iframe, svg, .cookie-banner, #onetrust-banner-sdk').forEach(b => b.remove());
                    return clone.innerText.replace(/\s+/g, ' ').trim();
                });

                return { emails: validEmails, phone, social, text: rawText };
            };

            // --- SCAN HOME PAGE ---
            const homeData = await extractContacts(page);
            homeData.emails.forEach(e => allFoundEmails.add(e));
            if (homeData.phone) data.phone = homeData.phone;
            Object.assign(data.social, homeData.social);
            aggregatedText += ` [HOME PAGE]: ${homeData.text.substring(0, 1500)} \n`;

            // 4. DEEP CRAWL: Visit key pages
            const subPageKeywords = ['about', 'mission', 'story', 'services', 'menu', 'contact', 'team'];
            const subLinks = await page.$$eval('a', (as, keywords) => {
                return as.map(a => a.href)
                    .filter(h => h.startsWith('http') && keywords.some(k => h.toLowerCase().includes(k)))
                    .filter((v, i, a) => a.indexOf(v) === i);
            }, subPageKeywords);

            const uniqueLinks = [...new Set(subLinks)].slice(0, 4); // Scan up to 4 subpages

            for (const link of uniqueLinks) {
                try {
                    if (link === url) continue;

                    const subPage = await browser.newPage();
                    await subPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
                    await subPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 10000 });
                    await handleCookieBanner(subPage);

                    const subData = await extractContacts(subPage);

                    // Collect emails
                    subData.emails.forEach(e => allFoundEmails.add(e));

                    // Merge other missing info
                    if (!data.phone && subData.phone) data.phone = subData.phone;
                    Object.keys(subData.social).forEach(k => {
                        if (!data.social[k] && subData.social[k]) data.social[k] = subData.social[k];
                    });

                    let pageType = 'PAGE';
                    if (link.includes('about')) pageType = 'ABOUT US';
                    else if (link.includes('contact')) pageType = 'CONTACT';
                    else if (link.includes('menu')) pageType = 'MENU';

                    aggregatedText += ` [${pageType}]: ${subData.text.substring(0, 1000)} \n`;

                    await subPage.close();
                } catch (err) { }
            }

            // 5. Select Best Email
            if (allFoundEmails.size > 0) {
                const emailList = Array.from(allFoundEmails);

                const priorityPrefixes = ['contact', 'info', 'hello', 'support', 'sales', 'office', 'admin'];

                // Sort: Priority prefixes first, then others.
                emailList.sort((a, b) => {
                    const aPre = a.split('@')[0];
                    const bPre = b.split('@')[0];
                    const aPrio = priorityPrefixes.includes(aPre) ? 0 : 1;
                    const bPrio = priorityPrefixes.includes(bPre) ? 0 : 1;
                    return aPrio - bPrio;
                });

                // Select Best Email using FAST validation (no DNS lookup during scraping)
                for (const email of emailList) {
                    const validation = validateEmailFast(email);
                    if (validation.isValid) {
                        data.email = validation.cleanedEmail;
                        break;
                    }
                }
            }
        } catch (webError) {
            log(`Website visit failed partially: ${webError.message}`);
            aggregatedText += `\n[WEBSITE_ERROR]: Could not access fully (${webError.message}). Using external data for analysis.\n`;
        }

        // 6. Final AI Summary (DEEP RESEARCH MODE)
        // Ensure we try to generate summary even if website failed
        const pageTitle = await page.evaluate(() => document.title).catch(() => companyNameOverride || '');
        const companyName = companyNameOverride || pageTitle || (url ? new URL(url).hostname : 'Unknown Company');

        // 6. External Intel (skip during bulk Maps scraping to avoid slowdowns)
        if (!skipExternalIntel) {
            log('Gathering external intel (CEO/Socials)...');
            const externalIntel = await gatherExternalIntel(browser, companyName);
            aggregatedText += externalIntel;
        }

        if (aggregatedText.length > 20) {
            log('Generating Deep Research Report...');
            data.summary = await generateAISummary(aggregatedText, notesContext);
        } else {
            // Fallback if absolutely nothing found - try one last time with just company name
            log('Data too sparse for normal research. Attempting minimal research.');
            data.summary = await generateAISummary(`Company Name: ${companyName}\nSource: Minimal data found.`, notesContext);
        }

        // Fallback meta description if AI fails or returns nothing useful (and not already done)
        if (!data.summary || data.summary.length < 50) {
            const metaDesc = await page.evaluate(() => {
                const el = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
                return el ? el.content : '';
            }).catch(() => '');

            if (metaDesc) {
                // Try one more time with meta description
                data.summary = await generateAISummary(`[META_DESCRIPTION]: ${metaDesc}\n${aggregatedText}`, notesContext);
            }
        }

        // ULTIMATE FALLBACK
        if (!data.summary || data.summary.length < 20) {
            data.summary = "## ⚡ Quick Summary\nAutomated research could not find sufficient data on this company.\n\n## 🔬 Deep Research\nPlease manually verify the website or try again later.";
        }

        log(`Final Summary Length: ${data.summary.length}`);

    } catch (e) {
        log(`ScrapeWebsite Fatal Error: ${e.message}`);
        if (!data.summary) {
            data.summary = `## ⚡ Quick Summary\nSystem error during research: ${e.message}\n\n## 🔬 Deep Research\nProcess failed.`;
        }
    } finally {
        try { await page.close(); } catch (e) { }
    }
    return data;
}

// Deep Research Function
export async function performDeepResearch(company, website, notesContext = '') {
    const log = console.log;
    log(`Starting Deep Research for ${company} (${website})...`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        let aggregatedData = `Company: ${company}\nWebsite: ${website}\nUser Context: ${notesContext}\n\n`;

        // 1. Scrape Website Deeply (if exists)
        if (website && website.startsWith('http')) {
            try {
                const page = await browser.newPage();
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
                await page.goto(website, { waitUntil: 'domcontentloaded', timeout: 20000 });

                // Get Home Page Text
                const homeText = await page.evaluate(() => {
                    const clone = document.body.cloneNode(true);
                    clone.querySelectorAll('script, style, noscript, iframe, svg').forEach(b => b.remove());
                    return clone.innerText.substring(0, 5000);
                });
                aggregatedData += `[WEBSITE_HOME]:\n${homeText}\n\n`;

                // Find About/Team pages
                const links = await page.$$eval('a', as => as.map(a => a.href));
                const aboutLink = links.find(l => l.toLowerCase().includes('about') || l.toLowerCase().includes('story'));
                const teamLink = links.find(l => l.toLowerCase().includes('team') || l.toLowerCase().includes('people'));

                if (aboutLink) {
                    try {
                        await page.goto(aboutLink, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        const aboutText = await page.evaluate(() => {
                            const clone = document.body.cloneNode(true);
                            clone.querySelectorAll('script, style, noscript, iframe, svg').forEach(b => b.remove());
                            return clone.innerText.substring(0, 3000);
                        });
                        aggregatedData += `[WEBSITE_ABOUT]:\n${aboutText}\n\n`;
                    } catch (e) { }
                }

                if (teamLink) {
                    try {
                        await page.goto(teamLink, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        const teamText = await page.evaluate(() => {
                            const clone = document.body.cloneNode(true);
                            clone.querySelectorAll('script, style, noscript, iframe, svg').forEach(b => b.remove());
                            return clone.innerText.substring(0, 3000);
                        });
                        aggregatedData += `[WEBSITE_TEAM]:\n${teamText}\n\n`;
                    } catch (e) { }
                }

                await page.close();
            } catch (e) {
                log(`Website scrape error: ${e.message}`);
                aggregatedData += `[WEBSITE_ERROR]: Could not access website fully.\n`;
            }
        }

        // 2. Search for CEO/Key People via Google
        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Search Query: "Company Name CEO founder team linkedin"
            const query = `${company} CEO founder owner team linkedin`;
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });

            const searchResults = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('div.g')).map(el => el.innerText).slice(0, 6).join('\n---\n');
            });

            aggregatedData += `[GOOGLE_SEARCH_PEOPLE]:\n${searchResults}\n\n`;

            // Search Query: "Company Name reviews social media"
            const querySocial = `${company} reviews social media facebook instagram twitter`;
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(querySocial)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            const socialResults = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('div.g')).map(el => el.innerText).slice(0, 6).join('\n---\n');
            });
            aggregatedData += `[GOOGLE_SEARCH_SOCIAL]:\n${socialResults}\n\n`;

            await page.close();
        } catch (e) {
            log(`Google search error: ${e.message}`);
        }

        // 3. Generate Report via DeepSeek
        const API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-d703ac9c0fe74d05b1693c50a81ea9bc';
        const BASE_URL = 'https://api.deepseek.com';

        const systemPrompt = `You are an elite business intelligence researcher. 
        Your task is to write a comprehensive "Deep Research" report (approx 600 words) about the target company.
        
        Focus Areas:
        1. **Executive Summary**: What they do, their niche, their "vibe".
        2. **Key People**: Identify CEO, Founders, or key roles if present in the data. *Crucial*: Try to find specific names.
        3. **Social Presence**: Analyze their social media footprint (based on search results). What do they post? What do they like? Who is their audience?
        4. **Business Data**: Briefly mention how we found them (Website, Search).
        5. **Specific Observations**: Quirky details, specific "things they like" (e.g. they support a specific charity, they love coffee, they use specific tech).
        
        Tone: Professional but insightful. "Sherlock Holmes" style - deducing things from the data.
        Format: Markdown. Use headers (##), bullet points, and bold text.
        Length: Around 600 words. Be detailed.
        
        Input Data provided below (Website dumps + Google Search Snippets).`;

        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: aggregatedData }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
            return data.choices[0].message.content;
        } else {
            throw new Error('No response from AI');
        }

    } catch (e) {
        log(`Deep Research Error: ${e.message}`);
        return `Failed to perform deep research: ${e.message}`;
    } finally {
        await browser.close();
    }
}
