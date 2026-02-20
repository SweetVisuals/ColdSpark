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
    'href', 'image', 'img', 'icon', 'logo', 'svg', 'png', 'jpg', 'jpeg',
    'domain', 'user', 'name', 'firstname', 'lastname', 'email', 'noreply',
    'no-reply', 'donotreply', 'do-not-reply', 'unsubscribe', 'bounce',
    'mailer-daemon', 'postmaster'
]);

// Shared syntax check used by both fast and full validation
function syntaxCheck(rawEmail) {
    if (!rawEmail || typeof rawEmail !== 'string') {
        return { isValid: false, reason: 'Empty or invalid format' };
    }

    let email = rawEmail.trim();
    try { email = decodeURIComponent(email); } catch (e) {
        email = email.replace(/%[0-9A-F]{2}/gi, '');
    }
    email = email.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, reason: 'Invalid syntax' };
    }

    const [localPart, domain] = email.split('@');

    if (JUNK_LOCAL_PARTS.has(localPart)) {
        return { isValid: false, reason: 'Likely scraping artifact or no-reply address' };
    }

    if (domain.includes('..')) {
        return { isValid: false, reason: 'Invalid domain syntax (double dot)' };
    }

    if (PLACEHOLDER_DOMAINS.has(domain)) {
        return { isValid: false, reason: 'Placeholder domain detected' };
    }

    if (DISPOSABLE_DOMAINS.has(domain)) {
        return { isValid: false, reason: 'Disposable email detected' };
    }

    // Block obvious image/asset false positives
    if (email.match(/\.(png|jpg|svg|css|js|webp|gif|woff|ttf)$/i)) {
        return { isValid: false, reason: 'File extension in email' };
    }

    return { isValid: true, cleanedEmail: email };
}

/**
 * Fast validation — syntax only, NO DNS lookup.
 * Use this during scraping to avoid blocking on DNS timeouts.
 */
export function validateEmailFast(rawEmail) {
    return syntaxCheck(rawEmail);
}

/**
 * Full validation — syntax + DNS MX record check.
 * Use this for user-submitted emails (e.g. SMTP setup).
 */
export async function validateEmail(rawEmail) {
    const syntaxResult = syntaxCheck(rawEmail);
    if (!syntaxResult.isValid) return syntaxResult;

    const email = syntaxResult.cleanedEmail;
    const domain = email.split('@')[1];

    // DNS MX Record Check
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
        // If DNS check fails due to network/timeout, pass with warning
        return { isValid: true, warning: 'DNS check skipped/failed', details: error.code, cleanedEmail: email };
    }
}
