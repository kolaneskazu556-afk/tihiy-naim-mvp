"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Mail,
  Play,
  RotateCcw,
  Sparkles,
  Wand2,
  XCircle,
} from "lucide-react";

type Screening = { score: number; reason: string };
type Summary = { summary: string; recommendation: "HIRE" | "NO_HIRE" };
type Kind = "screen" | "invite" | "reject" | "summary";
type Fields = { job: string; criteria: string; resume: string; notes: string };

const EXAMPLE: Fields = {
  job: "Ищем Senior Frontend-разработчика в продуктовую SaaS-компанию (команда 25 человек). Разработка интерфейсов на React и TypeScript, участие в архитектурных решениях, код-ревью, работа в тесной связке с дизайнером и бэкенд-командой. Формат: удалённо, гибкий график.",
  criteria:
    "От 5 лет опыта в frontend\nГлубокое знание React и TypeScript\nОпыт проектирования архитектуры интерфейсов\nОпыт код-ревью и наставничества",
  resume:
    "Иван Иванов, Frontend-разработчик, 6 лет опыта.\n2021–н.в. — Senior Frontend, финтех-стартап: React, TypeScript, Next.js, перевёл монолит на модульную архитектуру, сократил время загрузки на 40%, веду код-ревью для команды из 5 человек.\n2018–2021 — Frontend, e-commerce: React, Redux, тесты на Jest.\nАнглийский B2. Ищу продуктовую компанию с сильной инженерной культурой.",
  notes:
    "Кандидат уверенно рассказал про архитектуру и миграцию монолита, чётко объяснил свои решения. Хорошо знает React и TypeScript, разобрал сложную задачу по производительности. Спокойно относится к обратной связи, есть опыт наставничества. Из минусов: пока не работал в команде с продуктовым менеджером напрямую, ожидания по зарплате на верхней границе вилки.",
};

const callAI = async <T,>(payload: Record<string, unknown>): Promise<T> => {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Что-то пошло не так");
  return data as T;
};

// Имитация календаря: 3 свободных окна в ближайшие рабочие дни
const proposeSlots = (): string[] => {
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
};

const field =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40";

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
    {children}
  </label>
);

const Section = ({
  step,
  tone,
  icon,
  title,
  hint,
  children,
}: {
  step: number;
  tone: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
  children: React.ReactNode;
}) => (
  <section className="fade-up rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-8">
    <div className="mb-7 flex items-start gap-4">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tone}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Шаг {step}</p>
        <h2 className="mt-0.5 text-xl font-medium tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{hint}</p>
      </div>
    </div>
    {children}
  </section>
);

export default function Home() {
  const [job, setJob] = useState("");
  const [criteria, setCriteria] = useState("");
  const [resume, setResume] = useState("");
  const [notes, setNotes] = useState("");

  const [screening, setScreening] = useState<Screening | null>(null);
  const [message, setMessage] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [loading, setLoading] = useState<Kind | null>(null);
  const [error, setError] = useState("");

  const busy = loading !== null;

  const run = async (kind: Kind, d: Fields = { job, criteria, resume, notes }) => {
    setError("");
    setLoading(kind);
    try {
      if (kind === "screen") {
        setMessage("");
        setSlots([]);
        setScreening(
          await callAI<Screening>({ action: "screen", job: d.job, criteria: d.criteria, resume: d.resume }),
        );
      } else if (kind === "invite" || kind === "reject") {
        const r = await callAI<{ message: string }>({
          action: "message",
          job: d.job,
          resume: d.resume,
          kind,
        });
        setMessage(r.message);
        setSlots(kind === "invite" ? proposeSlots() : []);
      } else {
        setSummary(
          await callAI<Summary>({ action: "summary", job: d.job, resume: d.resume, notes: d.notes }),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(null);
    }
  };

  const clearResults = () => {
    setScreening(null);
    setMessage("");
    setSlots([]);
    setSummary(null);
    setError("");
  };

  const fillExample = () => {
    clearResults();
    setJob(EXAMPLE.job);
    setCriteria(EXAMPLE.criteria);
    setResume(EXAMPLE.resume);
    setNotes(EXAMPLE.notes);
  };

  const resetAll = () => {
    clearResults();
    setJob("");
    setCriteria("");
    setResume("");
    setNotes("");
  };

  const runExample = async () => {
    fillExample();
    await run("screen", EXAMPLE);
  };

  const scoreBar =
    screening && screening.score >= 75
      ? "from-emerald-400 to-cyan-400"
      : screening && screening.score >= 50
        ? "from-amber-400 to-orange-400"
        : "from-rose-400 to-fuchsia-500";
  const scoreText =
    screening && screening.score >= 75
      ? "text-emerald-300"
      : screening && screening.score >= 50
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Фоновое свечение */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-violet-600/25 blur-[120px]" />
        <div className="absolute -right-32 top-40 size-[460px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 size-[420px] rounded-full bg-fuchsia-600/15 blur-[130px]" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400" />
            <span className="text-sm font-medium uppercase tracking-[0.22em]">Тихий найм</span>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
            AI-рекрутер · MVP
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl space-y-6 px-6 py-14">
        <div className="mb-10">
          <h1 className="bg-gradient-to-r from-white via-violet-200 to-cyan-300 bg-clip-text text-4xl font-light tracking-tight text-transparent md:text-5xl">
            Найм без суеты
          </h1>
          <p className="mt-4 max-w-xl text-slate-400">
            Люди решают. Ассистент делает: оценивает резюме, пишет кандидатам, предлагает время и собирает
            саммари интервью.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button className={btnPrimary} onClick={runExample} disabled={busy}>
              {loading === "screen" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Показать на примере
            </button>
            <button className={btnGhost} onClick={fillExample} disabled={busy}>
              <Wand2 className="size-4 text-violet-300" /> Заполнить примером
            </button>
            <button className={btnGhost} onClick={resetAll} disabled={busy}>
              <RotateCcw className="size-4 text-slate-400" /> Очистить
            </button>
          </div>
        </div>

        {error && (
          <div className="fade-up rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <Section
          step={1}
          tone="from-violet-500/30 to-violet-500/5 text-violet-200"
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
            <div className="fade-up mt-8 rounded-2xl border border-white/10 bg-black/30 p-6">
              <div className="flex items-end justify-between">
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  Соответствие вакансии
                </span>
                <span className={`text-5xl font-light tabular-nums ${scoreText}`}>{screening.score}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${scoreBar} transition-all duration-700`}
                  style={{ width: `${screening.score}%` }}
                />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-slate-300">{screening.reason}</p>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-6">
                <button className={btnGhost} onClick={() => run("invite")} disabled={busy}>
                  {loading === "invite" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Mail className="size-4 text-cyan-300" />
                  )}
                  Написать приглашение
                </button>
                <button className={btnGhost} onClick={() => run("reject")} disabled={busy}>
                  {loading === "reject" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4 text-rose-300" />
                  )}
                  Написать отказ
                </button>
              </div>

              {message && (
                <div className="fade-up mt-6 space-y-5">
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
                      <div className="grid gap-3 md:grid-cols-3">
                        {slots.map((s) => (
                          <div
                            key={s}
                            className="flex items-center gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3.5 py-3 text-sm capitalize text-slate-200"
                          >
                            <CalendarClock className="size-4 shrink-0 text-cyan-300" />
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
          step={2}
          tone="from-cyan-500/30 to-cyan-500/5 text-cyan-200"
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
            <div className="fade-up mt-8 rounded-2xl border border-white/10 bg-black/30 p-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Саммари</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                    summary.recommendation === "HIRE"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-rose-400/30 bg-rose-400/10 text-rose-300"
                  }`}
                >
                  {summary.recommendation === "HIRE" ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  {summary.recommendation === "HIRE" ? "Hire" : "No Hire"}
                </span>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-slate-300">{summary.summary}</p>
            </div>
          )}
        </Section>

        <footer className="pt-6 text-center text-xs text-slate-600">
          Тихий найм · ассистент делает работу, решения принимают люди
        </footer>
      </main>
    </div>
  );
}
