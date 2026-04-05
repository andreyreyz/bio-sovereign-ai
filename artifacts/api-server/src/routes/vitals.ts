import { Router } from "express";

const router = Router();

function simulateVitals() {
  const hour = new Date().getHours();
  const baseSteps = 4000 + Math.floor(Math.random() * 8000);
  const baseHR = 58 + Math.floor(Math.random() * 30);
  const baseSleep = 5.5 + Math.random() * 3.5;
  const baseSleepQuality = 55 + Math.random() * 40;

  return {
    steps: baseSteps + Math.floor(Math.sin(hour / 24 * Math.PI * 2) * 500),
    heartRate: baseHR + Math.floor(Math.sin(Date.now() / 10000) * 3),
    sleepQuality: Math.min(100, Math.round(baseSleepQuality * 10) / 10),
    sleepHours: Math.round(baseSleep * 10) / 10,
    timestamp: new Date().toISOString(),
  };
}

router.get("/vitals/current", (req, res) => {
  res.json(simulateVitals());
});

router.get("/vitals/history", (req, res) => {
  const history = [];
  const now = Date.now();
  for (let i = 23; i >= 0; i--) {
    const ts = new Date(now - i * 3600 * 1000);
    const hour = ts.getHours();
    history.push({
      timestamp: ts.toISOString(),
      steps: Math.floor(3000 + Math.random() * 9000 + Math.sin(hour / 24 * Math.PI * 2) * 1000),
      heartRate: Math.floor(55 + Math.random() * 35),
      sleepQuality: Math.round((50 + Math.random() * 45) * 10) / 10,
      sleepHours: Math.round((5 + Math.random() * 4) * 10) / 10,
    });
  }
  res.json(history);
});

export default router;
