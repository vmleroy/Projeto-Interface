import React, { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, CheckCircle2, XCircle, AlertTriangle, Layers, Hammer, ArrowDownToLine, MoveUpRight, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input, Label, NativeSelect, FieldError } from "@/components/ui/form-components";
import { Link } from "wouter";
import { verificarDeck, MotorNBR6118, calcularD } from "@/lib/bridge-utils";

const bitolas = ["6.3", "8.0", "10.0", "12.5", "16.0", "20.0", "25.0", "32.0"] as const;

const formSchema = z.object({
  hCm: z.coerce.number({ required_error: "Obrigatório" }).min(5, "Mínimo 5 cm"),
  fck: z.coerce.number({ required_error: "Obrigatório" }).min(20, "Mínimo 20 MPa"),
  nSd: z.coerce.number({ required_error: "Obrigatório" }),
  vSd: z.coerce.number({ required_error: "Obrigatório" }),
  mEluPos: z.coerce.number({ required_error: "Obrigatório" }),
  phiPosMm: z.enum(bitolas, { required_error: "Obrigatório" }),
  sPoscm: z.coerce.number({ required_error: "Obrigatório" }).min(2, "Mínimo 2 cm"),
  mEluNeg: z.coerce.number({ required_error: "Obrigatório" }),
  phiNegMm: z.enum(bitolas, { required_error: "Obrigatório" }),
  sNegCm: z.coerce.number({ required_error: "Obrigatório" }).min(2, "Mínimo 2 cm"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Deck() {
  const { toast } = useToast();
  const [result, setResult] = useState<any>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const formatUpdateTime = (value: Date) => value.toLocaleTimeString("pt-BR", { hour12: false });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      setResult(null);
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

      const resultFormatted = {
        aprovado: verificationResult.flexaoPositiva.atende && verificationResult.flexaoNegativa.atende && verificationResult.cortante.atende,
        pos: {
          atende: verificationResult.flexaoPositiva.atende,
          overReinforced: asReqPos === -1,
          dCm: dPos,
          kmd: calcKmd(data.mEluPos, dPos, data.fck),
          asReq: asReqPos > 0 ? asReqPos : 0,
          asMin: verificationResult.asMinima,
          asAdot: Math.max(0, verificationResult.asMinima * 0.5),
          asProv: asAdotPos,
        },
        neg: {
          atende: verificationResult.flexaoNegativa.atende,
          overReinforced: asReqNeg === -1,
          dCm: dNeg,
          kmd: calcKmd(data.mEluNeg, dNeg, data.fck),
          asReq: asReqNeg > 0 ? asReqNeg : 0,
          asMin: verificationResult.asMinima,
          asAdot: Math.max(0, verificationResult.asMinima * 0.5),
          asProv: asAdotNeg,
        },
        cortanteOk: verificationResult.cortante.atende,
        vSd: data.vSd,
        vRdcFinal: verificationResult.cortante.vRdc,
      };

      setResult(resultFormatted);
      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error("Calculation Error:", error);
      setResult(null);
      setLastUpdatedAt(null);
      toast({
        title: "Erro na Verificação",
        description: "Não foi possível realizar a verificação do tabuleiro.",
        variant: "destructive",
      });
    }
  }, [watchedValues, toast]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground pb-20">
      {/* Background with glowing effect */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/blueprint-bg.png`} 
          alt="Technical Blueprint Background" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20">
        
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10 overflow-x-auto pb-2">
          <Link href="/" className="whitespace-nowrap px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all border border-white/10 font-medium font-display text-sm">
            Módulo 1: Definição do Empreendimento
          </Link>
          <Link href="/verify" className="whitespace-nowrap px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all border border-white/10 font-medium font-display text-sm">
            Módulo 2: Verificação NBR 6118
          </Link>
          <Link href="/shear" className="whitespace-nowrap px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all border border-white/10 font-medium font-display text-sm">
            Módulo 3: Cortante NBR 6118:2023
          </Link>
          <Link href="/deck" className="whitespace-nowrap px-5 py-3 rounded-xl bg-primary/20 text-primary border border-primary/30 font-medium font-display text-sm shadow-[0_0_15px_rgba(var(--primary),0.2)]">
            Módulo 4: Tabuleiro
          </Link>
        </div>

        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 text-center md:text-left"
        >
          <div className="inline-flex items-center justify-center p-2.5 mb-6 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
            <Layers className="w-6 h-6 text-primary mr-3" />
            <span className="font-display font-semibold tracking-widest text-sm text-primary uppercase">MÓDULO DO TABULEIRO</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 font-display">
            BridgeDesign <span className="text-gradient-primary">Pro</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Verificação completa do tabuleiro – Flexão ELU (positiva e negativa) com As,mín e Cortante NBR 6118.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Main Form Column */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-7 space-y-6"
          >
            <form className="space-y-6">
              
              {/* Group 1: Dados Gerais */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors duration-300"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-display font-semibold text-foreground">Dados Gerais</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="hCm">Espessura da Laje (h) [cm]</Label>
                    <Input 
                      id="hCm"
                      type="number"
                      step="0.1"
                      icon={Layers}
                      error={form.formState.errors.hCm?.message}
                      {...form.register("hCm")} 
                    />
                    <FieldError error={form.formState.errors.hCm?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fck">fck [MPa]</Label>
                    <Input 
                      id="fck"
                      type="number"
                      step="0.1"
                      icon={Hammer}
                      error={form.formState.errors.fck?.message}
                      {...form.register("fck")} 
                    />
                    <FieldError error={form.formState.errors.fck?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nSd">N_Sd – Força Normal (+ Comp.) [kN/m]</Label>
                    <Input 
                      id="nSd"
                      type="number"
                      step="0.1"
                      icon={ArrowDownToLine}
                      error={form.formState.errors.nSd?.message}
                      {...form.register("nSd")} 
                    />
                    <FieldError error={form.formState.errors.nSd?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vSd">V_Sd – Cortante [kN/m]</Label>
                    <Input 
                      id="vSd"
                      type="number"
                      step="0.1"
                      icon={Zap}
                      error={form.formState.errors.vSd?.message}
                      {...form.register("vSd")} 
                    />
                    <FieldError error={form.formState.errors.vSd?.message} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Group 2: Armadura Positiva */}
                <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50 group-hover:bg-cyan-500 transition-colors duration-300"></div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                      <MoveUpRight className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-display font-semibold text-foreground">Armadura Positiva (M+)</h2>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="mEluPos">M_ELU+ [kN.m/m]</Label>
                      <Input 
                        id="mEluPos"
                        type="number"
                        step="0.1"
                        error={form.formState.errors.mEluPos?.message}
                        {...form.register("mEluPos")} 
                      />
                      <FieldError error={form.formState.errors.mEluPos?.message} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phiPosMm">Bitola φ+ [mm]</Label>
                      <Controller
                        name="phiPosMm"
                        control={form.control}
                        render={({ field }) => (
                          <NativeSelect {...field} id="phiPosMm" error={form.formState.errors.phiPosMm?.message}>
                            {bitolas.map(b => <option key={b} value={b}>{b}</option>)}
                          </NativeSelect>
                        )}
                      />
                      <FieldError error={form.formState.errors.phiPosMm?.message} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sPoscm">Espaçamento s+ [cm]</Label>
                      <Input 
                        id="sPoscm"
                        type="number"
                        step="0.1"
                        error={form.formState.errors.sPoscm?.message}
                        {...form.register("sPoscm")} 
                      />
                      <FieldError error={form.formState.errors.sPoscm?.message} />
                    </div>
                  </div>
                </div>

                {/* Group 3: Armadura Negativa */}
                <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50 group-hover:bg-orange-500 transition-colors duration-300"></div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                      <MoveUpRight className="w-5 h-5 rotate-180" />
                    </div>
                    <h2 className="text-xl font-display font-semibold text-foreground">Armadura Negativa (M-)</h2>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="mEluNeg">M_ELU- [kN.m/m]</Label>
                      <Input 
                        id="mEluNeg"
                        type="number"
                        step="0.1"
                        error={form.formState.errors.mEluNeg?.message}
                        {...form.register("mEluNeg")} 
                      />
                      <FieldError error={form.formState.errors.mEluNeg?.message} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phiNegMm">Bitola φ- [mm]</Label>
                      <Controller
                        name="phiNegMm"
                        control={form.control}
                        render={({ field }) => (
                          <NativeSelect {...field} id="phiNegMm" error={form.formState.errors.phiNegMm?.message}>
                            {bitolas.map(b => <option key={b} value={b}>{b}</option>)}
                          </NativeSelect>
                        )}
                      />
                      <FieldError error={form.formState.errors.phiNegMm?.message} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sNegCm">Espaçamento s- [cm]</Label>
                      <Input 
                        id="sNegCm"
                        type="number"
                        step="0.1"
                        error={form.formState.errors.sNegCm?.message}
                        {...form.register("sNegCm")} 
                      />
                      <FieldError error={form.formState.errors.sNegCm?.message} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto Verification Status */}
              <div className="pt-4">
                <div className="w-full sm:w-auto h-14 px-5 rounded-xl border border-primary/30 bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  <Activity className="w-5 h-5 mr-2" />
                  Atualização automática ativa
                </div>
                <p className="mt-4 text-xs text-muted-foreground flex items-center">
                  <Activity className="w-3 h-3 mr-1.5 opacity-50" />
                  Cálculo conforme NBR 6118. Verificação de Flexão ELU e Cortante para lajes de tabuleiro.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Última atualização: {lastUpdatedAt ? formatUpdateTime(lastUpdatedAt) : "--:--:--"}
                </p>
              </div>

            </form>
          </motion.div>

          {/* Results Sidebar / Info Column */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="lg:col-span-5"
          >
            <div className="sticky top-8">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div 
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="glass-panel rounded-3xl p-1 relative overflow-hidden h-full flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.3)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0"></div>
                    
                    <div className="bg-background/80 rounded-[1.3rem] p-6 sm:p-8 flex-1 flex flex-col z-10 border border-white/5 relative overflow-hidden">
                      <div className="relative z-10 flex-1">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-2xl font-display font-bold text-foreground">Resultados da Verificação</h3>
                          {result.aprovado ? (
                            <div className="flex items-center justify-center bg-green-500/20 text-green-400 p-2 rounded-full">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center bg-red-500/20 text-red-400 p-2 rounded-full">
                              <XCircle className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {/* Card 1: Flexão Positiva (M+) */}
                          <div className={`p-4 rounded-xl border ${result.pos.atende ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                {result.pos.atende ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                Flexão Positiva (M+)
                              </h4>
                            </div>
                            
                            {result.pos.overReinforced ? (
                              <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Seção Superdimensionada (kmd &gt; 0.372)
                              </div>
                            ) : (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">d =</span>
                                  <span className="font-mono">{result.pos.dCm.toFixed(2)} cm</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">kmd =</span>
                                  <span className="font-mono">{result.pos.kmd.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">As,req =</span>
                                  <span className="font-mono">{result.pos.asReq.toFixed(2)} cm²/m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">As,mín =</span>
                                  <span className="font-mono">{result.pos.asMin.toFixed(2)} cm²/m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">As,adot =</span>
                                  <span className="font-mono">{result.pos.asAdot.toFixed(2)} cm²/m</span>
                                </div>
                                <div className="flex justify-between font-semibold pt-1 border-t border-white/10">
                                  <span className="text-foreground">As,prov =</span>
                                  <span className={`font-mono ${result.pos.atende ? 'text-cyan-400' : 'text-red-400'}`}>
                                    {result.pos.asProv.toFixed(2)} cm²/m
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card 2: Flexão Negativa (M-) */}
                          <div className={`p-4 rounded-xl border ${result.neg.atende ? 'bg-orange-500/5 border-orange-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                {result.neg.atende ? <CheckCircle2 className="w-4 h-4 text-orange-400" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                Flexão Negativa (M-)
                              </h4>
                            </div>
                            
                            {result.neg.overReinforced ? (
                              <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Seção Superdimensionada (kmd &gt; 0.372)
                              </div>
                            ) : (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">d =</span>
                                  <span className="font-mono">{result.neg.dCm.toFixed(2)} cm</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">kmd =</span>
                                  <span className="font-mono">{result.neg.kmd.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">As,req =</span>
                                  <span className="font-mono">{result.neg.asReq.toFixed(2)} cm²/m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">As,mín =</span>
                                  <span className="font-mono">{result.neg.asMin.toFixed(2)} cm²/m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">As,adot =</span>
                                  <span className="font-mono">{result.neg.asAdot.toFixed(2)} cm²/m</span>
                                </div>
                                <div className="flex justify-between font-semibold pt-1 border-t border-white/10">
                                  <span className="text-foreground">As,prov =</span>
                                  <span className={`font-mono ${result.neg.atende ? 'text-orange-400' : 'text-red-400'}`}>
                                    {result.neg.asProv.toFixed(2)} cm²/m
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card 3: Cortante */}
                          <div className={`p-4 rounded-xl border ${result.cortanteOk ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                {result.cortanteOk ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                Cortante
                              </h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">V_Sd =</span>
                                <span className="font-mono">{result.vSd.toFixed(2)} kN/m</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">V_Rd,c =</span>
                                <span className="font-mono">{result.vRdcFinal.toFixed(2)} kN/m</span>
                              </div>
                              <div className="flex justify-between font-semibold pt-1 border-t border-white/10">
                                <span className="text-foreground">Verificação:</span>
                                <span className="font-mono">V_Sd ≤ V_Rd,c</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={`mt-6 py-4 px-6 rounded-2xl text-center border-2 shadow-lg ${
                          result.aprovado 
                            ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-green-500/10' 
                            : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-red-500/10'
                        }`}>
                          <h2 className="text-3xl font-display font-black tracking-wider uppercase">
                            {result.aprovado ? "Aprovado" : "Reprovado"}
                          </h2>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-panel rounded-3xl p-1 relative overflow-hidden h-full min-h-[500px] flex flex-col opacity-70"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0"></div>
                    
                    <div className="bg-background/80 rounded-[1.3rem] p-8 flex-1 flex flex-col justify-center items-center z-10 border border-white/5 relative overflow-hidden text-center">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                           style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                      </div>
                      
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-display font-bold text-foreground mb-2">Aguardando Dados</h3>
                      <p className="text-muted-foreground max-w-xs">
                        Preencha os campos para visualizar os resultados automaticamente em tempo real.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          
        </div>
      </div>
    </div>
  );
}
