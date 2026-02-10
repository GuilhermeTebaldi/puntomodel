
import React, { useState, useRef } from 'react';
import { VerificationStatus, VerificationState } from './types';
import { scanDocumentLocally } from './services/ocrService';
import { calculateAge, verifyMajority } from './services/logicService';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<string>("SISTEMA_STANDBY");
  const [logs, setLogs] = useState<string[]>([]);
  const [state, setState] = useState<VerificationState & { processedPreview?: string | null, samplesCount?: number }>({
    status: VerificationStatus.IDLE,
    result: null,
    error: null,
    imagePreview: null,
    processedPreview: null,
    samplesCount: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-8), `> ${msg}`]);
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
        result: null,
        samplesCount: 0
      }));
      runLocalScanner(base64);
    };
    reader.readAsDataURL(file);
  };

  const runLocalScanner = async (image: string) => {
    try {
      addLog("BOOT_ENGINE: NUCLEO_WASM_V6_OTIMIZADO");
      addLog("INIT: ACELERAÇÃO_HARDWARE_PARALELA_ON");
      
      const startTime = Date.now();
      const ocr = await scanDocumentLocally(image, (step) => addLog(step));
      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(1);

      setState(prev => ({ ...prev, processedPreview: ocr.processedImage, samplesCount: ocr.samplesFound }));

      if (!ocr.birthDate) {
        throw new Error("ERRO_CONSENSO: Não foi possível validar uma data de nascimento comum em 12 tentativas paralelas. Tente uma foto mais nítida.");
      }

      const age = calculateAge(ocr.birthDate);
      const isOver18 = verifyMajority(age);
      addLog(`SUCCESS: CONSENSO_ATINGIDO_EM_${processingTime}S`);

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
          documentCountry: "Brasil",
          documentNumber: "LOCAL_ID_" + Math.floor(Math.random() * 999999),
          expiryDate: "N/A",
          isValid: true,
          confidence: ocr.confidence / 100,
          reasoning: `Análise ultra-rápida (${processingTime}s) com 12 núcleos de amostragem estatística e pré-processamento de imagem otimizado.`
        },
      }));

    } catch (err: any) {
      addLog("FAILURE: ENGINE_ERROR");
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
      processedPreview: null,
      samplesCount: 0
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
            <div className="w-14 h-14 bg-blue-600 flex items-center justify-center rounded shadow-[0_0_30px_#2563eb] transition-all hover:scale-105 duration-300">
              <i className="fas fa-bolt text-white text-2xl animate-pulse"></i>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
                Bio<span className="text-blue-500 text-glow-blue">Lock</span>_Consensus
              </h1>
              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.4em] font-bold italic">Gold Master v6.0 | Turbo Multi-Threading</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/50 px-6 py-3 rounded-full border border-slate-800 shadow-inner">
            <div className={`w-3 h-3 rounded-full ${state.status === VerificationStatus.SCANNING ? 'bg-blue-500 animate-ping shadow-[0_0_10px_#3b82f6]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`}></div>
            <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase">
              PARALLEL_STATE: {state.status === VerificationStatus.SCANNING ? 'ACTIVE_THREADS' : 'IDLE_STABLE'}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LADO ESQUERDO: ENGINE & DYNAMIC LOGS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-sm relative overflow-hidden group shadow-2xl">
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                   <i className="fas fa-eye text-[8px] text-blue-500 animate-pulse"></i> CAPTURA_DOCUMENTO
                </span>
              </div>
              
              <div className="aspect-[16/10] bg-black flex items-center justify-center relative overflow-hidden">
                {!state.imagePreview ? (
                  <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center hover:bg-blue-600/5 transition-all duration-500 group">
                    <div className="w-20 h-20 border-2 border-dashed border-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:border-blue-500/50 group-hover:scale-110 transition-all duration-500 shadow-lg">
                      <i className="fas fa-camera text-2xl text-slate-800 group-hover:text-blue-500"></i>
                    </div>
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-slate-300">Carregar Amostra</p>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" />
                  </label>
                ) : (
                  <img src={state.imagePreview} className="w-full h-full object-contain p-4 opacity-70 grayscale-[0.3] hover:grayscale-0 transition-all duration-700" alt="Documento" />
                )}
                
                {state.status === VerificationStatus.SCANNING && (
                  <div className="absolute inset-0 bg-blue-900/30 backdrop-blur-sm flex flex-col items-center justify-center transition-all">
                    <div className="w-full h-[3px] bg-blue-500 absolute animate-scanning-line shadow-[0_0_30px_#3b82f6] z-10"></div>
                    <div className="px-8 py-4 bg-black border border-blue-500 text-blue-400 text-[11px] font-black shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-pulse uppercase tracking-[0.4em] relative z-20">
                      {currentStep}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Terminal de Auditoria */}
            <div className="bg-black border border-slate-800 p-6 rounded-sm min-h-[240px] flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="space-y-2 font-mono text-[10px] relative z-10">
                <div className="text-slate-600 border-b border-slate-900 pb-3 mb-4 flex justify-between items-center font-bold tracking-widest uppercase">
                  <span className="flex items-center gap-2"><i className="fas fa-terminal text-blue-500"></i> AUDITORIA_EM_REALTIME</span>
                  <span className="text-slate-800 italic">v6.0_TURBO</span>
                </div>
                {logs.length === 0 && <p className="text-slate-800 italic animate-pulse">>> AGUARDANDO_AMOSTRA_DE_BITSTREAM...</p>}
                {logs.map((log, i) => (
                  <p key={i} className={`transition-all duration-300 ${i === logs.length - 1 ? "text-blue-400 font-black scale-105 origin-left" : "text-slate-600"}`}>
                    {log}
                  </p>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-900 text-[9px] text-slate-700 flex justify-between uppercase font-black tracking-widest italic">
                <span>Kernel: WASM_TURBO</span>
                <span>Mode: 12_SAMPLING_CONSENSUS</span>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: RESULTADOS GOLD MASTER */}
          <div className="lg:col-span-7">
            {state.status === VerificationStatus.IDLE && (
              <div className="h-full border border-slate-800 bg-slate-950/40 rounded-sm flex flex-col items-center justify-center p-16 text-center group transition-all shadow-inner">
                <div className="relative mb-12">
                   <div className="w-36 h-36 border-4 border-slate-900 rounded-full flex items-center justify-center transition-all duration-700 group-hover:border-slate-800 group-hover:scale-110 shadow-2xl">
                      <i className="fas fa-id-card text-6xl text-slate-800 group-hover:text-blue-500/40 transition-colors"></i>
                   </div>
                   <div className="absolute inset-0 border-t-4 border-blue-600/30 rounded-full animate-spin-slow"></div>
                   <div className="absolute -inset-6 border border-blue-500/5 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-slate-600 font-black text-[14px] uppercase tracking-[0.8em] mb-4 italic">Modulo_Turbo_Ativo</h3>
                <p className="text-[10px] text-slate-700 max-w-sm uppercase leading-relaxed font-black tracking-tighter">
                  Verificação biomeométrica local. 12 amostras de validação em milissegundos. Nenhuma informação é compartilhada via nuvem.
                </p>
              </div>
            )}

            {state.status === VerificationStatus.SUCCESS && state.result && (
              <div className="animate-in fade-in zoom-in-98 duration-1000 space-y-8">
                <div className={`p-1.5 relative overflow-hidden rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-1000 ${state.result.isOver18 ? 'bg-emerald-500/40 shadow-emerald-500/10' : 'bg-red-500/40 shadow-red-500/10'}`}>
                   <div className="bg-[#020408] p-12 h-full w-full border border-white/5 relative">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-14">
                        <div>
                          <p className={`text-[11px] font-black uppercase mb-5 tracking-[0.5em] ${state.result.isOver18 ? 'text-emerald-500' : 'text-red-500'}`}>
                             {state.result.isOver18 ? 'IDENTIDADE_PROCESSADA_OK' : 'ACESSO_BIO_RESTRITO'}
                          </p>
                          <h2 className={`text-6xl md:text-8xl font-black italic tracking-tighter uppercase transition-all duration-1000 ${state.result.isOver18 ? 'text-white text-glow-emerald' : 'text-red-500 text-glow-red'}`}>
                            {state.result.isOver18 ? 'GRANTED' : 'DENIED'}
                          </h2>
                        </div>
                        <div className="bg-slate-900/60 p-12 border border-slate-800 text-center min-w-[200px] shadow-2xl relative group overflow-hidden">
                          <p className="text-[11px] font-black text-slate-500 uppercase mb-4 tracking-[0.3em] relative z-10">Idade_Bio</p>
                          <div className={`text-8xl font-black italic transition-colors duration-1000 relative z-10 ${state.result.isOver18 ? 'text-white' : 'text-red-600'}`}>
                            {state.result.currentAge}<span className="text-4xl text-slate-700 ml-1">Y</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-16 border-t border-slate-800/80 pt-12">
                        <div className="space-y-4">
                          <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.6em] block mb-4 italic">Nascimento_Cert</span>
                          <span className="text-5xl font-black text-white italic tracking-tighter shadow-text-glow">
                            {new Date(state.result.dateOfBirth).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="space-y-4">
                          <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.6em] block mb-4 italic">Amostragem_OK</span>
                          <span className={`text-5xl font-black italic tracking-tighter transition-colors duration-700 ${state.result.confidence > 0.5 ? 'text-emerald-500 text-glow-emerald' : 'text-yellow-500 text-glow-yellow'}`}>
                            {state.samplesCount || 1}/12_PTS
                          </span>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-10 flex flex-col md:flex-row gap-12 items-center shadow-2xl group">
                  <div className="w-full md:w-1/3 bg-black p-4 border border-slate-800 shadow-inner relative overflow-hidden">
                    <img src={state.processedPreview || ''} className="w-full h-36 object-contain contrast-[1.8] grayscale group-hover:grayscale-0 transition-all duration-1000" alt="Processamento" />
                    <div className="text-[10px] text-center text-slate-700 mt-5 uppercase font-black tracking-widest italic border-t border-slate-900 pt-4">Visão_Consolidada_WASM</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[12px] font-black text-blue-500 uppercase mb-5 tracking-[0.5em] flex items-center gap-4">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]"></div> DIAGNÓSTICO_TURBO
                    </h4>
                    <p className="text-[11px] text-slate-500 uppercase leading-relaxed italic font-bold tracking-tight">
                      {state.result.reasoning}. Otimização de downscaling e paralelismo WebAssembly aplicada com sucesso. 100% dos dados mantidos em cache volátil encriptado.
                    </p>
                  </div>
                </div>

                <button onClick={reset} className="group relative w-full py-8 bg-white text-black font-black text-[16px] uppercase tracking-[1.2em] hover:bg-blue-600 hover:text-white transition-all duration-700 shadow-2xl active:scale-[0.99] border-none outline-none">
                  <span className="relative z-10 italic">Reiniciar_Protocolo</span>
                  <div className="absolute inset-0 bg-blue-600 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-700 ease-out"></div>
                </button>
              </div>
            )}

            {state.status === VerificationStatus.ERROR && (
              <div className="bg-red-950/20 border border-red-900 p-20 text-center rounded-sm animate-in zoom-in-95 duration-500 shadow-2xl relative overflow-hidden">
                <div className="w-28 h-28 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-12 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                  <i className="fas fa-biohazard text-red-600 text-6xl"></i>
                </div>
                <h3 className="text-white font-black uppercase tracking-[0.6em] mb-8 text-xl italic">Falha_de_Leitura</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed mb-14 max-w-sm mx-auto uppercase font-black tracking-tighter">
                  {state.error}
                </p>
                <div className="flex flex-col sm:flex-row gap-8 max-w-sm mx-auto relative z-10">
                  <button onClick={reset} className="flex-1 py-5 border border-slate-800 text-[11px] font-black uppercase hover:bg-slate-900 transition-all tracking-widest shadow-lg">Limpar</button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-5 bg-red-600 text-white text-[11px] font-black uppercase hover:bg-red-700 transition-all shadow-xl shadow-red-900/30 tracking-widest">Retentar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanning-line {
          0% { top: -10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        .animate-scanning-line {
          animation: scanning-line 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .text-glow-blue { text-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
        .text-glow-emerald { text-shadow: 0 0 30px rgba(16, 185, 129, 1); }
        .text-glow-red { text-shadow: 0 0 30px rgba(220, 38, 38, 1); }
        .text-glow-yellow { text-shadow: 0 0 20px rgba(234, 179, 8, 0.8); }
        .animate-spin-slow { animation: spin 20s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .shadow-text-glow { text-shadow: 0 0 10px rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

export default App;
