"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Mail,
  Sparkles,
  XCircle,
} from "lucide-react";

type Screening = { score: number; reason: string };
type Summary = { summary: string; recommendation: "HIRE" | "NO_HIRE" };

async function callAI<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Что-то пошло не так");
  return data as T;
}

// Имитация календаря: 3 свободных окна в ближайшие рабочие дни
function proposeSlots(): string[] {
  const times = [11, 14, 16];
  const result: string[] = [];
  const d = new Date();
  while (result.length < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const slot = new Date(d);
    slot.setHours(times[result.length], 0, 0, 0);
    result.push(
      new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(slot),
    );
  }
  return result;
}

const field =
  "w-full rounded-lg border border-white/10 bg-[#0f1216] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20 disabled:opacity-50";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-[#0b0d10] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50";

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111418] p-6 md:p-8">
      <div className="mb-6 flex items-start gap-3">
        <div className="mt-0.5 text-slate-400">{icon}</div>
        <div>
          <h2 className="text-lg font-medium tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">{children}</label>;
}

export default function Home() {
  const [job, setJob] = useState("");
  const [criteria, setCriteria] = useState("");
  const [resume, setResume] = useState("");
  const [notes, setNotes] = useState("");

  const [screening, setScreening] = useState<Screening | null>(null);
  const [message, setMessage] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [loading, setLoading] = useState<"screen" | "invite" | "reject" | "summary" | null>(null);
  const [error, setError] = useState("");

  async function run(kind: NonNullable<typeof loading>) {
    setError("");
    setLoading(kind);
    try {
      if (kind === "screen") {
        setMessage("");
        setSlots([]);
        setScreening(await callAI<Screening>({ action: "screen", job, criteria, resume }));
      } else if (kind === "invite" || kind === "reject") {
        const r = await callAI<{ message: string }>({ action: "message", job, resume, kind });
        setMessage(r.message);
        setSlots(kind === "invite" ? proposeSlots() : []);
      } else {
        setSummary(await callAI<Summary>({ action: "summary", job, resume, notes }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;
  const scoreColor =
    screening && screening.score >= 75
      ? "bg-emerald-400"
      : screening && screening.score >= 50
        ? "bg-amber-400"
        : "bg-rose-400";

  return (
    <div>
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <span className="text-sm font-medium uppercase tracking-[0.2em]">Тихий найм</span>
          <span className="text-xs text-slate-500">AI-рекрутер</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
        <div className="mb-4">
          <h1 className="text-3xl font-light tracking-tight md:text-4xl">Найм без суеты</h1>
          <p className="mt-3 text-slate-400">Люди решают. Ассистент делает.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <Section
          icon={<FileText className="size-5" />}
          title="Скрининг кандидата"
          hint="Вставьте вакансию и резюме. Ассистент оценит соответствие и объяснит почему."
        >
          <div className="space-y-5">
            <div>
              <Label>Описание вакансии</Label>
              <textarea
                className={field}
                rows={5}
                value={job}
                onChange={(e) => setJob(e.target.value)}
                disabled={busy}
                placeholder="Ищем Senior Frontend разработчика. Опыт от 5 лет, React, TypeScript…"
              />
            </div>
            <div>
              <Label>Критерии отбора (по одному в строке)</Label>
              <textarea
                className={field}
                rows={3}
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                disabled={busy}
                placeholder={"От 5 лет опыта с React\nTypeScript\nОпыт работы в команде"}
              />
            </div>
            <div>
              <Label>Текст резюме</Label>
              <textarea
                className={field}
                rows={6}
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                disabled={busy}
                placeholder="Иван Иванов, опыт 6 лет в React…"
              />
            </div>
            <button
              className={btnPrimary}
              onClick={() => run("screen")}
              disabled={busy || !job.trim() || !resume.trim()}
            >
              {loading === "screen" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading === "screen" ? "Анализируем резюме…" : "Проанализировать резюме"}
            </button>
          </div>

          {screening && (
            <div className="mt-8 rounded-xl border border-white/10 bg-[#0f1216] p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500">Соответствие вакансии</span>
                <span className="text-3xl font-light tabular-nums">{screening.score}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${scoreColor}`} style={{ width: `${screening.score}%` }} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">{screening.reason}</p>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                <button className={btnGhost} onClick={() => run("invite")} disabled={busy}>
                  {loading === "invite" ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  Написать приглашение
                </button>
                <button className={btnGhost} onClick={() => run("reject")} disabled={busy}>
                  {loading === "reject" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                  Написать отказ
                </button>
              </div>

              {message && (
                <div className="mt-5 space-y-4">
                  <div>
                    <Label>Сообщение кандидату (можно править)</Label>
                    <textarea
                      className={field}
                      rows={7}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  {slots.length > 0 && (
                    <div>
                      <Label>Предложенные слоты</Label>
                      <div className="grid gap-2 md:grid-cols-3">
                        {slots.map((s) => (
                          <div
                            key={s}
                            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm capitalize text-slate-200"
                          >
                            <CalendarClock className="size-4 shrink-0 text-slate-500" />
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Section>

        <Section
          icon={<ClipboardList className="size-5" />}
          title="Интервью и саммари"
          hint="Введите свои заметки. Ассистент соберёт краткий отчёт и даст рекомендацию. Решение остаётся за вами."
        >
          <div className="space-y-5">
            <div>
              <Label>Заметки с интервью</Label>
              <textarea
                className={field}
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy}
                placeholder="Кандидат хорошо знает React, уверенно отвечал про архитектуру…"
              />
            </div>
            <button className={btnPrimary} onClick={() => run("summary")} disabled={busy || !notes.trim()}>
              {loading === "summary" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading === "summary" ? "Готовим саммари…" : "Сгенерировать саммари"}
            </button>
          </div>

          {summary && (
            <div className="mt-8 rounded-xl border border-white/10 bg-[#0f1216] p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500">Саммари</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                    summary.recommendation === "HIRE"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {summary.recommendation === "HIRE" ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <XCircle className="size-3.5" />
                  )}
                  {summary.recommendation === "HIRE" ? "Hire" : "No Hire"}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">{summary.summary}</p>
            </div>
          )}
        </Section>
      </main>
    </div>
  );
}
