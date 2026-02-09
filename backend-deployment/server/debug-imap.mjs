import 'dotenv/config';
import { ImapFlow } from 'imapflow';

async function testImap() {
    console.log('Starting IMAP debug...');

    const account = {
        email: 'oliver@relaysolutions.net',
        imap_host: 'relaysolutions.net',
        imap_port: 993,
        password: 'Longlonglong1!'
    };

    console.log(`Testing account: ${account.email}`);
    console.log(`Host: ${account.imap_host}:${account.imap_port}`);

    // 3. Connect IMAP
    const client = new ImapFlow({
        host: account.imap_host,
        port: account.imap_port,
        secure: account.imap_port === 993,
        auth: {
            user: account.email,
            pass: account.password
        },
        logger: {
            debug: (msg) => console.log(`[IMAP DEBUG] ${msg.message || msg}`),
            info: (msg) => console.log(`[IMAP INFO] ${msg.message || msg}`),
            warn: (msg) => console.warn(`[IMAP WARN] ${msg.message || msg}`),
            error: (msg) => console.error(`[IMAP ERROR] ${msg.message || msg}`)
        }
    });

    try {
        console.log('Connecting...');
        await client.connect();
        console.log('Connected!');

        console.log('Listing folders...');
        const list = await client.list();
        list.forEach(folder => console.log(`- ${folder.path} (${folder.specialUse})`));

        console.log('Opening INBOX...');
        const lock = await client.getMailboxLock('INBOX');
        try {
            const status = await client.status('INBOX', { messages: true });
            console.log(`INBOX message count: ${status.messages}`);

            if (status.messages > 0) {
                console.log('Fetching first message headers...');
                // fetch the last message
                const range = `${status.messages}`;
                const msg = await client.fetchOne(range, { envelope: true });
                console.log('Subject:', msg.envelope.subject);
                console.log('Date:', msg.envelope.date);
            } else {
                console.log('INBOX is empty.');
            }
        } finally {
            lock.release();
        }

        await client.logout();
        console.log('Done.');

    } catch (err) {
        console.error('IMAP Error:', err);
    }
}

testImap();
