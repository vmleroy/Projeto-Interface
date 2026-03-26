/**
 * Motor de Cálculo Estrutural - NBR 6118
 * Adaptado de MotorNBR6118 (Python) para TypeScript
 */

export interface FlexaoResult {
  asRequerida: number;
  asMinima: number;
  asAdotada: number;
  atende: boolean;
  percentualUtilizacao: number;
}

export interface CortanteResult {
  vRdc: number;
  vSd: number;
  atende: boolean;
  percentualUtilizacao: number;
}

export interface DeckVerificationResult {
  flexaoPositiva: FlexaoResult;
  flexaoNegativa: FlexaoResult;
  cortante: CortanteResult;
  asMinima: number;
}

export class MotorNBR6118 {
  /**
   * Calcula a armadura requerida à flexão no ELU
   * @param mSd Momento solicitante (kNm)
   * @param dCm Altura útil (cm)
   * @param fck Resistência do concreto (MPa)
   * @returns Armadura requerida (cm²) ou -1 se não atende por ductilidade
   */
  static calcularFlexaoElu(mSd: number, dCm: number, fck: number): number {
    if (dCm <= 0 || Math.abs(mSd) === 0) return 0.0;

    const fcd = (fck / 1.4) / 10; // kN/cm²
    const fyd = 50 / 1.15; // kN/cm²
    const kmd = Math.abs(mSd) / (100 * Math.pow(dCm, 2) * fcd);

    if (kmd > 0.372) return -1; // Erro de Ductilidade

    const kx = (1 - Math.sqrt(1 - 2 * kmd)) / 0.8;
    return Math.abs(mSd) / (fyd * dCm * (1 - 0.4 * kx));
  }

  /**
   * Calcula a armadura mínima
   * @param fck Resistência do concreto (MPa)
   * @param hCm Altura da seção (cm)
   * @returns Armadura mínima (cm²)
   */
  static calcularAsMin(fck: number, hCm: number): number {
    const rhoMin = Math.max(0.0015, (0.035 * Math.pow(fck / 10, 2 / 3)) / 100);
    return rhoMin * 100 * hCm;
  }

  /**
   * Calcula a resistência ao cortante
   * @param fck Resistência do concreto (MPa)
   * @param dCm Altura útil (cm)
   * @param asCm2 Área de aço (cm²)
   * @param nSd Força normal (kN)
   * @returns Cortante resistente (kN)
   */
  static calcularVrdc(
    fck: number,
    dCm: number,
    asCm2: number,
    nSd: number
  ): number {
    if (dCm <= 0) return 0.0;

    const dM = dCm / 100;
    const k = Math.min(2.0, 1 + Math.sqrt(200 / (dM * 1000)));
    const rhoL = Math.min(0.02, asCm2 / (100 * dCm));
    const sigmaCp = Math.min(
      0.2 * (fck / 1.4),
      Math.abs(nSd) / (100 * dCm * 1.1)
    );

    const vRdc =
      (0.12 * k * Math.pow(100 * rhoL * fck, 1 / 3) + 0.15 * sigmaCp) *
      1000 *
      1.0 *
      dM;
    const vMin =
      (0.035 * Math.pow(k * 1.5, 1 / 2) * Math.pow(fck * 0.5, 1 / 2) +
        0.15 * sigmaCp) *
      1000 *
      1.0 *
      dM;

    return Math.max(vRdc, vMin);
  }

  /**
   * Calcula a área de aço adotada em uma barra
   * @param phiMm Diâmetro da barra (mm)
   * @param espacamentoCm Espaçamento entre barras (cm)
   * @returns Área de aço (cm²/m)
   */
  static calcularAsAdotada(phiMm: number, espacamentoCm: number): number {
    const areaBarra = (Math.PI * Math.pow(phiMm / 10, 2)) / 4;
    return areaBarra * (100 / espacamentoCm);
  }

  /**
   * Número de barras por metro
   * @param espacamentoCm Espaçamento entre barras (cm)
   * @returns Número de barras
   */
  static calcularNumBarras(espacamentoCm: number): number {
    return Math.floor(100 / espacamentoCm);
  }
}

/**
 * Calcula a altura útil (d) baseada em cobrimento e diâmetro da barra
 * @param hCm Altura da seção (cm)
 * @param cobrimentoCm Cobrimento (cm)
 * @param diametroBarra Diâmetro da barra (mm)
 * @returns Altura útil (cm)
 */
export function calcularD(
  hCm: number,
  cobrimentoCm: number = 2.5,
  diametroBarra: number = 12.5
): number {
  return hCm - cobrimentoCm - diametroBarra / 10;
}

/**
 * Verifica a flexão em uma seção
 * @param momento Momento solicitante (kNm/m)
 * @param altura Altura da seção (cm)
 * @param fck Resistência do concreto (MPa)
 * @param diametro Diâmetro da barra (mm)
 * @param espacamento Espaçamento da barra (cm)
 * @returns Resultado da verificação à flexão
 */
export function verificarFlexao(
  momento: number,
  altura: number,
  fck: number,
  diametro: number,
  espacamento: number
): FlexaoResult {
  const d = calcularD(altura, 2.5, diametro);
  const asMin = MotorNBR6118.calcularAsMin(fck, altura);
  const asRequerida = MotorNBR6118.calcularFlexaoElu(momento, d, fck);
  const asAdotada = MotorNBR6118.calcularAsAdotada(diametro, espacamento);

  const asNecessaria = Math.max(asMin, asRequerida > 0 ? asRequerida : asMin);

  return {
    asRequerida: asRequerida > 0 ? asRequerida : 0,
    asMinima: asMin,
    asAdotada,
    atende: asAdotada >= asNecessaria && asRequerida !== -1,
    percentualUtilizacao: asNecessaria > 0 ? (asAdotada / asNecessaria) * 100 : 100,
  };
}

/**
 * Verifica o cortante em uma seção
 * @param vSd Cortante solicitante (kN)
 * @param altura Altura da seção (cm)
 * @param fck Resistência do concreto (MPa)
 * @param areaAco Área de aço (cm²)
 * @param forcaNormal Força normal (kN)
 * @returns Resultado da verificação ao cortante
 */
export function verificarCortante(
  vSd: number,
  altura: number,
  fck: number,
  areaAco: number,
  forcaNormal: number = 0
): CortanteResult {
  const d = calcularD(altura);
  const vRdc = MotorNBR6118.calcularVrdc(fck, d, areaAco, forcaNormal);

  return {
    vRdc,
    vSd,
    atende: vRdc >= vSd,
    percentualUtilizacao: vRdc > 0 ? (vSd / vRdc) * 100 : 0,
  };
}

/**
 * Verificação completa do tabuleiro (deck)
 */
export function verificarDeck(params: {
  hCm: number;
  fck: number;
  mEluPos: number;
  phiPosMm: number;
  sPoscm: number;
  mEluNeg: number;
  phiNegMm: number;
  sNegCm: number;
  vSd: number;
  nSd: number;
}): DeckVerificationResult {
  const asMin = MotorNBR6118.calcularAsMin(params.fck, params.hCm);

  const flexaoPositiva = verificarFlexao(
    params.mEluPos,
    params.hCm,
    params.fck,
    params.phiPosMm,
    params.sPoscm
  );

  const flexaoNegativa = verificarFlexao(
    params.mEluNeg,
    params.hCm,
    params.fck,
    params.phiNegMm,
    params.sNegCm
  );

  const asAdotadaPos = MotorNBR6118.calcularAsAdotada(
    params.phiPosMm,
    params.sPoscm
  );

  const cortante = verificarCortante(
    params.vSd,
    params.hCm,
    params.fck,
    asAdotadaPos,
    params.nSd
  );

  return {
    flexaoPositiva,
    flexaoNegativa,
    cortante,
    asMinima: asMin,
  };
}
