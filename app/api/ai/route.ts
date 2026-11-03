import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SYSTEM =
  "Ты — AI-ассистент по найму для компаний без HR-отдела. Отвечай по-русски, спокойно, конкретно и по делу. Решение о найме принимает человек, ты помогаешь ему.";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "На сервере не задан OPENAI_API_KEY" }, { status: 500 });
    }

    const body = await req.json();
    const action = String(body.action ?? "");
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    async function ask(user: string, json: boolean) {
      const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        ...(json ? { response_format: { type: "json_object" as const } } : {}),
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
      });
      return res.choices[0]?.message?.content ?? "";
    }

    if (action === "screen") {
      const { job, criteria, resume } = body;
      if (!job || !resume) {
        return NextResponse.json({ error: "Заполните вакансию и резюме" }, { status: 400 });
      }
      const text = await ask(
        `Оцени резюме кандидата по вакансии.\n\nВАКАНСИЯ:\n${job}\n\nКРИТЕРИИ:\n${criteria || "не указаны, ориентируйся на описание"}\n\nРЕЗЮМЕ:\n${resume}\n\nВерни ТОЛЬКО JSON: {"score": число 0-100, "reason": "2-4 предложения: что совпало и чего не хватает"}`,
        true,
      );
      const parsed = JSON.parse(text);
      const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
      return NextResponse.json({ score, reason: String(parsed.reason ?? "") });
    }

    if (action === "message") {
      const { job, resume, kind } = body;
      const goal =
        kind === "reject"
          ? "вежливый, тёплый отказ без шаблонных фраз, с благодарностью за время"
          : "приглашение на интервью, персональное, со ссылкой на конкретный опыт из резюме";
      const text = await ask(
        `Напиши сообщение кандидату (email/telegram): ${goal}. Не более 120 слов. Без темы письма, без плейсхолдеров в скобках, подпись «Команда найма».\n\nВАКАНСИЯ:\n${job}\n\nРЕЗЮМЕ:\n${resume}`,
        false,
      );
      return NextResponse.json({ message: text.trim() });
    }

    if (action === "summary") {
      const { job, resume, notes } = body;
      if (!notes) {
        return NextResponse.json({ error: "Введите заметки с интервью" }, { status: 400 });
      }
      const text = await ask(
        `По заметкам менеджера составь краткое саммари интервью и рекомендацию.\n\nВАКАНСИЯ:\n${job}\n\nРЕЗЮМЕ:\n${resume}\n\nЗАМЕТКИ С ИНТЕРВЬЮ:\n${notes}\n\nВерни ТОЛЬКО JSON: {"summary": "3-5 предложений: сильные стороны, риски, итог", "recommendation": "HIRE" или "NO_HIRE"}`,
        true,
      );
      const parsed = JSON.parse(text);
      return NextResponse.json({
        summary: String(parsed.summary ?? ""),
        recommendation: parsed.recommendation === "HIRE" ? "HIRE" : "NO_HIRE",
      });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (error) {
    console.error("AI route error", error);
    return NextResponse.json({ error: "Ошибка AI-запроса. Попробуйте ещё раз." }, { status: 500 });
  }
}
