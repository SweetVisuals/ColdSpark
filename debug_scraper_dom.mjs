import puppeteer from 'puppeteer';
import fs from 'fs';

async function debug() {
    console.log('Starting DEBUG scraper...');
    const browser = await puppeteer.launch({
        headless: false, // Visible for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    try {
        await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2' });

        // Consent (Blind attempt)
        try {
            const btn = await page.$('button[aria-label="Accept all"]');
            if (btn) await btn.click();
        } catch (e) { }

        await page.waitForSelector('#searchboxinput');
        await page.type('#searchboxinput', 'Food Trucks in London');
        await page.keyboard.press('Enter');

        console.log('Waiting for results...');
        await page.waitForSelector('div[role="feed"]');
        await page.waitForTimeout(3000);

        const articles = await page.$$('div[role="article"]');
        console.log(`Found ${articles.length} articles.`);

        if (articles.length > 0) {
            const el = articles[0];
            const html = await el.evaluate(e => e.outerHTML);
            console.log('--- FIRST RESULT HTML ---');
            console.log(html);
            console.log('--- END HTML ---');

            // Try to find website link
            const webLink = await el.evaluate(e => {
                const anchors = Array.from(e.querySelectorAll('a'));
                return anchors.map(a => ({
                    href: a.href,
                    aria: a.getAttribute('aria-label'),
                    text: a.innerText,
                    dataVal: a.getAttribute('data-value')
                }));
            });
            console.log('Links found in first result:', JSON.stringify(webLink, null, 2));
        }

    } catch (e) {
        console.error(e);
    } finally {
        // await browser.close();
    }
}

debug();
