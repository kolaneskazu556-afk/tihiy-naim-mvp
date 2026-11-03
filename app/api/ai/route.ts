import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { action, resumeText, jobDescription, notes } = await req.json();

    if (action === 'screen') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Ты — AI-рекрутер "Тихий найм". Твоя задача — сравнить резюме с вакансией. Верни строго JSON: {"score": число от 0 до 100, "reason": "краткое обоснование на русском"}.' 
          },
          { 
            role: 'user', 
            content: `Вакансия: ${jobDescription}\n\nРезюме: ${resumeText}` 
          }
        ],
        response_format: { type: 'json_object' }
      });
      return NextResponse.json(JSON.parse(response.choices[0].message.content || '{}'));
    }

    if (action === 'summary') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Ты — AI-ассистент. Сделай краткое саммари (3-4 пункта) по заметкам с интервью и дай рекомендацию: Hire или No Hire.' 
          },
          { role: 'user', content: notes }
        ],
      });
      return NextResponse.json({ summary: response.choices[0].message.content });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка AI' }, { status: 500 });
  }
}
