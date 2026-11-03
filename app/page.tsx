'use client';

import { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';

export default function Home() {
  const [jobDesc, setJobDesc] = useState('Ищем Senior Frontend разработчика. Опыт React 5+ лет, знание Next.js обязательно.');
  const [resumeText, setResumeText] = useState('');
  const [result, setResult] = useState<{ score: number, reason: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');

  const handleScreen = async () => {
    if (!resumeText) return alert('Вставьте текст резюме');
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ action: 'screen', resumeText, jobDescription: jobDesc }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert('Ошибка');
    }
    setLoading(false);
  };

  const handleSummary = async () => {
    if (!notes) return alert('Введите заметки');
    setLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ action: 'summary', notes }),
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch (e) {
      alert('Ошибка');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="border-b pb-4">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Тихий найм</h1>
          <p className="text-slate-500 mt-2">Люди решают. Ассистент делает.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="w-5 h-5"/> Скрининг кандидата</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Описание вакансии</label>
              <textarea className="w-full p-3 border rounded-lg h-24 focus:ring-2 focus:ring-slate-900 outline-none transition-all" value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Текст резюме (вставьте сюда)</label>
              <textarea className="w-full p-3 border rounded-lg h-40 focus:ring-2 focus:ring-slate-900 outline-none transition-all" placeholder="Иван Иванов, опыт 6 лет в React..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
            </div>
            <button onClick={handleScreen} disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} Проанализировать резюме
            </button>
            {result && (
              <div className={`p-4 rounded-lg border ${result.score > 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.score > 70 ? <CheckCircle className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
                  <span className="font-bold text-lg">Match: {result.score}%</span>
                </div>
                <p className="text-sm text-slate-700">{result.reason}</p>
              </div>
            )}
          </div>
          <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold flex items-center gap-2"><CheckCircle className="w-5 h-5"/> Интервью и Саммари</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Заметки с интервью</label>
              <textarea className="w-full p-3 border rounded-lg h-40 focus:ring-2 focus:ring-slate-900 outline-none transition-all" placeholder="Кандидат хорошо знает React..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <button onClick={handleSummary} disabled={loading || !notes} className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />} Сгенерировать саммари
            </button>
            {summary && (
              <div className="p-4 rounded-lg bg-slate-100 border border-slate-200 mt-4">
                <h3 className="font-bold mb-2 text-slate-900">Итоговое саммари:</h3>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{summary}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
