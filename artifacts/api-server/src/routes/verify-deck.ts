import { Router, type IRouter } from "express";
import { VerifyDeckBody } from "@workspace/api-zod";

const router: IRouter = Router();

interface RebarResult {
  dCm: number;
  kmd: number;
  asReq: number;
  asMin: number;
  asAdot: number;
  asProv: number;
  atende: boolean;
  overReinforced: boolean;
}

/**
 * Flexão ELU — NBR 6118
 * Returns required As (cm²/m) or -1 if over-reinforced
 */
function calcularFlexaoELU(mSd: number, dCm: number, fck: number): { asReq: number; kmd: number; overReinforced: boolean } {
  if (dCm <= 0 || Math.abs(mSd) === 0) return { asReq: 0, kmd: 0, overReinforced: false };

  // fcd in kN/cm² (fck MPa = fck kN/cm², divide by gamac=1.4 then /10 for unit shift)
  const fcd = fck / 1.4 / 10;
  // fyd in kN/cm² (CA-50: fyk=50 kN/cm²)
  const fyd = 50 / 1.15;

  const kmd = Math.abs(mSd) / (100 * dCm ** 2 * fcd);

  if (kmd > 0.372) {
    return { asReq: -1, kmd, overReinforced: true };
  }

  const kx = (1 - Math.sqrt(1 - 2 * kmd)) / 0.8;
  const asReq = Math.abs(mSd) / (fyd * dCm * (1 - 0.4 * kx));

  return { asReq, kmd, overReinforced: false };
}

/**
 * As,min — NBR 6118
 */
function calcularAsMin(fck: number, hCm: number): number {
  const rhoMin = Math.max(0.0015, (0.035 * Math.pow(fck / 10, 2 / 3)) / 100);
  return rhoMin * 100 * hCm; // cm²/m
}

/**
 * Provided As from bar diameter + spacing
 */
function calcularAsProv(phiMm: number, sCm: number): number {
  const phiCm = phiMm / 10;
  return (Math.PI * phiCm ** 2) / 4 / (sCm / 100); // cm²/m
}

/**
 * VRd,c — NBR 6118:2023 Item 19.4.1
 */
function calcularVrdC(fck: number, dCm: number, as1Cm2: number, nSd: number): number {
  if (dCm <= 0) return 0;
  const dM = dCm / 100;
  const k = Math.min(2.0, 1 + Math.sqrt(200 / (dM * 1000)));
  const rhoL = Math.min(0.02, as1Cm2 / (100 * dCm));
  const sigmaCp = Math.min(0.2 * (fck / 1.4), Math.abs(nSd) / (100 * dCm * 1.1));
  const vRdc = (0.12 * k * Math.pow(100 * rhoL * fck, 1 / 3) + 0.15 * sigmaCp) * 1000 * 1.0 * dM;
  const vMin = (0.035 * Math.pow(k, 1.5) * Math.pow(fck, 0.5) + 0.15 * sigmaCp) * 1000 * 1.0 * dM;
  return Math.max(vRdc, vMin);
}

function verifyLayer(mSd: number, phiMm: number, sCm: number, hCm: number, fck: number, cover: number): RebarResult {
  const phiCm = phiMm / 10;
  const dCm = hCm - cover - phiCm / 2;
  const { asReq, kmd, overReinforced } = calcularFlexaoELU(mSd, dCm, fck);
  const asMin = calcularAsMin(fck, hCm);
  const asAdot = overReinforced ? asReq : Math.max(asReq, asMin);
  const asProv = calcularAsProv(phiMm, sCm);
  const atende = !overReinforced && asProv >= asAdot;

  return {
    dCm: parseFloat(dCm.toFixed(2)),
    kmd: parseFloat(kmd.toFixed(5)),
    asReq: parseFloat((overReinforced ? 0 : asReq).toFixed(3)),
    asMin: parseFloat(asMin.toFixed(3)),
    asAdot: parseFloat((overReinforced ? 0 : asAdot).toFixed(3)),
    asProv: parseFloat(asProv.toFixed(3)),
    atende,
    overReinforced,
  };
}

router.post("/", async (req, res) => {
  const parsed = VerifyDeckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { hCm, fck, nSd, vSd, mEluPos, phiPosMm, sPoscm, mEluNeg, phiNegMm, sNegCm } = parsed.data;

  const COVER_CM = 2.5;

  const pos = verifyLayer(mEluPos, phiPosMm, sPoscm, hCm, fck, COVER_CM);
  const neg = verifyLayer(mEluNeg, phiNegMm, sNegCm, hCm, fck, COVER_CM);

  // For shear use positive As as the longitudinal reinforcement
  const vRdcFinal = calcularVrdC(fck, pos.dCm, pos.asProv, nSd);
  const cortanteOk = vSd <= vRdcFinal;

  const aprovado = pos.atende && neg.atende && cortanteOk;

  res.json({
    pos,
    neg,
    vRdcFinal: parseFloat(vRdcFinal.toFixed(2)),
    vSd,
    cortanteOk,
    aprovado,
  });
});

export default router;
