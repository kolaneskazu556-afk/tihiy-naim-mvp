import { NextResponse } from "next/server";
import type OpenAI from "openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Provider = { apiKey: string; baseURL: string; model: string; jsonMode: boolean };

const getProvider = (): Provider | null => {
  if (process.env.GEMINI_API_KEY) {
    return {
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      model: "gemini-2.5-flash",
      jsonMode: true,
    };
  }
  if (process.env.GROQ_API_KEY) {
    return {
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
      jsonMode: true,
    };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      model: "openai/gpt-oss-20b:free",
      jsonMode: false,
    };
  }
  if (process.env.MISTRAL_API_KEY) {
    return {
      apiKey: process.env.MISTRAL_API_KEY,
      baseURL: "https://api.mistral.ai/v1",
      model: "mistral-small-latest",
      jsonMode: true,
    };
  }
  return null;
};

const SYSTEM =
  "Ты — AI-ассистент по найму для компаний без HR-отдела. Всегда отвечай на русском языке, спокойно, конкретно и по делу. Решение о найме принимает человек, ты помогаешь ему.";

const ask = async (client: OpenAI, p: Provider, user: string, json: boolean): Promise<string> => {
  const res = await client.chat.completions.create({
    model: p.model,
    temperature: 0.3,
    ...(json && p.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
};

const parseJson = (text: string): Record<string, unknown> => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Модель вернула ответ не в формате JSON");
  }
};

/* ===================== ДЕМО-РЕЖИМ (без AI) ===================== */

const words = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-zа-яё0-9+#.\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

// Корень слова: отбрасываем окончание, чтобы «продажах» совпало с «продажи»
const stem = (w: string): string => w.slice(0, Math.max(4, w.length - 2));

const guessName = (resume: string): string => {
  const first = String(resume).split("\n")[0].split(/[,.–—-]/)[0].trim();
  const parts = first.split(/\s+/);
  const looksLikeName =
    parts.length >= 2 && parts.length <= 3 && parts.every((p) => /^[A-ZА-ЯЁ][a-zа-яё]+$/.test(p));
  return looksLikeName ? parts[1] ?? parts[0] : "";
};

const demoScreen = (job: string, criteria: string, resume: string) => {
  const resumeText = String(resume).toLowerCase();
  const list = String(criteria || "")
    .split("\n")
    .map((c) => c.trim())
    .filter(Boolean);

  if (list.length === 0) {
    const hit = words(job).filter((w) => resumeText.includes(stem(w))).length;
    const score = Math.min(90, 45 + hit * 3);
    return {
      score,
      reason:
        "Демо-режим: критерии не заданы, оценка построена по совпадению терминов вакансии и резюме. Подключите AI-ключ для полноценного анализа.",
    };
  }

  const matched: string[] = [];
  const missed: string[] = [];
  list.forEach((c) => {
    const keys = words(c);
    const ok = keys.length > 0 && keys.some((k) => resumeText.includes(stem(k)));
    (ok ? matched : missed).push(c);
  });

  const score = Math.round(35 + (60 * matched.length) / list.length);
  const parts: string[] = ["Демо-режим."];
  if (matched.length) parts.push(`Совпадает с критериями: ${matched.join("; ")}.`);
  if (missed.length) parts.push(`Не нашли подтверждения в резюме: ${missed.join("; ")}.`);
  parts.push("Подключите AI-ключ, и ассистент оценит резюме по смыслу, а не по ключевым словам.");
  return { score, reason: parts.join(" ") };
};

const demoMessage = (resume: string, kind: string) => {
  const name = guessName(resume);
  const hello = name ? `Здравствуйте, ${name}!` : "Здравствуйте!";
  if (kind === "reject") {
    return (
      `${hello}\n\nСпасибо, что нашли время откликнуться и рассказали о своём опыте. ` +
      `Мы внимательно изучили резюме и сейчас решили продолжить диалог с кандидатами, чей профиль ближе к текущим задачам команды.\n\n` +
      `Это не оценка ваших способностей: ваш опыт нам интересен, и мы будем рады вернуться к разговору, если появится подходящая роль. Желаем успехов в поиске!\n\nКоманда найма`
    );
  }
  return (
    `${hello}\n\nСпасибо за отклик. Мы изучили ваше резюме, и ваш опыт показался нам релевантным задачам, которые стоят перед командой. ` +
    `Хотим пригласить вас на интервью (около 40 минут, онлайн), чтобы подробнее обсудить роль и ваши ожидания.\n\n` +
    `Ниже предложены три удобных варианта времени. Выберите любой, и мы всё подтвердим.\n\nКоманда найма`
  );
};

const demoSummary = (notes: string) => {
  const t = String(notes).toLowerCase();
  const pos = ["хорошо", "уверенно", "сильн", "чётко", "четко", "опыт", "разобр", "спокойно", "понимает"];
  const neg = ["минус", "слаб", "риск", "не знает", "не смог", "затруднил", "сомнен", "не работал", "не готов"];
  const p = pos.filter((w) => t.includes(w)).length;
  const n = neg.filter((w) => t.includes(w)).length;
  const hire = p >= n + 1;

  const sentence = String(notes)
    .split(/[.!?]\s/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(". ");

  return {
    summary:
      `Демо-режим. Ключевое из ваших заметок: ${sentence}. ` +
      (hire
        ? "В заметках преобладают сильные стороны, риски выглядят управляемыми. Рекомендуем продвинуть кандидата дальше."
        : "В заметках заметны сомнения и риски, которые стоит снять до оффера. Рекомендуем воздержаться или провести дополнительную встречу.") +
      " Подключите AI-ключ для более глубокого анализа.",
    recommendation: hire ? "HIRE" : "NO_HIRE",
  };
};

const demoResult = (action: string, body: Record<string, unknown>) => {
  if (action === "screen") return demoScreen(String(body.job ?? ""), String(body.criteria ?? ""), String(body.resume ?? ""));
  if (action === "message") return { message: demoMessage(String(body.resume ?? ""), String(body.kind ?? "")) };
  if (action === "summary") return demoSummary(String(body.notes ?? ""));
  return null;
};

/* ===================== ОБРАБОТЧИК ===================== */

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const valid = ["screen", "message", "summary"].includes(action);
  if (!valid) return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });

  if (action === "screen" && (!body.job || !body.resume)) {
    return NextResponse.json({ error: "Заполните вакансию и резюме" }, { status: 400 });
  }
  if (action === "summary" && !body.notes) {
    return NextResponse.json({ error: "Введите заметки с интервью" }, { status: 400 });
  }

  const provider = getProvider();

  // Нет ключа: работаем в демо-режиме
  if (!provider) return NextResponse.json(demoResult(action, body));

  try {
    const { default: OpenAIClient } = await import("openai");
    const client = new OpenAIClient({ apiKey: provider.apiKey, baseURL: provider.baseURL });
    const { job, criteria, resume, notes, kind } = body;

    if (action === "screen") {
      const text = await ask(
        client,
        provider,
        `Оцени резюме кандидата по вакансии.\n\nВАКАНСИЯ:\n${job}\n\nКРИТЕРИИ:\n${criteria || "не указаны, ориентируйся на описание"}\n\nРЕЗЮМЕ:\n${resume}\n\nВерни ТОЛЬКО JSON без пояснений и без markdown: {"score": число от 0 до 100, "reason": "2-4 предложения на русском: что совпало и чего не хватает"}`,
        true,
      );
      const parsed = parseJson(text);
      const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
      return NextResponse.json({ score, reason: String(parsed.reason ?? "") });
    }

    if (action === "message") {
      const goal =
        kind === "reject"
          ? "вежливый, тёплый отказ без шаблонных фраз, с благодарностью за время"
          : "приглашение на интервью, персональное, со ссылкой на конкретный опыт из резюме";
      const text = await ask(
        client,
        provider,
        `Напиши на русском сообщение кандидату (email/telegram): ${goal}. Не более 120 слов. Без темы письма, без плейсхолдеров в скобках, подпись «Команда найма».\n\nВАКАНСИЯ:\n${job}\n\nРЕЗЮМЕ:\n${resume}`,
        false,
      );
      return NextResponse.json({ message: text.trim() });
    }

    const text = await ask(
      client,
      provider,
      `По заметкам менеджера составь краткое саммари интервью и рекомендацию.\n\nВАКАНСИЯ:\n${job}\n\nРЕЗЮМЕ:\n${resume}\n\nЗАМЕТКИ С ИНТЕРВЬЮ:\n${notes}\n\nВерни ТОЛЬКО JSON без пояснений и без markdown: {"summary": "3-5 предложений на русском: сильные стороны, риски, итог", "recommendation": "HIRE" или "NO_HIRE"}`,
      true,
    );
    const parsed = parseJson(text);
    return NextResponse.json({
      summary: String(parsed.summary ?? ""),
      recommendation: parsed.recommendation === "HIRE" ? "HIRE" : "NO_HIRE",
    });
  } catch (error) {
    // AI недоступен (лимит, нет баланса, сбой): показываем демо вместо ошибки
    console.error("AI route error, switching to demo", error);
    return NextResponse.json(demoResult(action, body));
  }
}
