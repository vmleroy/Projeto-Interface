import React, { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, CheckCircle2, XCircle, AlertTriangle, Layers, Hammer,
  ArrowDownToLine, MoveUpRight, Zap, Ruler, Building2, User, MoveHorizontal,
  BoxSelect, Download, FileText, ChevronRight
} from "lucide-react";
import { Input, Label, NativeSelect, FieldError } from "@/components/ui/form-components";
import { verificarDeck, MotorNBR6118, calcularD } from "@/lib/bridge-utils";

const bitolas = ["6.3", "8.0", "10.0", "12.5", "16.0", "20.0", "25.0", "32.0"] as const;

const formSchema = z.object({
  // Module 1: Geometry
  nomeObra: z.string().optional(),
  responsavelTecnico: z.string().optional(),
  vaoLongitudinal: z.coerce.number().min(0.1, "Vão deve > 0"),
  larguraTotal: z.coerce.number().min(0.1, "Largura > 0"),
  numLongarinas: z.coerce.number().int().min(1, "Min 1"),
  alturaViga: z.coerce.number().min(0.1, "Altura > 0"),
  larguraAlma: z.coerce.number().min(0.05, "bw > 0"),
  larguraMesa: z.coerce.number().min(0.1, "bf > 0"),
  usaPreLaje: z.enum(["Sim", "Não"]),
  espessuraPreLaje: z.coerce.number().min(0.01),
  tipoViga: z.enum(["Viga I (Pré-moldada)", "Viga T", "Viga Caixão"]),
  tipoLaje: z.enum(["Moldada in loco", "Com Pré-lajes"]),

  // Module 2: Deck Verification
  hCm: z.coerce.number().min(5, "Mínimo 5 cm"),
  fck: z.coerce.number().min(20, "Mínimo 20 MPa"),
  nSd: z.coerce.number(),
  vSd: z.coerce.number(),
  mEluPos: z.coerce.number(),
  phiPosMm: z.enum(bitolas),
  sPoscm: z.coerce.number().min(2, "Mínimo 2 cm"),
  mEluNeg: z.coerce.number(),
  phiNegMm: z.enum(bitolas),
  sNegCm: z.coerce.number().min(2, "Mínimo 2 cm"),
});

type FormValues = z.infer<typeof formSchema>;

const SectionDiagram = ({ params }: { params: any }) => {
  const canvas = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvas.current) return;

    const ctx = canvas.current.getContext("2d");
    if (!ctx) return;

    const width = canvas.current.width;
    const height = canvas.current.height;
    const scale = 80; // pixels per meter

    // Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "rgba(148, 163, 184, 0.1)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    const larg = params.larguraTotal * scale;
    const h = params.alturaViga * scale;
    const bf = params.larguraMesa * scale;
    const bw = params.larguraAlma * scale;
    const numL = params.numLongarinas;

    const offsetX = (width - larg) / 2;
    const offsetY = 50;

    // Draw deck slab (laje)
    ctx.fillStyle = "#7c3aed";
    ctx.globalAlpha = 0.3;
    ctx.fillRect(offsetX, offsetY + h, larg, 20);
    ctx.globalAlpha = 1;

    // Draw pre-slab if used
    if (params.usaPreLaje === "Sim") {
      ctx.fillStyle = "#dc2626";
      ctx.globalAlpha = 0.2;
      ctx.fillRect(offsetX, offsetY + h, larg, params.espessuraPreLaje * scale);
      ctx.globalAlpha = 1;
    }

    // Draw beams (longarinas)
    const dist = larg / (numL + 1);
    for (let i = 0; i < numL; i++) {
      const x = offsetX + (i + 1) * dist - bf / 2;
      // Mesa inferior
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(x, offsetY + h - 8, bf, 8);
      // Alma
      ctx.fillStyle = "#334155";
      ctx.fillRect(x + (bf - bw) / 2, offsetY, bw, h - 8);
    }

    // Dimensions and labels
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";

    // Width dimension
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + h + 40);
    ctx.lineTo(offsetX + larg, offsetY + h + 40);
    ctx.stroke();
    ctx.fillText(`${params.larguraTotal.toFixed(2)} m`, offsetX + larg / 2, offsetY + h + 55);

    // Height dimension
    ctx.fillText(`h = ${params.alturaViga.toFixed(2)} m`, offsetX - 50, offsetY + h / 2);
  }, [params]);

  return (
    <canvas
      ref={canvas}
      width={500}
      height={300}
      className="w-full border border-white/10 rounded-lg"
    />
  );
};

export default function BridgeDesignIntegrated() {
  const [activeTab, setActiveTab] = useState<"geometry" | "verification">("geometry");
  const [deckResult, setDeckResult] = useState<any>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const formatUpdateTime = (value: Date) => value.toLocaleTimeString("pt-BR", { hour12: false });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomeObra: "",
      responsavelTecnico: "",
      vaoLongitudinal: 10.0,
      larguraTotal: 5.0,
      numLongarinas: 2,
      alturaViga: 0.8,
      larguraAlma: 0.2,
      larguraMesa: 0.45,
      usaPreLaje: "Não",
      espessuraPreLaje: 0.05,
      tipoViga: "Viga I (Pré-moldada)",
      tipoLaje: "Moldada in loco",
      hCm: 25,
      fck: 35,
      nSd: 0,
      vSd: 150,
      mEluPos: 100,
      phiPosMm: "12.5",
      sPoscm: 15,
      mEluNeg: 120,
      phiNegMm: "16.0",
      sNegCm: 12.5,
    },
  });

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    const parsed = formSchema.safeParse(watchedValues);
    if (!parsed.success) {
      setDeckResult(null);
      setLastUpdatedAt(null);
      return;
    }

    const data = parsed.data;

    try {
      const verificationResult = verificarDeck({
        hCm: data.hCm,
        fck: data.fck,
        mEluPos: data.mEluPos,
        phiPosMm: parseFloat(data.phiPosMm),
        sPoscm: data.sPoscm,
        mEluNeg: data.mEluNeg,
        phiNegMm: parseFloat(data.phiNegMm),
        sNegCm: data.sNegCm,
        vSd: data.vSd,
        nSd: data.nSd,
      });

      const dPos = calcularD(data.hCm, 2.5, parseFloat(data.phiPosMm));
      const dNeg = calcularD(data.hCm, 2.5, parseFloat(data.phiNegMm));
      const asReqPos = MotorNBR6118.calcularFlexaoElu(data.mEluPos, dPos, data.fck);
      const asReqNeg = MotorNBR6118.calcularFlexaoElu(data.mEluNeg, dNeg, data.fck);
      const asAdotPos = MotorNBR6118.calcularAsAdotada(parseFloat(data.phiPosMm), data.sPoscm);
      const asAdotNeg = MotorNBR6118.calcularAsAdotada(parseFloat(data.phiNegMm), data.sNegCm);

      const calcKmd = (mSd: number, dCm: number, fck: number) => {
        const fcd = (fck / 1.4) / 10;
        return Math.abs(mSd) / (100 * Math.pow(dCm, 2) * fcd);
      };

      const result = {
        aprovado:
          verificationResult.flexaoPositiva.atende &&
          verificationResult.flexaoNegativa.atende &&
          verificationResult.cortante.atende,
        pos: {
          atende: verificationResult.flexaoPositiva.atende,
          overReinforced: asReqPos === -1,
          dCm: dPos,
          kmd: calcKmd(data.mEluPos, dPos, data.fck),
          asReq: asReqPos > 0 ? asReqPos : 0,
          asMin: verificationResult.asMinima,
          asProv: asAdotPos,
        },
        neg: {
          atende: verificationResult.flexaoNegativa.atende,
          overReinforced: asReqNeg === -1,
          dCm: dNeg,
          kmd: calcKmd(data.mEluNeg, dNeg, data.fck),
          asReq: asReqNeg > 0 ? asReqNeg : 0,
          asMin: verificationResult.asMinima,
          asProv: asAdotNeg,
        },
        cortanteOk: verificationResult.cortante.atende,
        vSd: data.vSd,
        vRdcFinal: verificationResult.cortante.vRdc,
      };

      setDeckResult(result);
      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error("Error:", error);
      setDeckResult(null);
      setLastUpdatedAt(null);
    }
  }, [watchedValues]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary uppercase">Sistema Integrado</span>
          </div>
          <h1 className="text-5xl font-extrabold mb-3 font-display">
            BridgeDesign <span className="text-gradient-primary">Pro</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Módulo Integrado - Geometria + Verificação Estrutural
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex gap-2 rounded-xl bg-white/5 p-1 border border-white/10">
                <button
                  onClick={() => setActiveTab("geometry")}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === "geometry"
                      ? "bg-primary text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Geometria
                </button>
                <button
                  onClick={() => setActiveTab("verification")}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === "verification"
                      ? "bg-primary text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Verificação
                </button>
              </div>

              {/* Geometry Tab */}
              {activeTab === "geometry" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* Identificação */}
                  <div className="glass-panel rounded-2xl p-6 relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Identificação
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome da Obra</Label>
                        <Input
                          icon={Building2}
                          placeholder="Ex: Viaduto"
                          {...form.register("nomeObra")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Responsável</Label>
                        <Input
                          icon={User}
                          placeholder="Eng. Nome"
                          {...form.register("responsavelTecnico")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dimensões Principais */}
                  <div className="glass-panel rounded-2xl p-6 relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50 group-hover:bg-cyan-500 transition-colors"></div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Ruler className="w-5 h-5 text-cyan-400" />
                      Dimensões Principais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vão Longitudinal [m]</Label>
                        <Input
                          type="number"
                          step="0.1"
                          icon={MoveHorizontal}
                          {...form.register("vaoLongitudinal")}
                        />
                        <FieldError error={form.formState.errors.vaoLongitudinal?.message} />
                      </div>
                      <div className="space-y-2">
                        <Label>Largura Total [m]</Label>
                        <Input
                          type="number"
                          step="0.1"
                          icon={Ruler}
                          {...form.register("larguraTotal")}
                        />
                        <FieldError error={form.formState.errors.larguraTotal?.message} />
                      </div>
                      <div className="space-y-2">
                        <Label>Altura Viga [m]</Label>
                        <Input
                          type="number"
                          step="0.01"
                          icon={Ruler}
                          {...form.register("alturaViga")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Num. Longarinas</Label>
                        <Input
                          type="number"
                          step="1"
                          icon={BoxSelect}
                          {...form.register("numLongarinas")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção Transversal */}
                  <div className="glass-panel rounded-2xl p-6 relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50 group-hover:bg-orange-500 transition-colors"></div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-orange-400" />
                      Seção Transversal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Largura Alma - bw [m]</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register("larguraAlma")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Largura Mesa - bf [m]</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register("larguraMesa")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Viga</Label>
                        <Controller
                          name="tipoViga"
                          control={form.control}
                          render={({ field }) => (
                            <NativeSelect {...field}>
                              <option>Viga I (Pré-moldada)</option>
                              <option>Viga T</option>
                              <option>Viga Caixão</option>
                            </NativeSelect>
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sistema Laje</Label>
                        <Controller
                          name="tipoLaje"
                          control={form.control}
                          render={({ field }) => (
                            <NativeSelect {...field}>
                              <option>Moldada in loco</option>
                              <option>Com Pré-lajes</option>
                            </NativeSelect>
                          )}
                        />
                      </div>
                      {form.watch("tipoLaje") === "Com Pré-lajes" && (
                        <>
                          <div className="space-y-2">
                            <Label>Usa Pré-Laje?</Label>
                            <Controller
                              name="usaPreLaje"
                              control={form.control}
                              render={({ field }) => (
                                <NativeSelect {...field}>
                                  <option>Sim</option>
                                  <option>Não</option>
                                </NativeSelect>
                              )}
                            />
                          </div>
                          {form.watch("usaPreLaje") === "Sim" && (
                            <div className="space-y-2">
                              <Label>Espessura Pré-Laje [m]</Label>
                              <Input
                                type="number"
                                step="0.01"
                                {...form.register("espessuraPreLaje")}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Verification Tab */}
              {activeTab === "verification" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* Dados Gerais */}
                  <div className="glass-panel rounded-2xl p-6 relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
                    <h3 className="text-lg font-semibold mb-4">Dados Gerais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Espessura Laje [cm]</Label>
                        <Input type="number" step="0.1" {...form.register("hCm")} />
                      </div>
                      <div className="space-y-2">
                        <Label>fck [MPa]</Label>
                        <Input type="number" step="0.1" {...form.register("fck")} />
                      </div>
                      <div className="space-y-2">
                        <Label>N_Sd [kN/m]</Label>
                        <Input type="number" step="0.1" {...form.register("nSd")} />
                      </div>
                      <div className="space-y-2">
                        <Label>V_Sd [kN/m]</Label>
                        <Input type="number" step="0.1" {...form.register("vSd")} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Armadura Positiva */}
                    <div className="glass-panel rounded-2xl p-6 relative group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50 group-hover:bg-cyan-500 transition-colors"></div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MoveUpRight className="w-5 h-5 text-cyan-400" />
                        Armadura (+)
                      </h3>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>M_ELU+ [kNm/m]</Label>
                          <Input type="number" step="0.1" {...form.register("mEluPos")} />
                        </div>
                        <div className="space-y-2">
                          <Label>Bitola φ+ [mm]</Label>
                          <Controller
                            name="phiPosMm"
                            control={form.control}
                            render={({ field }) => (
                              <NativeSelect {...field}>
                                {bitolas.map((b) => (
                                  <option key={b}>{b}</option>
                                ))}
                              </NativeSelect>
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Espaçamento [cm]</Label>
                          <Input type="number" step="0.1" {...form.register("sPoscm")} />
                        </div>
                      </div>
                    </div>

                    {/* Armadura Negativa */}
                    <div className="glass-panel rounded-2xl p-6 relative group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50 group-hover:bg-orange-500 transition-colors"></div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MoveUpRight className="w-5 h-5 text-orange-400 rotate-180" />
                        Armadura (-)
                      </h3>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>M_ELU- [kNm/m]</Label>
                          <Input type="number" step="0.1" {...form.register("mEluNeg")} />
                        </div>
                        <div className="space-y-2">
                          <Label>Bitola φ- [mm]</Label>
                          <Controller
                            name="phiNegMm"
                            control={form.control}
                            render={({ field }) => (
                              <NativeSelect {...field}>
                                {bitolas.map((b) => (
                                  <option key={b}>{b}</option>
                                ))}
                              </NativeSelect>
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Espaçamento [cm]</Label>
                          <Input type="number" step="0.1" {...form.register("sNegCm")} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-12 rounded-xl border border-primary/30 bg-primary/10 text-primary flex items-center justify-center text-base font-semibold">
                    <Activity className="w-5 h-5 mr-2" />
                    Atualização automática ativa
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Última atualização: {lastUpdatedAt ? formatUpdateTime(lastUpdatedAt) : "--:--:--"}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Right Column - Visualization & Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-8 space-y-6">
              {/* Section Diagram */}
              <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
                  Seção Transversal
                </h3>
                <SectionDiagram params={watchedValues} />
              </div>

              {/* Results */}
              {deckResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase">Resultados</h3>
                    {deckResult.aprovado ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className={`p-2 rounded ${deckResult.pos.atende ? "bg-cyan-500/10" : "bg-red-500/10"}`}>
                      <p className="font-semibold">Flexão (+): {deckResult.pos.atende ? "✓" : "✗"}</p>
                      <p className="text-muted-foreground">As,prov = {deckResult.pos.asProv.toFixed(2)} cm²/m</p>
                    </div>
                    <div className={`p-2 rounded ${deckResult.neg.atende ? "bg-orange-500/10" : "bg-red-500/10"}`}>
                      <p className="font-semibold">Flexão (-): {deckResult.neg.atende ? "✓" : "✗"}</p>
                      <p className="text-muted-foreground">As,prov = {deckResult.neg.asProv.toFixed(2)} cm²/m</p>
                    </div>
                    <div className={`p-2 rounded ${deckResult.cortanteOk ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      <p className="font-semibold">Cortante: {deckResult.cortanteOk ? "✓" : "✗"}</p>
                      <p className="text-muted-foreground">V_Rd,c = {deckResult.vRdcFinal.toFixed(2)} kN/m</p>
                    </div>
                  </div>

                  <div
                    className={`py-2 px-3 rounded-lg text-center font-bold text-sm ${
                      deckResult.aprovado
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {deckResult.aprovado ? "APROVADO" : "REPROVADO"}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
