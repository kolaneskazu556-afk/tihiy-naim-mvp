import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Не задан OPENAI_API_KEY" }, { status: 500 });
    }

    // Библиотеки подключаем ВНУТРИ функции, а не вверху файла
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const body = await req.json();

    // Если нужен PDF, подключай так:
    // const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: String(body.prompt ?? "") }],
    });

    return NextResponse.json({ result: completion.choices[0]?.message?.content ?? "" });
  } catch (error) {
    console.error("AI route error", error);
    return NextResponse.json({ error: "Ошибка AI-запроса" }, { status: 500 });
  }
}
