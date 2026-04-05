import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { AnalyzeVitalsBody } from "@workspace/api-zod";

const router = Router();

function getAiClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

router.post("/ai/analyze", async (req, res) => {
  const parsed = AnalyzeVitalsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid vitals data" });
    return;
  }

  const { steps, heartRate, sleepQuality, sleepHours, walletAddress } = parsed.data;

  const prompt = `Ты — Bio-Sovereign AI Oracle, продвинутая система автономного анализа здоровья, интегрированная с блокчейном Solana. Твоя задача — оценить биометрические данные гражданина и определить, имеет ли он право на получение автономного вознаграждения в размере 0.1 SOL.

БИОМЕТРИЧЕСКИЕ ДАННЫЕ ГРАЖДАНИНА:
- Шаги за день: ${steps.toLocaleString()} шагов
- Пульс в покое: ${heartRate} BPM
- Индекс качества сна: ${sleepQuality.toFixed(1)}/100
- Продолжительность сна: ${sleepHours.toFixed(1)} часов
${walletAddress ? `- Адрес кошелька: ${walletAddress}` : ""}

КРИТЕРИИ ОЦЕНКИ (Протокол национального стандарта здоровья v2.1):
- Шаги: 8 000+ = отлично; 6 000–8 000 = достаточно; ниже 6 000 = недостаточно
- Пульс: 50–80 BPM = оптимально; вне диапазона = требует внимания
- Качество сна: 70+ = отлично; 55–70 = достаточно; ниже 55 = недостаточно
- Часы сна: 7–9 часов = оптимально; 6–7 = приемлемо; ниже 6 = недостаточно

СИСТЕМА БАЛЛОВ:
- Вклад шагов: до 25 баллов
- Вклад пульса: до 25 баллов
- Вклад качества сна: до 25 баллов
- Вклад часов сна: до 25 баллов

ПОРОГ ПРАВА НА ВОЗНАГРАЖДЕНИЕ: общий балл 60 и выше.

Проанализируй данные и ответь ТОЛЬКО валидным JSON в таком формате (текст на русском языке):
{
  "eligible": <true или false>,
  "score": <целое число 0-100>,
  "verdict": "<краткое название вердикта, максимум 8 слов>",
  "explanation": "На основе данных о сне (${sleepQuality.toFixed(1)}/100) и шагах (${steps}), ваш индекс здоровья <оценка>. Условия смарт-контракта <статус>. <2-3 предложения с конкретными показателями и выводом>",
  "recommendations": ["<рекомендация 1>", "<рекомендация 2>", "<рекомендация 3>"]
}`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";
    let verdict;
    try {
      verdict = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        req.log.error({ text }, "Failed to extract JSON from Gemini response");
        res.status(500).json({ error: "AI analysis failed to produce valid response" });
        return;
      }
      verdict = JSON.parse(jsonMatch[0]);
    }

    res.json(verdict);
  } catch (err) {
    req.log.error({ err }, "Gemini AI analysis error");
    res.status(500).json({ error: "AI analysis service unavailable" });
  }
});

export default router;
