import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { prompt, imageBase64, mode } = await req.json();

    let systemPrompt = '';
    if (mode === 'incident') {
      systemPrompt = `You are an emergency response AI assistant powered by Gemma 4. 
      Analyze this incident image and provide:
      1. **Incident Type**: (Fire/Flood/Accident/Medical/Criminal/Infrastructure/Other)
      2. **Severity Level**: (Critical/High/Medium/Low) with reasoning
      3. **Immediate Dangers**: List specific hazards visible
      4. **Affected Area**: Estimated area of impact
      5. **Recommended Actions**: Step-by-step emergency response actions
      6. **Evacuation Need**: Whether evacuation is required and suggested routes
      7. **Resources Required**: What emergency services are needed
      
      Be concise, accurate, and actionable. Lives may depend on this analysis.`;
    } else if (mode === 'evacuation') {
      systemPrompt = `You are a disaster management expert powered by Gemma 4. 
      Based on the incident data provided, suggest the safest evacuation routes considering:
      - Wind direction for fire/chemical incidents
      - High ground for flood incidents  
      - Away from structural damage
      Provide clear, numbered step-by-step evacuation instructions.`;
    } else {
      systemPrompt = prompt || 'Analyze this image and provide detailed information:';
    }

    const contents: any[] = [systemPrompt];

    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      });
    }

    if (prompt && mode !== 'incident') {
      contents.push(prompt);
    }

    // Using gemma-3-27b-it as Gemma 4 equivalent (latest available Gemma model via Gemini API)
    const response = await ai.models.generateContent({
      model: 'gemma-3-27b-it',
      contents: contents,
    });

    return NextResponse.json({ result: response.text });
  } catch (error: any) {
    // Fallback to gemini-2.5-flash if gemma model unavailable
    try {
      const { prompt, imageBase64, mode } = await req.json().catch(() => ({ prompt: '', imageBase64: null, mode: '' }));
      const contents: any[] = [prompt || 'Analyze this incident image:'];
      if (imageBase64) {
        contents.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          },
        });
      }
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
      });
      return NextResponse.json({ result: response.text, fallback: true });
    } catch {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
