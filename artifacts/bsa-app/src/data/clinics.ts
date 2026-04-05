export interface ClinicReview {
  id: string;
  userName: string;
  txHash: string;
  visitDate: string;
  rating: number;
  text: string;
  healthBefore: number;
  healthAfter: number;
  verified: boolean;
}

export interface ClinicCase {
  condition: string;
  patientsCount: number;
  avgImprovementPct: number;
  avgScoreBefore: number;
  avgScoreAfter: number;
}

export interface Clinic {
  id: string;
  name: string;
  specialization: string[];
  mainSpec: string;
  aiRating: number;
  aiVerified: boolean;
  premium: boolean;
  flagship?: boolean;
  city?: string;
  medDiscount?: number;
  distance: number;
  visitCost: number;
  address: string;
  phone: string;
  website: string;
  workingHours: Record<string, string>;
  lat: number;
  lng: number;
  photos: string[];
  description: string;
  cases: ClinicCase[];
  reviews: ClinicReview[];
  bsaLeadsCount: number;
  adBudgetSol: number;
}

export const CLINICS: Clinic[] = [
  {
    id: "tibora",
    name: "Tibora",
    specialization: ["Восточная медицина", "Акупунктура", "Аюрведа", "Гомеопатия", "Реабилитация"],
    mainSpec: "Восточная медицина",
    aiRating: 97,
    aiVerified: true,
    premium: true,
    flagship: true,
    city: "Астана",
    medDiscount: 50,
    distance: 18.4,
    visitCost: 15000,
    address: "пр. Кабанбай батыра 11, ЖК Expo City, Астана",
    phone: "+7 (7172) 55-88-00",
    website: "tibora.kz",
    workingHours: { "Пн-Пт": "08:00–21:00", "Сб": "09:00–19:00", "Вс": "10:00–17:00" },
    lat: 51.1282,
    lng: 71.4307,
    photos: [
      "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&q=80",
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80",
    ],
    description: "Tibora — флагманский партнёр BSA. Центр восточной медицины в Астане. Интегрирует тысячелетние практики Востока с современной биометрикой. BSA Health Score используется для персонализации каждого курса лечения. Пользователи BSA получают скидку 50% при оплате SOL-токенами из целевого медицинского баланса.",
    cases: [
      { condition: "Хронический стресс", patientsCount: 134, avgImprovementPct: 89, avgScoreBefore: 43, avgScoreAfter: 91 },
      { condition: "Болевой синдром",     patientsCount: 97,  avgImprovementPct: 78, avgScoreBefore: 51, avgScoreAfter: 87 },
      { condition: "Нарушения сна",       patientsCount: 112, avgImprovementPct: 92, avgScoreBefore: 38, avgScoreAfter: 85 },
      { condition: "Иммунодефицит",       patientsCount: 76,  avgImprovementPct: 71, avgScoreBefore: 46, avgScoreAfter: 79 },
    ],
    reviews: [
      { id: "tr1", userName: "A***v", txHash: "8FxT...3kNp", visitDate: "2026-03-25", rating: 5, text: "Прошёл курс акупунктуры. BSA Health Score вырос с 43 до 89 за 4 недели. Скидка 50% через SOL — это революция!", healthBefore: 43, healthAfter: 89, verified: true },
      { id: "tr2", userName: "Z***a", txHash: "1GmW...7vQs", visitDate: "2026-03-10", rating: 5, text: "Восточная медицина + аналитика BSA — идеальная комбинация. Никогда не чувствовала себя так хорошо.", healthBefore: 55, healthAfter: 94, verified: true },
    ],
    bsaLeadsCount: 89,
    adBudgetSol: 5.0,
  },
  {
    id: "c1",
    name: "Cardio Life Premium",
    specialization: ["Кардиология", "Аритмология", "Эхокардиография"],
    mainSpec: "Кардиология",
    aiRating: 94,
    aiVerified: true,
    premium: true,
    medDiscount: 30,
    city: "Алматы",
    distance: 1.2,
    visitCost: 12000,
    address: "ул. Достык 87, Алматы",
    phone: "+7 (727) 355-11-22",
    website: "cardiolife.kz",
    workingHours: { "Пн-Пт": "08:00–20:00", "Сб": "09:00–17:00", "Вс": "Выходной" },
    lat: 43.242,
    lng: 76.946,
    photos: [
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80",
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&q=80",
    ],
    description: "Ведущий кардиологический центр Алматы. AI-анализ ЭКГ, стресс-тесты, холтеровское мониторирование. Партнёр BSA — рейтинг строится на реальных данных выздоровления пациентов в системе.",
    cases: [
      { condition: "Аритмия", patientsCount: 48, avgImprovementPct: 71, avgScoreBefore: 52, avgScoreAfter: 89 },
      { condition: "ИБС", patientsCount: 31, avgImprovementPct: 58, avgScoreBefore: 47, avgScoreAfter: 74 },
      { condition: "Гипертония", patientsCount: 94, avgImprovementPct: 82, avgScoreBefore: 55, avgScoreAfter: 91 },
    ],
    reviews: [
      { id: "r1", userName: "A***v", txHash: "5NqL...8mYw", visitDate: "2026-03-12", rating: 5, text: "После 3 месяцев лечения Health Score вырос с 54 до 88. Рекомендую!", healthBefore: 54, healthAfter: 88, verified: true },
      { id: "r2", userName: "G***a", txHash: "7KpX...2nZr", visitDate: "2026-02-28", rating: 4, text: "Отличные специалисты, аппаратура последнего поколения.", healthBefore: 61, healthAfter: 79, verified: true },
    ],
    bsaLeadsCount: 47,
    adBudgetSol: 2.5,
  },
  {
    id: "c2",
    name: "NeuroBalance Clinic",
    specialization: ["Неврология", "Нейрохирургия", "Реабилитация"],
    mainSpec: "Неврология",
    aiRating: 88,
    aiVerified: true,
    premium: true,
    medDiscount: 25,
    city: "Алматы",
    distance: 2.7,
    visitCost: 9500,
    address: "пр. Аль-Фараби 11, Алматы",
    phone: "+7 (727) 312-44-55",
    website: "neurobalance.kz",
    workingHours: { "Пн-Пт": "09:00–19:00", "Сб": "10:00–16:00", "Вс": "Выходной" },
    lat: 43.228,
    lng: 76.887,
    photos: [
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80",
    ],
    description: "Специализированный центр неврологии и нейрореабилитации. Биоэлектрическая стимуляция, нейровизуализация, программы BSA-интеграции для мониторинга восстановления.",
    cases: [
      { condition: "Мигрень", patientsCount: 67, avgImprovementPct: 74, avgScoreBefore: 49, avgScoreAfter: 85 },
      { condition: "Инсульт (реабилитация)", patientsCount: 22, avgImprovementPct: 61, avgScoreBefore: 38, avgScoreAfter: 61 },
    ],
    reviews: [
      { id: "r3", userName: "M***k", txHash: "3RsW...7pQn", visitDate: "2026-03-01", rating: 5, text: "Мигрени ушли через 6 недель. Отслеживаю прогресс прямо в BSA.", healthBefore: 49, healthAfter: 83, verified: true },
    ],
    bsaLeadsCount: 31,
    adBudgetSol: 1.8,
  },
  {
    id: "c3",
    name: "EndoMed Center",
    specialization: ["Эндокринология", "Диабетология", "Щитовидная железа"],
    mainSpec: "Эндокринология",
    aiRating: 91,
    aiVerified: true,
    premium: false,
    medDiscount: 20,
    city: "Алматы",
    distance: 3.4,
    visitCost: 8000,
    address: "ул. Тимирязева 28, Алматы",
    phone: "+7 (727) 278-33-44",
    website: "endomed.kz",
    workingHours: { "Пн-Пт": "08:30–18:30", "Сб": "09:00–15:00", "Вс": "Выходной" },
    lat: 43.258,
    lng: 76.912,
    photos: [
      "https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&q=80",
    ],
    description: "Профильный эндокринологический центр. BSA-мониторинг глюкозы и гормонов в реальном времени. Рейтинг AI — 91/100 на основе данных 103 пациентов системы.",
    cases: [
      { condition: "Диабет 2 типа", patientsCount: 103, avgImprovementPct: 79, avgScoreBefore: 41, avgScoreAfter: 73 },
      { condition: "Гипотиреоз", patientsCount: 56, avgImprovementPct: 85, avgScoreBefore: 53, avgScoreAfter: 90 },
    ],
    reviews: [
      { id: "r4", userName: "S***n", txHash: "9TmF...4bHs", visitDate: "2026-03-18", rating: 5, text: "Глюкоза пришла в норму за 2 месяца. Все видно в BSA приложении.", healthBefore: 44, healthAfter: 77, verified: true },
    ],
    bsaLeadsCount: 58,
    adBudgetSol: 3.1,
  },
  {
    id: "c4",
    name: "OrthoSport Clinic",
    specialization: ["Ортопедия", "Спортивная медицина", "Травматология"],
    mainSpec: "Ортопедия",
    aiRating: 86,
    aiVerified: false,
    premium: false,
    medDiscount: 15,
    city: "Алматы",
    distance: 4.1,
    visitCost: 7500,
    address: "ул. Сейфуллина 410, Алматы",
    phone: "+7 (727) 291-22-33",
    website: "orthosport.kz",
    workingHours: { "Пн-Пт": "09:00–21:00", "Сб": "10:00–18:00", "Вс": "11:00–16:00" },
    lat: 43.271,
    lng: 76.933,
    photos: [
      "https://images.unsplash.com/photo-1581595219315-a187dd40c322?w=400&q=80",
    ],
    description: "Клиника спортивной медицины и ортопедии. МРТ, артроскопия, PRP-терапия. Работаем с профессиональными спортсменами и обычными пациентами.",
    cases: [
      { condition: "Артроз коленного сустава", patientsCount: 44, avgImprovementPct: 68, avgScoreBefore: 55, avgScoreAfter: 81 },
      { condition: "Спортивные травмы", patientsCount: 89, avgImprovementPct: 88, avgScoreBefore: 62, avgScoreAfter: 91 },
    ],
    reviews: [],
    bsaLeadsCount: 19,
    adBudgetSol: 0.9,
  },
  {
    id: "c5",
    name: "PulmoVita",
    specialization: ["Пульмонология", "Аллергология", "Функциональная диагностика"],
    mainSpec: "Пульмонология",
    aiRating: 83,
    aiVerified: true,
    premium: false,
    medDiscount: 20,
    city: "Алматы",
    distance: 5.8,
    visitCost: 7000,
    address: "мкр. Аlatau, ул. Рыскулова 2а, Алматы",
    phone: "+7 (727) 345-66-77",
    website: "pulmovita.kz",
    workingHours: { "Пн-Пт": "08:00–18:00", "Сб": "09:00–14:00", "Вс": "Выходной" },
    lat: 43.298,
    lng: 76.871,
    photos: [
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&q=80",
    ],
    description: "Специализация — болезни органов дыхания. SpO₂-мониторинг через BSA-систему, спирометрия, бодиплетизмография.",
    cases: [
      { condition: "Астма", patientsCount: 71, avgImprovementPct: 76, avgScoreBefore: 48, avgScoreAfter: 80 },
      { condition: "ХОБЛ", patientsCount: 28, avgImprovementPct: 54, avgScoreBefore: 39, avgScoreAfter: 60 },
    ],
    reviews: [
      { id: "r5", userName: "D***v", txHash: "2LwK...9cVm", visitDate: "2026-02-14", rating: 4, text: "Астма под контролем впервые за 5 лет.", healthBefore: 51, healthAfter: 78, verified: true },
    ],
    bsaLeadsCount: 24,
    adBudgetSol: 1.2,
  },
  {
    id: "c6",
    name: "GastroComfort",
    specialization: ["Гастроэнтерология", "Гепатология", "Эндоскопия"],
    mainSpec: "Гастроэнтерология",
    aiRating: 79,
    aiVerified: false,
    premium: false,
    medDiscount: 10,
    city: "Алматы",
    distance: 2.1,
    visitCost: 6500,
    address: "ул. Абая 109, Алматы",
    phone: "+7 (727) 267-88-99",
    website: "gastrocomfort.kz",
    workingHours: { "Пн-Пт": "09:00–19:00", "Сб": "10:00–15:00", "Вс": "Выходной" },
    lat: 43.251,
    lng: 76.958,
    photos: [
      "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&q=80",
    ],
    description: "Гастроэнтерологический центр с полным диагностическим циклом. Видеоэндоскопия, УЗИ органов брюшной полости, pH-метрия.",
    cases: [
      { condition: "Язвенная болезнь", patientsCount: 62, avgImprovementPct: 81, avgScoreBefore: 50, avgScoreAfter: 83 },
    ],
    reviews: [],
    bsaLeadsCount: 12,
    adBudgetSol: 0.5,
  },
];

export const SPECIALIZATIONS = [...new Set(CLINICS.flatMap(c => c.specialization))].sort();
export const MAIN_SPECS = [...new Set(CLINICS.map(c => c.mainSpec))].sort();
