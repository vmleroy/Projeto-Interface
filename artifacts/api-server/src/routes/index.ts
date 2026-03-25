import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bridgeRouter from "./bridge";
import verifySectionRouter from "./verify-section";
import verifyShearRouter from "./verify-shear";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/bridge", bridgeRouter);
router.use("/bridge/verify-section", verifySectionRouter);
router.use("/bridge/verify-shear", verifyShearRouter);

export default router;
