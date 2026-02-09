import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
    'tempmail.com', 'throwawaymail.com', 'guerrillamail.com', 'mailinator.com',
    'yopmail.com', '10minutemail.com', 'sharklasers.com', 'getairmail.com',
    'temp-mail.org', 'temp-mail.ru', 'fake-email.com', 'maildrop.cc'
]);

// Common placeholder/test domains
const PLACEHOLDER_DOMAINS = new Set([
    'example.com', 'test.com', 'domain.com', 'email.com', 'nowhere.com',
    'example.org', 'example.net', 'yoursite.com', 'site.com', 'mysite.com'
]);

// Words appearing in scraped data that aren't real emails (often CSS or file attributes)
const JUNK_LOCAL_PARTS = new Set([
    'wght', 'width', 'height', 'size', 'color', 'background', 'url', 'src',
    'href', 'image', 'img', 'icon', 'logo', 'svg', 'png', 'jpg', 'jpeg'
]);

export async function validateEmail(rawEmail) {
    if (!rawEmail || typeof rawEmail !== 'string') {
        return { isValid: false, reason: 'Empty or invalid format' };
    }

    // 1. Sanitization & Cleaning
    let email = rawEmail.trim();

    // Remove URL encoding if present (e.g. %20info)
    try {
        email = decodeURIComponent(email);
    } catch (e) {
        // failed to decode, continue with original check or strip known bad chars
        email = email.replace(/%[0-9A-F]{2}/gi, '');
    }

    email = email.trim().toLowerCase();

    // 2. Syntax Check (Stricter)
    // - Local part: Allow alphanumeric, dot, underscore, plus, hyphen.
    // - Domain: Allow alphanumeric, dot, hyphen. 
    // - TLD: Must be at least 2 letters (alpha only). Rejects IP addresses or numeric TLDs like .500
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
        return { isValid: false, reason: 'Invalid syntax' };
    }

    const [localPart, domain] = email.split('@');

    // 3. Junk/Scraping Artifact Check
    if (JUNK_LOCAL_PARTS.has(localPart)) {
        // e.g. wght@400..500
        return { isValid: false, reason: 'Likely scraping artifact' };
    }

    // Check for ".." in domain which is invalid but might pass some simple split checks
    if (domain.includes('..')) {
        return { isValid: false, reason: 'Invalid domain syntax (double dot)' };
    }

    // 4. Keyword/Placeholder Check
    // Block "user@domain.com", "admin@example.com" etc.
    if (PLACEHOLDER_DOMAINS.has(domain)) {
        return { isValid: false, reason: 'Placeholder domain detected' };
    }

    // Additional strict check for generic local parts on ANY domain if it looks suspicious? 
    // Maybe not, "admin" is valid for real companies. 
    // But "user" is rarely a real contact email for outreach.
    if (localPart === 'user' || localPart === 'name' || localPart === 'firstname' || localPart === 'lastname' || localPart === 'email') {
        return { isValid: false, reason: 'Generic placeholder name' };
    }

    // 5. Disposable Domain Check
    if (DISPOSABLE_DOMAINS.has(domain)) {
        return { isValid: false, reason: 'Disposable email detected' };
    }

    // 6. DNS MX Record Check
    try {
        const addresses = await resolveMx(domain);
        if (!addresses || addresses.length === 0) {
            return { isValid: false, reason: 'No MX records found (domain cannot receive email)' };
        }
        return { isValid: true, details: 'MX records found', cleanedEmail: email };
    } catch (error) {
        if (error.code === 'ENOTFOUND' || error.code === 'ENODATA' || error.code === 'EREFUSED') {
            return { isValid: false, reason: 'Domain does not exist or has no mail server' };
        }
        console.error(`DNS check failed for ${domain}:`, error);
        // If DNS check fails due to network/timeout, we can return valid with warning, 
        // OR strict mode: return invalid. Let's return warning.
        return { isValid: true, warning: 'DNS check skipped/failed', details: error.code, cleanedEmail: email };
    }
}
