import { scrapeWebsite } from './server/scraper.mjs';
import puppeteer from 'puppeteer';

(async () => {
    console.log('scrapeWebsite:', typeof scrapeWebsite);
    if (typeof scrapeWebsite !== 'function') {
        console.error('FAIL: scrapeWebsite is not a function');
        process.exit(1);
    }

    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    try {
        console.log('Testing...');
        const result = await scrapeWebsite(browser, 'https://example.com', console.log, 'Find the CEO');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
