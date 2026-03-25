import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bridgeRouter from "./bridge";
import verifySectionRouter from "./verify-section";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/bridge", bridgeRouter);
router.use("/bridge/verify-section", verifySectionRouter);

export default router;
