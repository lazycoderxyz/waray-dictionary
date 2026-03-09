import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, direction } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Create the prompt based on translation direction
    let systemPrompt = '';
    let userPrompt = '';

    if (direction === 'waray-to-english') {
      systemPrompt = `You are an expert translator specializing in Waray (Waray-Waray/Samarnon), a language spoken in Eastern Visayas, Philippines (Leyte, Samar, Biliran). 

Your task is to translate Waray text to English accurately and naturally.

Rules:
1. Provide a natural, grammatically correct English translation
2. If the Waray text contains words you're not 100% sure about, still provide your best translation
3. Keep the tone and meaning as close to the original as possible
4. If it's a greeting or common phrase, translate it naturally (e.g., "Maupay nga aga" = "Good morning")
5. Only respond with the translation, nothing else. No explanations.`;
      
      userPrompt = `Translate this Waray text to English: "${text}"`;
    } else {
      systemPrompt = `You are an expert translator specializing in Waray (Waray-Waray/Samarnon), a language spoken in Eastern Visayas, Philippines (Leyte, Samar, Biliran).

Your task is to translate English text to Waray accurately.

Rules:
1. Provide a natural Waray translation
2. Use common Waray vocabulary and grammar
3. Keep the tone and meaning as close to the original as possible
4. Common translations:
   - "Good morning" = "Maupay nga aga"
   - "Good afternoon" = "Maupay nga kulop"
   - "Good evening" = "Maupay nga gab-i"
   - "How are you?" = "Kumusta ka?"
   - "Thank you" = "Salamat"
   - "I love you" = "Ginhihigugma ko ikaw" or "Hinihigugma ko ikaw"
5. Only respond with the translation, nothing else. No explanations.`;
      
      userPrompt = `Translate this English text to Waray: "${text}"`;
    }

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error:', errorData);
      return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
    }

    const data = await response.json();
    const translation = data.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ translation });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
