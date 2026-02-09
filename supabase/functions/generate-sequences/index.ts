import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const DEEPSEEK_API_KEY = 'sk-5fe28a74c7664c2e99080c25820124b2';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { campaignName, niche, company, contactNumber, primaryEmail, count = 5 } = await req.json()

    console.log(`Generating ${count} sequences for ${company} (${niche})`);

    const systemPrompt = `You are a world-class cold email copywriter. You specialize in B2B lead generation.
Your goal is to write ${count} DISTINCT email templates for a campaign.
Each template should have a unique angle (e.g., direct offer, question-based, value-add, soft touch).

The user handles:
Company: ${company}
Niche: ${niche}
Contact: ${contactNumber}
Email: ${primaryEmail}

Return ONLY a JSON array of objects. No markdown formatting.
Format:
[
  {
    "name": "Use a descriptive name (e.g. Direct Approach)",
    "subject": "Email subject line (can use {{company}})",
    "content": "Email body text (can use {{name}}, {{company}}, {{first_name}}). Keep it under 150 words. Do NOT include subject line in body."
  }
]
`;

    const userPrompt = `Generate ${count} cold email variations for a campaign named "${campaignName}".`;

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
        temperature: 0.8 // Higher temperature for variety
      })
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('No response from AI provider');
    }

    const content = data.choices[0].message.content;
    
    // Clean up content to ensure it's valid JSON
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json/, '').replace(/```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```/, '').replace(/```$/, '');
    }

    let sequences;
    try {
        sequences = JSON.parse(cleanContent);
    } catch (e) {
        console.error("Failed to parse JSON", cleanContent);
        throw new Error("AI returned invalid JSON format");
    }

    return new Response(JSON.stringify({ success: true, data: sequences }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Returning 200 with success: false to handle gracefully in frontend
    })
  }
})
