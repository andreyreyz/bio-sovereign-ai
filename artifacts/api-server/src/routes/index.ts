import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vitalsRouter from "./vitals";
import aiRouter from "./ai";
import rewardsRouter from "./rewards";
import githubRouter from "./github";
import statisticsRouter from "./statistics";
import walletRouter from "./wallet";
import financeRouter from "./finance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vitalsRouter);
router.use(aiRouter);
router.use(rewardsRouter);
router.use(githubRouter);
router.use(statisticsRouter);
router.use("/wallet", walletRouter);
router.use("/finance", financeRouter);

export default router;
