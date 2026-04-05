import { Router } from "express";
import { db } from "@workspace/db";
import { rewardsTable } from "@workspace/db";
import { gte, desc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const router = Router();

function generateHealthHistory(days: number) {
  const points = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const base = 65 + Math.sin(i * 0.4) * 15;
    const noise = (Math.random() - 0.5) * 10;
    points.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      steps: Math.round(5000 + Math.random() * 8000),
      heartRate: Math.round(62 + Math.random() * 20),
      sleepQuality: Math.round(Math.max(40, Math.min(98, base + noise))),
      score: Math.round(Math.max(30, Math.min(98, base + noise + Math.random() * 5))),
    });
  }
  return points;
}

router.get("/statistics/history", async (req, res) => {
  const period = (req.query.period as string) || "week";
  let days = 7;
  if (period === "day") days = 1;
  else if (period === "week") days = 7;
  else if (period === "month") days = 30;

  const history = generateHealthHistory(days);
  res.json(history);
});

router.get("/statistics/summary", async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const records = await db
      .select()
      .from(rewardsTable)
      .where(gte(rewardsTable.createdAt, since))
      .orderBy(desc(rewardsTable.createdAt));

    const avgScore = records.length > 0
      ? records.reduce((acc, r) => acc + r.healthScore, 0) / records.length
      : 72;
    const trend = records.length >= 2
      ? records[0].healthScore - records[records.length - 1].healthScore
      : 3.2;

    res.json({
      avgScore: Math.round(avgScore * 10) / 10,
      trend: Math.round(trend * 10) / 10,
      totalRewards: records.length,
      bestScore: records.length > 0 ? Math.max(...records.map(r => r.healthScore)) : 94,
      worstScore: records.length > 0 ? Math.min(...records.map(r => r.healthScore)) : 52,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

router.post("/statistics/ai-insight", async (req, res) => {
  const { period, avgScore, trend, lang } = req.body as {
    period: string; avgScore: number; trend: number; lang?: string;
  };

  const langInstruction = lang === "kz"
    ? "Жауапты қазақ тілінде бер."
    : lang === "en"
    ? "Reply in English."
    : "Отвечай на русском языке.";

  const prompt = `Ты — Bio-Sovereign AI аналитик здоровья. ${langInstruction}

Данные пользователя за период "${period === "day" ? "день" : period === "week" ? "неделю" : "месяц"}":
- Средний балл здоровья: ${avgScore}/100
- Тренд: ${trend > 0 ? "+" : ""}${trend} баллов
- Оценка: ${avgScore >= 80 ? "отличная" : avgScore >= 60 ? "хорошая" : "требует улучшения"}

Дай 3 конкретные долгосрочные рекомендации для улучшения здоровья. Будь конкретным и вдохновляющим. Формат — 3 пункта, каждый начинается с эмодзи. Максимум 150 слов.`;

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("No API key");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    res.json({ insight: response.text ?? "" });
  } catch (err) {
    res.status(500).json({ error: "AI insight unavailable" });
  }
});

router.post("/statistics/risk-forecast", async (req, res) => {
  const { weekData, avgScore, lang } = req.body as {
    weekData: Array<{ score: number; heartRate: number; steps: number; sleepQuality: number }>;
    avgScore: number;
    lang?: string;
  };

  const langInstruction = lang === "kz"
    ? "Жауапты қазақ тілінде бер."
    : lang === "en"
    ? "Reply in English."
    : "Отвечай на русском языке.";

  const dataStr = (weekData || []).map((d, i) =>
    `День ${i + 1}: балл=${d.score}, пульс=${d.heartRate}, шаги=${d.steps}, сон=${d.sleepQuality}`
  ).join("\n");

  const prompt = `Ты — медицинская ИИ система Bio-Sovereign AI. ${langInstruction}

Биометрические данные пользователя за неделю:
${dataStr}
Средний балл здоровья: ${avgScore}/100

Задача: проанализируй данные и создай ПРОГНОЗ РИСКОВ. Верни JSON без разметки:
{
  "overallRisk": "low" | "medium" | "high",
  "riskScore": число 0-100,
  "diseases": [
    { "name": "Название болезни", "probability": число 0-100, "trend": "growing"|"stable"|"declining", "emoji": "🫀" },
    ...3-4 болезни
  ],
  "forecast7days": "Краткий прогноз на 7 дней (2-3 предложения)",
  "preventionTip": "Главный совет профилактики (1 предложение)"
}`;

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("No API key");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const raw = (response.text ?? "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: "Forecast unavailable" });
  }
});

export default router;
