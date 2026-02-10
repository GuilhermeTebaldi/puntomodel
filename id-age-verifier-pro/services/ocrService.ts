
/**
 * Motor de OCR Local "Brute Force" - Edição Gold Master
 * Tenta múltiplas combinações de rotação e filtragem para garantir a leitura offline.
 */

declare const Tesseract: any;

export interface LocalOCRResult {
  text: string;
  birthDate: string | null;
  confidence: number;
  processedImage?: string;
  step?: string;
}

const filters = {
  enhance: (ctx: CanvasRenderingContext2D, w: number, h: number, pass: number) => {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    // Ajuste de threshold dinâmico por passagem para aumentar chances de sucesso
    const thresholds = [125, 100, 150];
    const threshold = thresholds[pass] || 125;
    
    for (let i = 0; i < d.length; i += 4) {
      // Grayscale + High Contrast Adaptativo
      const avg = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
      const v = avg > threshold ? Math.min(255, avg * 1.4) : avg * 0.6;
      d[i] = d[i+1] = d[i+2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
  },
  rotate: (canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement => {
    const newCanvas = document.createElement('canvas');
    const ctx = newCanvas.getContext('2d')!;
    if (degrees === 90 || degrees === 270) {
      newCanvas.width = canvas.height;
      newCanvas.height = canvas.width;
    } else {
      newCanvas.width = canvas.width;
      newCanvas.height = canvas.height;
    }
    ctx.translate(newCanvas.width / 2, newCanvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    return newCanvas;
  }
};

export const scanDocumentLocally = async (
  imagePath: string, 
  onProgress: (step: string) => void
): Promise<LocalOCRResult> => {
  const worker = await Tesseract.createWorker('por');
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = img.width;
      baseCanvas.height = img.height;
      const baseCtx = baseCanvas.getContext('2d')!;
      baseCtx.drawImage(img, 0, 0);

      const angles = [0, 90, 180, 270];
      const passes = [0, 1, 2]; // Diferentes intensidades de filtro
      let bestDate: string | null = null;
      let bestText = "";
      let bestConf = 0;
      let lastProcessedImg = "";

      // Matriz de tentativas: Ângulo x Passagem de Filtro
      for (const angle of angles) {
        for (const pass of passes) {
          onProgress(`PROCESSANDO: ANGULO_${angle}° | FILTRO_PASS_${pass + 1}`);
          
          let canvasVariant = filters.rotate(baseCanvas, angle);
          const ctxVariant = canvasVariant.getContext('2d')!;
          filters.enhance(ctxVariant, canvasVariant.width, canvasVariant.height, pass);
          
          const dataUrl = canvasVariant.toDataURL('image/jpeg', 0.8);
          lastProcessedImg = dataUrl;

          const res = await worker.recognize(dataUrl);
          const text = res.data.text.toUpperCase();
          const date = extractDateUltraRobust(text);

          if (date) {
            bestDate = date;
            bestText = text;
            bestConf = res.data.confidence;
            onProgress(`SUCESSO: DETECTADO NO ANGULO ${angle}° (PASS ${pass + 1})`);
            await worker.terminate();
            resolve({
              text: bestText,
              birthDate: bestDate,
              confidence: bestConf,
              processedImage: lastProcessedImg
            });
            return;
          }
        }
      }

      await worker.terminate();
      resolve({
        text: bestText,
        birthDate: bestDate,
        confidence: bestConf,
        processedImage: lastProcessedImg
      });
    };
    img.src = imagePath;
  });
};

function extractDateUltraRobust(text: string): string | null {
  // 1. Limpeza mantendo dígitos, espaços e separadores comuns
  const clean = text.replace(/[^0-9\/.\-\s]/g, ' ');
  
  // 2. Tentar MRZ (Passaportes) - Padrão internacional de segurança
  const mrzMatches = text.match(/([0-9]{6})[0-9][M|F|X]([0-9]{6})/);
  if (mrzMatches) {
    const raw = mrzMatches[1];
    const yr = parseInt(raw.substring(0, 2));
    const year = (yr > new Date().getFullYear() % 100 ? "19" : "20") + raw.substring(0, 2);
    return `${year}-${raw.substring(2, 4)}-${raw.substring(4, 6)}`;
  }

  // 3. Regex refinada para espaços extras e separadores variados
  // Detecta: "15 / 02 / 1996", "15.02.1996", "15-02-1996", "15 02 1996"
  const dateRegex = /(\d{2})\s*[\/\-. ]\s*(\d{2})\s*[\/\-. ]\s*(\d{4})/g;
  const matches = [...clean.matchAll(dateRegex)];
  
  const validDates = matches.map(m => {
    const d = parseInt(m[1]), mth = parseInt(m[2]), y = parseInt(m[3]);
    // Validação de sanidade: mês 1-12, dia 1-31, ano entre 1920 e (hoje - 5 anos)
    if (mth >= 1 && mth <= 12 && d >= 1 && d <= 31 && y > 1920 && y < new Date().getFullYear() - 5) {
      return `${y}-${String(mth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }).filter(Boolean) as string[];

  // Retorna a data mais antiga encontrada (presumivelmente a de nascimento em documentos com validade)
  return validDates.length > 0 ? validDates.sort()[0] : null;
}
