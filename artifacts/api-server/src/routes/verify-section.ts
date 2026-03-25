import { Router, type IRouter } from "express";
import { VerifySectionNBR6118Body } from "@workspace/api-zod";

const router: IRouter = Router();

function calcularEstadioII(
  fck: number,
  hM: number,
  cobrM: number,
  phiM: number,
  sM: number,
  alphaE: number,
  momentoK: number
): { sigmaSt: number; x2: number; d: number; As: number } {
  const d = hM - cobrM - phiM / 2;
  const As = (Math.PI * phiM ** 2) / 4 / sM;

  const b = 1.0;
  const A = 0.5 * b;
  const B = alphaE * As;
  const C = -alphaE * As * d;

  const x2 = (-B + Math.sqrt(B ** 2 - 4 * A * C)) / (2 * A);
  const I_ii = (b * x2 ** 3) / 3 + alphaE * As * (d - x2) ** 2;
  const sigmaSt = alphaE * (momentoK * (d - x2) / I_ii);

  return { sigmaSt, x2, d, As };
}

const CAA_DATA: Record<string, { cobr: number; wkLim: number }> = {
  "I (Fraca)": { cobr: 20, wkLim: 0.4 },
  "II (Moderada)": { cobr: 25, wkLim: 0.3 },
  "III (Forte)": { cobr: 35, wkLim: 0.2 },
  "IV (Muito Forte)": { cobr: 45, wkLim: 0.2 },
};

router.post("/", async (req, res) => {
  const parsed = VerifySectionNBR6118Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fck, hCm, caa, bitolaMm, espacCm, mElu, vSd, mElsW, mFadMax, mFadMin } = parsed.data;

  const caaData = CAA_DATA[caa];
  const cobrM = caaData.cobr / 1000;
  const phiM = bitolaMm / 1000;
  const sM = espacCm / 100;
  const hM = hCm / 100;
  const alphaE = 15;
  const Es = 210_000_000; // kN/m²

  const { d, As } = calcularEstadioII(fck, hM, cobrM, phiM, sM, alphaE, mElsW);

  // 1. Crack width (ELS-W)
  const { sigmaSt: sigW } = calcularEstadioII(fck, hM, cobrM, phiM, sM, alphaE, mElsW);
  const wk = (phiM / 12.5) * (sigW / Es) * 3 * 1000; // mm
  const wkLim = caaData.wkLim;
  const wkOk = wk <= wkLim;

  // 2. Fatigue
  const { sigmaSt: sigMax } = calcularEstadioII(fck, hM, cobrM, phiM, sM, alphaE, mFadMax);
  const { sigmaSt: sigMin } = calcularEstadioII(fck, hM, cobrM, phiM, sM, alphaE, mFadMin);
  const deltaSig = Math.abs(sigMax - sigMin);
  const limFad = 190_000; // kN/m²
  const fadigaOk = deltaSig <= limFad;

  // 3. Shear (VRd1 - without stirrups, Eurocode-derived model from NBR 6118)
  const k = Math.min(2.0, 1 + Math.sqrt(200 / (d * 1000)));
  const rhoL = Math.min(0.02, As / (1.0 * d));
  const vRd1 = 0.12 * k * (100 * rhoL * fck) ** (1 / 3) * 1000 * 1.0 * d;
  const cortanteOk = vSd <= vRd1;

  const aprovado = wkOk && fadigaOk && cortanteOk;

  res.json({
    dCm: parseFloat((d * 100).toFixed(2)),
    wk: parseFloat(wk.toFixed(4)),
    wkLim,
    wkOk,
    deltaSig: parseFloat(deltaSig.toFixed(2)),
    limFad,
    fadigaOk,
    vSd,
    vRd1: parseFloat(vRd1.toFixed(2)),
    cortanteOk,
    aprovado,
  });
});

export default router;
