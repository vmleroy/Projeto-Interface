import { Router, type IRouter } from "express";
import { VerifyShearNBR6118Body } from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Calculates VRd,c for slabs without transverse reinforcement
 * NBR 6118:2023 - Item 19.4.1
 */
function calcularVrdC(
  fck: number,
  dCm: number,
  as1Cm2: number,
  nSd: number
): {
  k: number;
  rhoL: number;
  sigmaCp: number;
  vRdc: number;
  vMin: number;
  vRdcFinal: number;
} {
  if (dCm <= 0) {
    return { k: 0, rhoL: 0, sigmaCp: 0, vRdc: 0, vMin: 0, vRdcFinal: 0 };
  }

  const dM = dCm / 100; // meters

  // 1. Size effect coefficient k
  const k = Math.min(2.0, 1 + Math.sqrt(200 / (dM * 1000)));

  // 2. Longitudinal reinforcement ratio ρl (limited to 0.02)
  const rhoL = Math.min(0.02, as1Cm2 / (100 * dCm));

  // 3. Compressive stress from normal force σcp (MPa)
  // Using simplified gross area Ac = 100 * h ≈ 100 * d * 1.1
  const sigmaCp = Math.min(
    0.2 * (fck / 1.4),
    Math.abs(nSd) / (100 * dCm * 1.1)
  );

  // 4. VRd,c formula: [0.12 * k * (100 * ρl * fck)^(1/3) + 0.15 * σcp] * b * d
  const term1 = 0.12 * k * Math.pow(100 * rhoL * fck, 1 / 3);
  const term2 = 0.15 * sigmaCp;
  const vRdc = (term1 + term2) * 1000 * 1.0 * dM; // kN/m

  // 5. Minimum value Vmin
  const vMin =
    (0.035 * Math.pow(k, 1.5) * Math.pow(fck, 0.5) + 0.15 * sigmaCp) *
    1000 *
    1.0 *
    dM;

  const vRdcFinal = Math.max(vRdc, vMin);

  return { k, rhoL, sigmaCp, vRdc, vMin, vRdcFinal };
}

router.post("/", async (req, res) => {
  const parsed = VerifyShearNBR6118Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { vSd, nSd, as1Cm2, hCm, fck } = parsed.data;

  // Effective depth: cover 2.5cm + average bar radius ~0.8cm
  const dCm = hCm - 2.5 - 0.8;

  const { k, rhoL, sigmaCp, vRdc, vMin, vRdcFinal } = calcularVrdC(
    fck,
    dCm,
    as1Cm2,
    nSd
  );

  const atende = vSd <= vRdcFinal;

  res.json({
    dCm: parseFloat(dCm.toFixed(2)),
    k: parseFloat(k.toFixed(4)),
    rhoL: parseFloat(rhoL.toFixed(6)),
    sigmaCp: parseFloat(sigmaCp.toFixed(4)),
    vRdc: parseFloat(vRdc.toFixed(2)),
    vMin: parseFloat(vMin.toFixed(2)),
    vRdcFinal: parseFloat(vRdcFinal.toFixed(2)),
    vSd,
    atende,
  });
});

export default router;
