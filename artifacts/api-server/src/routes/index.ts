import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vitalsRouter from "./vitals";
import aiRouter from "./ai";
import rewardsRouter from "./rewards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vitalsRouter);
router.use(aiRouter);
router.use(rewardsRouter);

export default router;
