import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, CheckCircle2, XCircle, AlertTriangle, Layers, Info, Hammer, Zap, ArrowDownToLine
} from "lucide-react";
import { useVerifyShearNBR6118 } from "@/lib/api-client";
import type { ShearResult } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Input, Label, FieldError } from "@/components/ui/form-components";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const formSchema = z.object({
  vSd: z.coerce.number({ required_error: "Obrigatório" }),
  nSd: z.coerce.number({ required_error: "Obrigatório" }),
  as1Cm2: z.coerce.number({ required_error: "Obrigatório" }).min(0, "Deve ser positivo"),
  hCm: z.coerce.number({ required_error: "Obrigatório" }).min(5, "Mínimo 5 cm"),
  fck: z.coerce.number({ required_error: "Obrigatório" }).min(20, "Mínimo 20 MPa"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Shear() {
  const { toast } = useToast();
  const [result, setResult] = useState<ShearResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vSd: 150.0,
      nSd: 0.0,
      as1Cm2: 12.5,
      hCm: 25.0,
      fck: 35.0,
    },
  });

  const { mutate: verifyShear, isPending } = useVerifyShearNBR6118({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        toast({
          title: "Verificação Concluída",
          description: data.atende ? "Cortante Atende." : "Cortante Não Atende.",
          variant: data.atende ? "default" : "destructive",
        });
      },
      onError: (error) => {
        console.error("API Error:", error);
        toast({
          title: "Erro na Verificação",
          description: "Não foi possível realizar a verificação de cortante.",
          variant: "destructive",
        });
      },
    },
  });

  const onSubmit = (data: FormValues) => {
    verifyShear({ data });
  };

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
          <Link href="/shear" className="whitespace-nowrap px-5 py-3 rounded-xl bg-primary/20 text-primary border border-primary/30 font-medium font-display text-sm shadow-[0_0_15px_rgba(var(--primary),0.2)]">
            Módulo 3: Cortante NBR 6118:2023
          </Link>
          <Link href="/deck" className="whitespace-nowrap px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all border border-white/10 font-medium font-display text-sm">
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
            <Activity className="w-6 h-6 text-primary mr-3" />
            <span className="font-display font-semibold tracking-widest text-sm text-primary uppercase">MÓDULO DE CORTANTE</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 font-display">
            BridgeDesign <span className="text-gradient-primary">Pro</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Verificação de resistência ao cortante sem armadura transversal – NBR 6118:2023 Item 19.4.1
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors duration-300"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <ArrowDownToLine className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-display font-semibold text-foreground">Dados para Verificação de Cortante</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="vSd">V_Sd – Esforço Solicitante [kN/m]</Label>
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
                    <Label htmlFor="as1Cm2">As1 – Armadura Longitudinal [cm²/m]</Label>
                    <Input 
                      id="as1Cm2"
                      type="number"
                      step="0.1"
                      icon={Layers}
                      error={form.formState.errors.as1Cm2?.message}
                      {...form.register("as1Cm2")} 
                    />
                    <FieldError error={form.formState.errors.as1Cm2?.message} />
                  </div>

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
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  variant="gradient" 
                  size="lg" 
                  className="w-full sm:w-auto h-14 text-lg font-semibold group relative overflow-hidden"
                  disabled={isPending}
                >
                  <AnimatePresence mode="wait">
                    {isPending ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center"
                      >
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                        Calculando...
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center"
                      >
                        <Activity className="w-5 h-5 mr-2" />
                        Verificar Cortante
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
                <p className="mt-4 text-xs text-muted-foreground flex items-center">
                  <Activity className="w-3 h-3 mr-1.5 opacity-50" />
                  Cálculo conforme NBR 6118:2023 – Item 19.4.1. Lajes sem armadura transversal.
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
                          {result.atende ? (
                            <div className="flex items-center justify-center bg-green-500/20 text-green-400 p-2 rounded-full">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center bg-red-500/20 text-red-400 p-2 rounded-full">
                              <XCircle className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 mb-6 bg-white/5 p-4 rounded-xl">
                          <div className="text-sm font-medium flex justify-between">
                            <span className="text-muted-foreground">Altura útil (d):</span>
                            <span className="text-foreground">{result.dCm.toFixed(2)} cm</span>
                          </div>
                          <div className="text-sm font-medium flex justify-between">
                            <span className="text-muted-foreground">Coef. de escala (k):</span>
                            <span className="text-foreground">{result.k.toFixed(3)}</span>
                          </div>
                          <div className="text-sm font-medium flex justify-between">
                            <span className="text-muted-foreground">Taxa de armadura (ρl):</span>
                            <span className="text-foreground">{(result.rhoL * 100).toFixed(4)}%</span>
                          </div>
                          <div className="text-sm font-medium flex justify-between">
                            <span className="text-muted-foreground">Tensão normal (σcp):</span>
                            <span className="text-foreground">{result.sigmaCp.toFixed(4)} MPa</span>
                          </div>
                        </div>

                        <div className="space-y-4 mb-6">
                          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">V_Rd,c calculado:</span>
                              <span className="font-mono">{result.vRdc.toFixed(2)} kN/m</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">V_min:</span>
                              <span className="font-mono">{result.vMin.toFixed(2)} kN/m</span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-2 mt-2">
                              <span className="text-foreground">V_Rd,c adotado:</span>
                              <span className="font-mono text-primary">{result.vRdcFinal.toFixed(2)} kN/m</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Cortante */}
                          <div className={`p-4 rounded-xl border ${result.atende ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                {result.atende ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                Cortante (NBR 6118:2023)
                              </h4>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">V_Sd ≤ V_Rd,c</span>
                              <span className="font-mono">{result.vSd.toFixed(2)} ≤ {result.vRdcFinal.toFixed(2)} kN/m</span>
                            </div>
                          </div>
                        </div>

                        {!result.atende && (
                          <div className="mt-4 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-start gap-3">
                            <Info className="w-5 h-5 text-yellow-500 mt-0.5" />
                            <p className="text-sm text-yellow-200">
                              DICA: Aumente a espessura da laje ou a armadura longitudinal (As1).
                            </p>
                          </div>
                        )}

                        <div className={`mt-8 py-4 px-6 rounded-2xl text-center border-2 shadow-lg ${
                          result.atende 
                            ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-green-500/10' 
                            : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-red-500/10'
                        }`}>
                          <h2 className="text-3xl font-display font-black tracking-wider uppercase">
                            {result.atende ? "Atende" : "Não Atende"}
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
                        Preencha o formulário e execute a verificação para visualizar os resultados aqui.
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
