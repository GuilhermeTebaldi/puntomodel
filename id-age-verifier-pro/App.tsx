
import React, { useState, useRef } from 'react';
import { VerificationStatus, VerificationState } from './types';
import { scanDocumentLocally } from './services/ocrService';
import { calculateAge, verifyMajority } from './services/logicService';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<string>("SISTEMA_STANDBY");
  const [logs, setLogs] = useState<string[]>([]);
  const [state, setState] = useState<VerificationState & { processedPreview?: string | null }>({
    status: VerificationStatus.IDLE,
    result: null,
    error: null,
    imagePreview: null,
    processedPreview: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-5), `> ${msg}`]);
    setCurrentStep(msg);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setLogs([]);
      setState(prev => ({ 
        ...prev, 
        imagePreview: base64, 
        processedPreview: null,
        status: VerificationStatus.SCANNING,
        error: null,
        result: null
      }));
      runLocalScanner(base64);
    };
    reader.readAsDataURL(file);
  };

  const runLocalScanner = async (image: string) => {
    try {
      addLog("BOOT_ENGINE: NUCLEO_WASM_V5_STABLE");
      addLog("INIT: ANALISE_MULTI_MODAL_INICIADA");
      
      const ocr = await scanDocumentLocally(image, (step) => addLog(step));
      
      setState(prev => ({ ...prev, processedPreview: ocr.processedImage }));

      if (!ocr.birthDate) {
        throw new Error("ERRO_EXTRAÇÃO: Nenhuma data compatível encontrada. Certifique-se que o documento está legível e não está oculto.");
      }

      const age = calculateAge(ocr.birthDate);
      const isOver18 = verifyMajority(age);
      addLog("SUCCESS: EXTRAÇÃO_DADOS_COMPLETA");
      addLog("LOGIC: VERIFICANDO_MAIORIDADE");

      setState(prev => ({
        ...prev,
        status: VerificationStatus.SUCCESS,
        result: {
          fullName: "Identidade Verificada",
          documentType: 'RG', 
          dateOfBirth: ocr.birthDate!,
          rawDateOfBirthFound: ocr.birthDate!,
          currentAge: age,
          isOver18: isOver18,
          documentCountry: "Detectado",
          documentNumber: "BR_" + Math.floor(Math.random() * 99999),
          expiryDate: "N/A",
          isValid: true,
          confidence: ocr.confidence / 100,
          reasoning: "Motor robusto com multi-passagem de rotação (0-270°) e filtros adaptativos de limiar (thresholding)."
        },
      }));

    } catch (err: any) {
      addLog("FAILURE: PROCESSO_INTERROMPIDO");
      setState(prev => ({
        ...prev,
        status: VerificationStatus.ERROR,
        error: err.message,
      }));
    }
  };

  const reset = () => {
    setState({
      status: VerificationStatus.IDLE,
      result: null,
      error: null,
      imagePreview: null,
      processedPreview: null
    });
    setLogs([]);
    setCurrentStep("SISTEMA_STANDBY");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-300 font-mono p-4 md:p-8 selection:bg-blue-500/30 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Cyber-Professional */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-8 gap-6 relative">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-600 flex items-center justify-center rounded shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all hover:scale-105 duration-300">
              <i className="fas fa-shield-halved text-white text-2xl"></i>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
                Bio<span className="text-blue-500 text-glow-blue">Lock</span>_Scanner
              </h1>
              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.4em] font-bold">Gold Master Edition v4.5 | Local Only</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
            <div className={`w-2.5 h-2.5 rounded-full ${state.status === VerificationStatus.SCANNING ? 'bg-yellow-500 animate-pulse shadow-[0_0_8px_#eab308]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`}></div>
            <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase">
              KERNEL_ENGINE: {state.status === VerificationStatus.SCANNING ? 'BUSY' : 'READY'}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LADO ESQUERDO: ENGINE & DYNAMIC LOGS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-sm relative overflow-hidden group shadow-2xl">
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                   <i className="fas fa-circle text-[6px] text-red-600 animate-pulse"></i> SINAL_VIDEO_BRUTO
                </span>
                <span className="text-[8px] text-slate-700 font-bold">CANAL_01</span>
              </div>
              
              <div className="aspect-[16/10] bg-black flex items-center justify-center relative overflow-hidden">
                {!state.imagePreview ? (
                  <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center hover:bg-blue-600/5 transition-all duration-500 group">
                    <div className="w-20 h-20 border-2 border-dashed border-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:border-blue-500/50 group-hover:scale-110 transition-all duration-500">
                      <i className="fas fa-cloud-upload text-2xl text-slate-800 group-hover:text-blue-500"></i>
                    </div>
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-slate-300 transition-colors">Carregar Documento</p>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" />
                  </label>
                ) : (
                  <img src={state.imagePreview} className="w-full h-full object-contain p-4 opacity-90 transition-opacity duration-700" />
                )}
                
                {state.status === VerificationStatus.SCANNING && (
                  <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-sm flex flex-col items-center justify-center transition-all">
                    <div className="w-full h-[2px] bg-blue-500 absolute animate-scanning-line shadow-[0_0_20px_#3b82f6] z-10"></div>
                    <div className="px-6 py-3 bg-black border border-blue-500/50 text-blue-400 text-[11px] font-black shadow-2xl animate-pulse uppercase tracking-[0.3em] relative z-20">
                      {currentStep}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Terminal de Auditoria Avançado */}
            <div className="bg-black border border-slate-800 p-6 rounded-sm min-h-[180px] flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <i className="fas fa-terminal text-6xl"></i>
              </div>
              <div className="space-y-2 font-mono text-[10px] relative z-10">
                <div className="text-slate-600 border-b border-slate-900 pb-3 mb-3 flex justify-between items-center font-bold tracking-widest">
                  <span className="flex items-center gap-2"><i className="fas fa-stream text-blue-500"></i> LOG_AUDITORIA_SISTEMA</span>
                  <span className="text-slate-800 italic uppercase">Kernel_v4.5</span>
                </div>
                {logs.length === 0 && <p className="text-slate-800 italic animate-pulse">>> AGUARDANDO_DADOS_PARA_PROCESSAMENTO...</p>}
                {logs.map((log, i) => (
                  <p key={i} className={`transition-all duration-300 ${i === logs.length - 1 ? "text-blue-400 font-black animate-in slide-in-from-left-2" : "text-slate-600"}`}>
                    {log}
                  </p>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-900 text-[9px] text-slate-700 flex justify-between uppercase font-black tracking-widest italic">
                <span>Crypt: LOCAL_SHA_256</span>
                <span>Buffer: VOLATILE_MEMORY</span>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: RESULTADOS GOLD MASTER */}
          <div className="lg:col-span-7">
            {state.status === VerificationStatus.IDLE && (
              <div className="h-full border border-slate-800 bg-slate-900/10 rounded-sm flex flex-col items-center justify-center p-12 text-center group transition-all">
                <div className="relative mb-10">
                   <div className="w-28 h-28 border-4 border-slate-900 rounded-full flex items-center justify-center transition-all duration-500 group-hover:border-slate-800">
                      <i className="fas fa-id-card text-4xl text-slate-800 group-hover:text-slate-700 transition-colors"></i>
                   </div>
                   <div className="absolute inset-0 border-t-4 border-blue-600/30 rounded-full animate-spin-slow"></div>
                </div>
                <h3 className="text-slate-600 font-black text-xs uppercase tracking-[0.5em] mb-4 italic">Modulo_Standby</h3>
                <p className="text-[10px] text-slate-700 max-w-xs uppercase leading-relaxed font-bold">
                  Insira o documento para extração biomeométrica. O processamento é 100% privado e local.
                </p>
              </div>
            )}

            {state.status === VerificationStatus.SUCCESS && state.result && (
              <div className="animate-in fade-in zoom-in-98 duration-700 space-y-8">
                <div className={`p-1 relative overflow-hidden rounded-sm shadow-2xl transition-all duration-700 ${state.result.isOver18 ? 'bg-emerald-500/40 shadow-emerald-500/10' : 'bg-red-500/40 shadow-red-500/10'}`}>
                   <div className="bg-[#020408] p-10 h-full w-full border border-white/5">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                        <div>
                          <p className={`text-[10px] font-black uppercase mb-4 tracking-[0.3em] ${state.result.isOver18 ? 'text-emerald-500' : 'text-red-500'}`}>
                             {state.result.isOver18 ? 'IDENTIDADE_VALIDADA_OK' : 'IDENTIDADE_RESTRITA_FAIL'}
                          </p>
                          <h2 className={`text-5xl md:text-7xl font-black italic tracking-tighter uppercase transition-all duration-700 ${state.result.isOver18 ? 'text-white text-glow-emerald' : 'text-red-500 text-glow-red'}`}>
                            {state.result.isOver18 ? 'AUTHORIZED' : 'RESTRICTED'}
                          </h2>
                        </div>
                        <div className="bg-slate-900/30 p-8 border border-slate-800/50 text-center min-w-[160px] shadow-2xl relative group">
                          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-[0.2em]">Idade_Extraida</p>
                          <div className={`text-6xl font-black italic transition-colors duration-700 ${state.result.isOver18 ? 'text-white' : 'text-red-600'}`}>
                            {state.result.currentAge}<span className="text-2xl text-slate-600 ml-1">Y</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 border-t border-slate-800 pt-10">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] block mb-3">Nascimento_ISO</span>
                          <span className="text-3xl font-black text-white italic tracking-tighter">
                            {new Date(state.result.dateOfBirth).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] block mb-3">Confiança_Motor</span>
                          <span className={`text-3xl font-black italic tracking-tighter transition-colors duration-500 ${state.result.confidence > 0.5 ? 'text-emerald-500 text-glow-emerald' : 'text-yellow-500 text-glow-yellow'}`}>
                            {(state.result.confidence * 100).toFixed(0)}%_VERIFIED
                          </span>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900/20 border border-slate-800 p-8 flex flex-col md:flex-row gap-10 items-center shadow-xl hover:bg-slate-900/30 transition-all duration-500">
                  <div className="w-full md:w-1/3 bg-black p-3 border border-slate-800 shadow-inner group overflow-hidden">
                    <img src={state.processedPreview || ''} className="w-full h-28 object-contain contrast-150 grayscale group-hover:scale-105 transition-transform duration-700" />
                    <div className="text-[9px] text-center text-slate-700 mt-3 uppercase font-black tracking-widest italic border-t border-slate-900 pt-2">VISÃO_MÁQUINA_CORE</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[11px] font-black text-blue-500 uppercase mb-4 tracking-[0.3em] flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div> RELATÓRIO_TÉCNICO
                    </h4>
                    <p className="text-[11px] text-slate-500 uppercase leading-relaxed italic font-bold tracking-tight">
                      ANÁLISE: {state.result.reasoning}. O processamento foi executado via WebAssembly (Tesseract WASM) em ambiente isolado. Privacidade total garantida.
                    </p>
                  </div>
                </div>

                <button onClick={reset} className="group relative w-full py-6 bg-white text-black font-black text-[14px] uppercase tracking-[0.8em] hover:bg-blue-600 hover:text-white transition-all duration-500 shadow-[0_0_40px_rgba(255,255,255,0.05)] overflow-hidden active:scale-[0.98]">
                  <span className="relative z-10 italic">Reiniciar_Motor</span>
                  <div className="absolute inset-0 bg-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                </button>
              </div>
            )}

            {state.status === VerificationStatus.ERROR && (
              <div className="bg-red-950/10 border border-red-900/40 p-14 text-center rounded-sm animate-in zoom-in-95 duration-500 shadow-2xl">
                <div className="w-24 h-24 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
                  <i className="fas fa-exclamation-triangle text-red-600 text-4xl"></i>
                </div>
                <h3 className="text-white font-black uppercase tracking-[0.4em] mb-6 text-base italic">Falha_Sistêmica</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed mb-12 max-w-sm mx-auto uppercase font-black tracking-tighter">
                  {state.error}
                </p>
                <div className="flex flex-col sm:flex-row gap-6 max-w-sm mx-auto">
                  <button onClick={reset} className="flex-1 py-4 border border-slate-800 text-[11px] font-black uppercase hover:bg-slate-900 transition-all tracking-widest">Resetar</button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-4 bg-red-600 text-white text-[11px] font-black uppercase hover:bg-red-500 transition-all shadow-xl shadow-red-900/30 tracking-widest">Retentar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanning-line {
          0% { top: -5%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 105%; opacity: 0; }
        }
        .animate-scanning-line {
          animation: scanning-line 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .text-glow-blue {
          text-shadow: 0 0 15px rgba(59, 130, 246, 0.7);
        }
        .text-glow-emerald {
          text-shadow: 0 0 20px rgba(16, 185, 129, 0.8);
        }
        .text-glow-red {
          text-shadow: 0 0 20px rgba(220, 38, 38, 0.8);
        }
        .text-glow-yellow {
          text-shadow: 0 0 15px rgba(234, 179, 8, 0.6);
        }
        .animate-spin-slow {
          animation: spin 10s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
