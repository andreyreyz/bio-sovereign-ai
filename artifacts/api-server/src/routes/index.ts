import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vitalsRouter from "./vitals";
import aiRouter from "./ai";
import rewardsRouter from "./rewards";
import githubRouter from "./github";
import statisticsRouter from "./statistics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vitalsRouter);
router.use(aiRouter);
router.use(rewardsRouter);
router.use(githubRouter);
router.use(statisticsRouter);

export default router;
