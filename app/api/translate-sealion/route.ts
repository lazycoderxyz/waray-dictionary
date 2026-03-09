import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, direction } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.SEALION_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'SeaLion API key not configured' }, { status: 500 });
    }

    // Create the prompt based on translation direction - WITH CONTEXT
    let systemPrompt = '';
    let userPrompt = '';

    if (direction === 'waray-to-english') {
      systemPrompt = `You are an expert linguist and cultural educator specializing in Waray (Waray-Waray/Samarnon), a language spoken in Eastern Visayas, Philippines (Leyte, Samar, Biliran).

Your task is to translate Waray text to English AND provide rich educational context.

For each translation, provide:
1. **Translation**: The natural English translation
2. **Word-by-Word Breakdown**: Break down each significant word with its meaning
3. **Grammar Notes**: Explain any interesting grammar patterns (particles, affixes, word order)
4. **Cultural Context**: If relevant, explain cultural significance, usage situations, or regional variations
5. **Pronunciation Tips**: Any notable pronunciation features

Format your response clearly with these sections. Be educational and helpful for language learners.`;
      
      userPrompt = `Translate and explain this Waray text: "${text}"`;
    } else {
      systemPrompt = `You are an expert linguist and cultural educator specializing in Waray (Waray-Waray/Samarnon), a language spoken in Eastern Visayas, Philippines (Leyte, Samar, Biliran).

Your task is to translate English text to Waray AND provide rich educational context.

For each translation, provide:
1. **Translation**: The natural Waray translation
2. **Word-by-Word Breakdown**: Break down each word you used with its meaning
3. **Grammar Notes**: Explain the grammar patterns used (particles like "nga", "han", "it", affixes, etc.)
4. **Alternative Expressions**: Other ways to say this in Waray (formal/informal, regional variations)
5. **Usage Notes**: When and how to use this expression appropriately

Common Waray expressions for reference:
- "Good morning" = "Maupay nga aga"
- "Good afternoon" = "Maupay nga kulop"
- "Good evening" = "Maupay nga gab-i"
- "How are you?" = "Kumusta ka?"
- "Thank you" = "Salamat"
- "I love you" = "Ginhihigugma ko ikaw"

Format your response clearly with these sections. Be educational and helpful for language learners.`;
      
      userPrompt = `Translate and explain this English text in Waray: "${text}"`;
    }

    // Call SeaLion API
    const response = await fetch('https://api.sea-lion.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'aisingapore/Gemma-SEA-LION-v4-27B-IT',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('SeaLion API error:', errorData);
      return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
    }

    const data = await response.json();
    const translation = data.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ translation });

  } catch (error) {
    console.error('SeaLion translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
