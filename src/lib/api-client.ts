import { useCallback, useState } from "react";
import { MotorNBR6118, calcularD } from "@/lib/bridge-utils";

export interface VerificationResult {
  aprovado: boolean;
  dCm: number;
  wkOk: boolean;
  wk: number;
  wkLim: number;
  fadigaOk: boolean;
  deltaSig: number;
  limFad: number;
  cortanteOk: boolean;
  vSd: number;
  vRd1: number;
}

export interface ShearResult {
  atende: boolean;
  dCm: number;
  k: number;
  rhoL: number;
  sigmaCp: number;
  vRdc: number;
  vMin: number;
  vRdcFinal: number;
  vSd: number;
}

type MutationConfig<TData> = {
  mutation?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: unknown) => void;
  };
};

type VerifySectionInput = {
  fck: number;
  hCm: number;
  caa: "I (Fraca)" | "II (Moderada)" | "III (Forte)" | "IV (Muito Forte)";
  bitolaMm: number;
  espacCm: number;
  mElu: number;
  vSd: number;
  mElsW: number;
  mFadMax: number;
  mFadMin: number;
};

type VerifyShearInput = {
  vSd: number;
  nSd: number;
  as1Cm2: number;
  hCm: number;
  fck: number;
};

type GenerateBridgeReportInput = {
  nomeObra?: string;
  responsavelTecnico?: string;
  vaoLongitudinal: number;
  larguraTotal: number;
  numLongarinas: number;
  alturaViga: number;
  larguraAlma: number;
  larguraMesa: number;
  usaPreLaje: "Sim" | "Não";
  espessuraPreLaje: number;
  tipoViga: "Viga I (Pré-moldada)" | "Viga T" | "Viga Caixão";
  tipoLaje: "Moldada in loco" | "Com Pré-lajes";
};

function computeShear(data: VerifyShearInput): ShearResult {
  const dCm = calcularD(data.hCm);
  const dM = Math.max(dCm, 0.01) / 100;
  const k = Math.min(2.0, 1 + Math.sqrt(200 / (Math.max(dM, 0.001) * 1000)));
  const rhoL = Math.min(0.02, data.as1Cm2 / (100 * Math.max(dCm, 0.01)));
  const sigmaCp = Math.min(
    0.2 * (data.fck / 1.4),
    Math.abs(data.nSd) / (100 * Math.max(dCm, 0.01) * 1.1),
  );

  const vRdc =
    (0.12 * k * Math.pow(100 * rhoL * data.fck, 1 / 3) + 0.15 * sigmaCp) *
    1000 *
    dM;
  const vMin =
    (0.035 * Math.sqrt(k * 1.5) * Math.sqrt(data.fck * 0.5) + 0.15 * sigmaCp) *
    1000 *
    dM;

  const vRdcFinal = Math.max(vRdc, vMin);

  return {
    atende: data.vSd <= vRdcFinal,
    dCm,
    k,
    rhoL,
    sigmaCp,
    vRdc,
    vMin,
    vRdcFinal,
    vSd: data.vSd,
  };
}

function computeVerification(data: VerifySectionInput): VerificationResult {
  const dCm = calcularD(data.hCm, 2.5, data.bitolaMm);

  const limByCaa: Record<VerifySectionInput["caa"], number> = {
    "I (Fraca)": 0.4,
    "II (Moderada)": 0.3,
    "III (Forte)": 0.3,
    "IV (Muito Forte)": 0.2,
  };

  const wkLim = limByCaa[data.caa];
  const wk = Math.abs(data.mElsW) / (Math.max(data.fck, 1) * 100) + data.espacCm / 1000;
  const wkOk = wk <= wkLim;

  const deltaSig =
    (Math.abs(data.mFadMax - data.mFadMin) * 1_000_000) /
    Math.max(data.hCm * data.bitolaMm * 10, 1);
  const limFad = 190_000;
  const fadigaOk = deltaSig <= limFad;

  const asAdotada = MotorNBR6118.calcularAsAdotada(data.bitolaMm, data.espacCm);
  const vRd1 = MotorNBR6118.calcularVrdc(data.fck, dCm, asAdotada, 0);
  const cortanteOk = data.vSd <= vRd1;

  return {
    aprovado: wkOk && fadigaOk && cortanteOk,
    dCm,
    wkOk,
    wk,
    wkLim,
    fadigaOk,
    deltaSig,
    limFad,
    cortanteOk,
    vSd: data.vSd,
    vRd1,
  };
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Unexpected local client error");
}

export function useVerifySectionNBR6118(config?: MutationConfig<VerificationResult>) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    ({ data }: { data: VerifySectionInput }) => {
      setIsPending(true);
      Promise.resolve()
        .then(() => computeVerification(data))
        .then((result) => config?.mutation?.onSuccess?.(result))
        .catch((error) => config?.mutation?.onError?.(toError(error)))
        .finally(() => setIsPending(false));
    },
    [config],
  );

  return { mutate, isPending };
}

export function useVerifyShearNBR6118(config?: MutationConfig<ShearResult>) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    ({ data }: { data: VerifyShearInput }) => {
      setIsPending(true);
      Promise.resolve()
        .then(() => computeShear(data))
        .then((result) => config?.mutation?.onSuccess?.(result))
        .catch((error) => config?.mutation?.onError?.(toError(error)))
        .finally(() => setIsPending(false));
    },
    [config],
  );

  return { mutate, isPending };
}

export function useGenerateBridgeReport(config?: MutationConfig<Blob>) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    ({ data }: { data: GenerateBridgeReportInput }) => {
      setIsPending(true);
      Promise.resolve()
        .then(() => {
          const content = [
            "Memória de Cálculo - BridgeDesign Pro",
            "",
            `Obra: ${data.nomeObra || "Não informado"}`,
            `Responsável técnico: ${data.responsavelTecnico || "Não informado"}`,
            "",
            "Parâmetros geométricos:",
            `- Vão longitudinal: ${data.vaoLongitudinal} m`,
            `- Largura total: ${data.larguraTotal} m`,
            `- Número de longarinas: ${data.numLongarinas}`,
            `- Altura da viga: ${data.alturaViga} m`,
            `- Largura da alma: ${data.larguraAlma} m`,
            `- Largura da mesa: ${data.larguraMesa} m`,
            `- Usa pré-laje: ${data.usaPreLaje}`,
            `- Espessura da pré-laje: ${data.espessuraPreLaje} m`,
            `- Tipo de viga: ${data.tipoViga}`,
            `- Tipo de laje: ${data.tipoLaje}`,
          ].join("\n");

          return new Blob([content], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
        })
        .then((blob) => config?.mutation?.onSuccess?.(blob))
        .catch((error) => config?.mutation?.onError?.(toError(error)))
        .finally(() => setIsPending(false));
    },
    [config],
  );

  return { mutate, isPending };
}
