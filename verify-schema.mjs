import fetch from 'node-fetch';

const SUPABASE_URL = 'https://wmoyigdovtpuayjxezzc.supabase.co';
const ANON_KEY = 'sb_publishable_k_2dJ-Qs2ZpmYvB0hctaIw_-TkkXvjx';

async function verifySchema() {
    console.log('Verifying schema...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/campaigns`, {
            method: 'POST',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ niche: 'test' })
        });

        if (response.ok) {
            console.log("Success: Request accepted (or at least not a schema error).");
        } else {
            const data = await response.json();
            console.log('Error:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

verifySchema();
