import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vitalsRouter from "./vitals";
import aiRouter from "./ai";
import rewardsRouter from "./rewards";
import githubRouter from "./github";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vitalsRouter);
router.use(aiRouter);
router.use(rewardsRouter);
router.use(githubRouter);

export default router;
