import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { AnalyzeVitalsBody } from "@workspace/api-zod";

const router = Router();

router.post("/ai/analyze", async (req, res) => {
  const parsed = AnalyzeVitalsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid vitals data" });
    return;
  }

  const { steps, heartRate, sleepQuality, sleepHours, walletAddress } = parsed.data;

  const prompt = `You are the Bio-Sovereign AI Oracle, an advanced autonomous health analysis system integrated with the Solana blockchain. Your role is to evaluate biometric data and determine if a citizen qualifies for an autonomous health reward payment of 0.1 SOL.

CITIZEN BIOMETRIC DATA:
- Daily Steps: ${steps.toLocaleString()} steps
- Resting Heart Rate: ${heartRate} BPM
- Sleep Quality Score: ${sleepQuality.toFixed(1)}/100
- Sleep Duration: ${sleepHours.toFixed(1)} hours
${walletAddress ? `- Wallet Address: ${walletAddress}` : ""}

EVALUATION CRITERIA (National Health Standard Protocol v2.1):
- Steps: 8,000+ daily steps = excellent; 6,000-8,000 = adequate; below 6,000 = insufficient
- Heart Rate: 50-80 BPM = optimal cardiovascular health; outside range = concern
- Sleep Quality: 70+ = excellent; 55-70 = adequate; below 55 = insufficient
- Sleep Hours: 7-9 hours = optimal; 6-7 = acceptable; below 6 = insufficient

SCORING SYSTEM:
- Steps contribution: 25 points max
- Heart rate contribution: 25 points max
- Sleep quality contribution: 25 points max
- Sleep hours contribution: 25 points max

ELIGIBILITY THRESHOLD: Total score of 60 or above qualifies for autonomous reward.

Analyze these vitals precisely and respond ONLY with valid JSON in this exact format:
{
  "eligible": <true or false>,
  "score": <integer 0-100>,
  "verdict": "<short verdict title, max 10 words>",
  "explanation": "<detailed 3-4 sentence explanation of why this citizen does or does not qualify, referencing specific metrics and the national standard criteria. Be authoritative and precise.>",
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>"]
}`;

  try {
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
