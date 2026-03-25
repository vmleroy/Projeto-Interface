import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, User, Ruler, MoveHorizontal, BoxSelect, 
  Layers, FileText, ChevronRight, Activity, Download, CheckCircle2 
} from "lucide-react";
import { Link } from "wouter";
import { useGenerateBridgeReport } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Input, Label, NativeSelect, FieldError } from "@/components/ui/form-components";
import { Button } from "@/components/ui/button";

// Schema based on OpenAPI definitions
const formSchema = z.object({
  nomeObra: z.string().optional(),
  responsavelTecnico: z.string().optional(),
  vaoLongitudinal: z.coerce.number({
    required_error: "Campo obrigatório",
    invalid_type_error: "Deve ser um número"
  }).min(0.1, "O vão deve ser maior que zero"),
  larguraTotal: z.coerce.number({
    required_error: "Campo obrigatório",
    invalid_type_error: "Deve ser um número"
  }).min(0.1, "A largura deve ser maior que zero"),
  numApoios: z.coerce.number({
    required_error: "Campo obrigatório",
    invalid_type_error: "Deve ser um número"
  }).int("Deve ser um número inteiro").min(2, "Mínimo de 2 apoios"),
  tipoViga: z.enum(["Viga I (Pré-moldada)", "Viga T", "Viga Caixão"], {
    required_error: "Selecione o tipo de viga",
  }),
  tipoLaje: z.enum(["Moldada in loco", "Com Pré-lajes"], {
    required_error: "Selecione o sistema de laje",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomeObra: "",
      responsavelTecnico: "",
      vaoLongitudinal: 10.0,
      larguraTotal: 5.0,
      numApoios: 2,
      tipoViga: "Viga I (Pré-moldada)",
      tipoLaje: "Moldada in loco",
    },
  });

  const { mutate: generateReport, isPending } = useGenerateBridgeReport({
    mutation: {
      onSuccess: (blob) => {
        // Handle Blob download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Memoria_Calculo_Ponte.docx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setIsSuccess(true);
        toast({
          title: "Relatório Gerado",
          description: "O download do arquivo .docx foi iniciado.",
        });
        
        setTimeout(() => setIsSuccess(false), 3000);
      },
      onError: (error) => {
        console.error("API Error:", error);
        toast({
          title: "Erro na Geração",
          description: "Não foi possível gerar o relatório. Verifique os dados.",
          variant: "destructive",
        });
      },
    },
  });

  const onSubmit = (data: FormValues) => {
    generateReport({ data });
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
          <Link href="/" className="whitespace-nowrap px-5 py-3 rounded-xl bg-primary/20 text-primary border border-primary/30 font-medium font-display text-sm shadow-[0_0_15px_rgba(var(--primary),0.2)]">
            Módulo 1: Definição do Empreendimento
          </Link>
          <Link href="/verify" className="whitespace-nowrap px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all border border-white/10 font-medium font-display text-sm">
            Módulo 2: Verificação NBR 6118
          </Link>
          <Link href="/shear" className="whitespace-nowrap px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all border border-white/10 font-medium font-display text-sm">
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
            <span className="font-display font-semibold tracking-widest text-sm text-primary uppercase">MÓDULO DE CÁLCULO</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 font-display">
            BridgeDesign <span className="text-gradient-primary">Pro</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Definição geométrica e geração automática de memória de cálculo para superestruturas de pontes.
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
              
              {/* Section 1: Identificação */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors duration-300"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-display font-semibold text-foreground">Identificação do Projeto</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="nomeObra">Nome da Obra</Label>
                    <Input 
                      id="nomeObra"
                      icon={Building2}
                      placeholder="Ex: Viaduto sobre o Rio X"
                      {...form.register("nomeObra")} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsavelTecnico">Responsável Técnico</Label>
                    <Input 
                      id="responsavelTecnico"
                      icon={User}
                      placeholder="Eng. Nome Sobrenome"
                      {...form.register("responsavelTecnico")} 
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Geometria */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50 group-hover:bg-cyan-500 transition-colors duration-300"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-display font-semibold text-foreground">Geometria e Superestrutura</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vaoLongitudinal">Vão Longitudinal (Y) [m] <span className="text-destructive">*</span></Label>
                    <Input 
                      id="vaoLongitudinal"
                      type="number"
                      step="0.1"
                      icon={MoveHorizontal}
                      error={form.formState.errors.vaoLongitudinal?.message}
                      {...form.register("vaoLongitudinal")} 
                    />
                    <FieldError error={form.formState.errors.vaoLongitudinal?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="larguraTotal">Largura Total (X) [m] <span className="text-destructive">*</span></Label>
                    <Input 
                      id="larguraTotal"
                      type="number"
                      step="0.1"
                      icon={Ruler}
                      error={form.formState.errors.larguraTotal?.message}
                      {...form.register("larguraTotal")} 
                    />
                    <FieldError error={form.formState.errors.larguraTotal?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numApoios">Número de Apoios <span className="text-destructive">*</span></Label>
                    <Input 
                      id="numApoios"
                      type="number"
                      step="1"
                      icon={BoxSelect}
                      error={form.formState.errors.numApoios?.message}
                      {...form.register("numApoios")} 
                    />
                    <FieldError error={form.formState.errors.numApoios?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipoViga">Tipo de Viga <span className="text-destructive">*</span></Label>
                    <Controller
                      name="tipoViga"
                      control={form.control}
                      render={({ field }) => (
                        <NativeSelect {...field} id="tipoViga" error={form.formState.errors.tipoViga?.message}>
                          <option value="Viga I (Pré-moldada)">Viga I (Pré-moldada)</option>
                          <option value="Viga T">Viga T</option>
                          <option value="Viga Caixão">Viga Caixão</option>
                        </NativeSelect>
                      )}
                    />
                    <FieldError error={form.formState.errors.tipoViga?.message} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="tipoLaje">Sistema da Laje <span className="text-destructive">*</span></Label>
                    <Controller
                      name="tipoLaje"
                      control={form.control}
                      render={({ field }) => (
                        <NativeSelect {...field} id="tipoLaje" error={form.formState.errors.tipoLaje?.message}>
                          <option value="Moldada in loco">Moldada in loco</option>
                          <option value="Com Pré-lajes">Com Pré-lajes</option>
                        </NativeSelect>
                      )}
                    />
                    <FieldError error={form.formState.errors.tipoLaje?.message} />
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
                        Gerando Documento...
                      </motion.div>
                    ) : isSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center text-white"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Relatório Pronto
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Gerar Memória de Cálculo
                        <ChevronRight className="w-5 h-5 ml-1 opacity-50 group-hover:translate-x-1 transition-transform" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
                <p className="mt-4 text-xs text-muted-foreground flex items-center">
                  <Activity className="w-3 h-3 mr-1.5 opacity-50" />
                  Gera um documento Word (.docx) padronizado e formatado para impressão.
                </p>
              </div>

            </form>
          </motion.div>

          {/* Sidebar / Info Column */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="lg:col-span-5 hidden lg:block"
          >
            <div className="sticky top-8">
              <div className="glass-panel rounded-3xl p-1 relative overflow-hidden h-full min-h-[500px] flex flex-col">
                {/* Decorative UI elements inside the glass panel */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0"></div>
                
                <div className="bg-background/80 rounded-[1.3rem] p-8 flex-1 flex flex-col z-10 border border-white/5 relative overflow-hidden">
                  
                  {/* Faint blueprint grid inside the card */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                       style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-2xl font-display font-bold text-foreground mb-4">Pré-visualização de Dados</h3>
                    
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center py-3 border-b border-border/50">
                        <span className="text-muted-foreground">Vão Longitudinal</span>
                        <span className="font-mono text-primary">{form.watch("vaoLongitudinal") || "0"} m</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-border/50">
                        <span className="text-muted-foreground">Largura Total</span>
                        <span className="font-mono text-primary">{form.watch("larguraTotal") || "0"} m</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-border/50">
                        <span className="text-muted-foreground">Área do Tabuleiro</span>
                        <span className="font-mono font-medium text-foreground">
                          {((form.watch("vaoLongitudinal") || 0) * (form.watch("larguraTotal") || 0)).toFixed(2)} m²
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-border/50">
                        <span className="text-muted-foreground">Superestrutura</span>
                        <span className="font-medium text-right max-w-[150px] truncate text-foreground" title={form.watch("tipoViga")}>
                          {form.watch("tipoViga")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-12 bg-primary/10 rounded-2xl p-5 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-primary">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground mb-1">Padrão de Engenharia</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            O relatório gerado atende às especificações técnicas normativas e inclui todas as variáveis de verificação geométrica primária.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </div>
  );
}
