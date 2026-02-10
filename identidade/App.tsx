
import React, { useState, useCallback, useRef } from 'react';
import { VerificationStatus, VerificationState, VerificationResult } from './types';
import { analyzeDocument } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<VerificationState>({
    status: VerificationStatus.IDLE,
    result: null,
    error: null,
    imagePreview: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setState(prev => ({ 
        ...prev, 
        imagePreview: base64, 
        status: VerificationStatus.SCANNING,
        error: null,
        result: null
      }));
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string) => {
    try {
      const result = await analyzeDocument(base64);
      setState(prev => ({
        ...prev,
        status: VerificationStatus.SUCCESS,
        result: result,
      }));
    } catch (err) {
      console.error(err);
      setState(prev => ({
        ...prev,
        status: VerificationStatus.ERROR,
        error: "Falha ao analisar documento. Verifique a nitidez da imagem.",
      }));
    }
  };

  const reset = () => {
    setState({
      status: VerificationStatus.IDLE,
      result: null,
      error: null,
      imagePreview: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-slate-900 text-white font-sans">
      <header className="mb-12 text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
          <i className="fas fa-id-card text-3xl"></i>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Verificador de Idade Pro
        </h1>
        <p className="text-slate-400 text-lg">
          Sistema automático de verificação de maioridade. Carregue um Passaporte ou RG para identificar a idade instantaneamente.
        </p>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Lado Esquerdo: Input/Preview */}
        <section className="bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <i className="fas fa-camera text-blue-400"></i>
            Capturar Documento
          </h2>

          <div className="relative group">
            {!state.imagePreview ? (
              <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-slate-600 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-slate-700/50 transition-all duration-300">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <i className="fas fa-cloud-upload-alt text-4xl text-slate-500 mb-4 group-hover:scale-110 transition-transform"></i>
                  <p className="mb-2 text-sm text-slate-300">
                    <span className="font-semibold">Clique para enviar</span> ou arraste
                  </p>
                  <p className="text-xs text-slate-500">Passaporte, RG ou CNH (JPEG, PNG)</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload} 
                />
              </label>
            ) : (
              <div className="relative h-80 w-full overflow-hidden rounded-2xl border-2 border-slate-700">
                <img src={state.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                {state.status === VerificationStatus.SCANNING && (
                  <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                         <i className="fas fa-search text-white animate-pulse"></i>
                      </div>
                    </div>
                  </div>
                )}
                <button 
                  onClick={reset}
                  className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 p-2 rounded-full shadow-lg transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex gap-4">
             <div className="flex-1 p-3 bg-slate-700/50 rounded-xl border border-slate-600 text-xs text-slate-400">
                <i className="fas fa-shield-alt text-emerald-400 mr-2"></i>
                Privacidade Garantida: Dados processados localmente e não armazenados.
             </div>
          </div>
        </section>

        {/* Lado Direito: Resultados */}
        <section className="min-h-[400px]">
          {state.status === VerificationStatus.IDLE && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-3xl p-8 text-center">
              <i className="fas fa-fingerprint text-6xl mb-6 opacity-20"></i>
              <p className="text-lg">Aguardando upload para iniciar análise biométrica...</p>
            </div>
          )}

          {state.status === VerificationStatus.SCANNING && (
            <div className="h-full bg-slate-800 rounded-3xl p-8 border border-blue-500 animate-pulse">
              <div className="h-8 w-48 bg-slate-700 rounded mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 w-full bg-slate-700 rounded"></div>
                <div className="h-4 w-3/4 bg-slate-700 rounded"></div>
                <div className="h-4 w-1/2 bg-slate-700 rounded"></div>
              </div>
              <div className="mt-12 h-20 w-full bg-slate-700 rounded-2xl"></div>
            </div>
          )}

          {state.status === VerificationStatus.ERROR && (
            <div className="h-full bg-red-500/10 rounded-3xl p-8 border border-red-500/50 text-center">
              <i className="fas fa-exclamation-triangle text-red-500 text-5xl mb-6"></i>
              <h3 className="text-2xl font-bold text-red-400 mb-2">Erro na Verificação</h3>
              <p className="text-slate-300 mb-8">{state.error}</p>
              <button onClick={reset} className="px-8 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold transition-all">
                Tentar Novamente
              </button>
            </div>
          )}

          {state.status === VerificationStatus.SUCCESS && state.result && (
            <div className="h-full bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Resultado da Análise</h3>
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${state.result.isOver18 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'}`}></span>
                    <h2 className="text-2xl font-bold">{state.result.isOver18 ? 'Acesso Permitido' : 'Acesso Negado'}</h2>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold ${state.result.isOver18 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {state.result.isOver18 ? '+18' : '-18'}
                </div>
              </div>

              <div className="space-y-6 flex-grow">
                <InfoRow label="Nome Completo" value={state.result.fullName} icon="fa-user" />
                <InfoRow label="Tipo de Documento" value={state.result.documentType} icon="fa-id-card" />
                <InfoRow label="Data de Nascimento" value={new Date(state.result.dateOfBirth).toLocaleDateString('pt-BR')} icon="fa-calendar-alt" />
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Idade Calculada" value={`${state.result.currentAge} anos`} icon="fa-hourglass-half" />
                  <InfoRow label="País Origem" value={state.result.documentCountry} icon="fa-globe" />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-slate-500 font-bold uppercase">Nível de Confiança</span>
                  <span className="text-xs font-bold text-blue-400">{Math.round(state.result.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-1000" 
                    style={{ width: `${state.result.confidence * 100}%` }}
                  ></div>
                </div>
                <button 
                  onClick={reset}
                  className="w-full mt-6 py-4 bg-slate-700 hover:bg-slate-600 rounded-2xl font-bold text-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-redo"></i> Novo Scanner
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-auto py-8 text-slate-500 text-sm flex gap-6">
        <span>© 2024 VerifyPro Systems</span>
        <span className="flex items-center gap-2">
          <i className="fas fa-lock text-emerald-500"></i>
          Segurança Criptografada
        </span>
      </footer>
    </div>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
  icon: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => (
  <div className="group">
    <div className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
      <i className={`fas ${icon} text-slate-600 group-hover:text-blue-400 transition-colors`}></i>
      {label}
    </div>
    <div className="text-lg font-medium text-slate-200">{value || '---'}</div>
  </div>
);

export default App;
