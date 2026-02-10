
/**
 * Motor de OCR Local "Brute Force" - Edição Gold Master Ultra High-Speed
 * Executa 12 ciclos de leitura em paralelo usando multi-threading (WASM Workers)
 * e aplica consenso estatístico para máxima precisão e velocidade.
 */

import { getMostFrequent } from './logicService';

declare const Tesseract: any;

export interface LocalOCRResult {
  text: string;
  birthDate: string | null;
  confidence: number;
  processedImage?: string;
  step?: string;
  samplesFound?: number;
}

interface OCRSample {
  date: string;
  confidence: number;
  text: string;
  image: string;
}

const filters = {
  // Otimização: Redimensiona para garantir que o OCR não processe pixels desnecessários
  resize: (img: HTMLImageElement, maxDim: number = 1200) => {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;
    if (width > height) {
      if (width > maxDim) {
        height *= maxDim / width;
        width = maxDim;
      }
    } else {
      if (height > maxDim) {
        width *= maxDim / height;
        height = maxDim;
      }
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  },
  enhance: (ctx: CanvasRenderingContext2D, w: number, h: number, pass: number) => {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const thresholds = [128, 100, 160];
    const threshold = thresholds[pass] || 128;
    
    for (let i = 0; i < d.length; i += 4) {
      const avg = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
      const v = avg > threshold ? Math.min(255, avg * 1.5) : avg * 0.5;
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
  const scheduler = Tesseract.createScheduler();
  const numWorkers = Math.min(navigator.hardwareConcurrency || 4, 4);
  onProgress(`INICIALIZANDO_${numWorkers}_CORES`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = await Tesseract.createWorker('por');
    scheduler.addWorker(worker);
  }

  const samples: OCRSample[] = [];
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      // OTIMIZAÇÃO CRÍTICA: Redimensiona antes de gerar variantes
      const optimizedCanvas = filters.resize(img, 1200);
      
      const angles = [0, 90, 180, 270];
      const passes = [0, 1, 2];
      const variants: { image: string, angle: number, pass: number }[] = [];

      onProgress("PREPARANDO_AMOSTRAS_OTIMIZADAS");
      for (const angle of angles) {
        for (const pass of passes) {
          let canvasVariant = filters.rotate(optimizedCanvas, angle);
          const ctxVariant = canvasVariant.getContext('2d')!;
          filters.enhance(ctxVariant, canvasVariant.width, canvasVariant.height, pass);
          variants.push({
            image: canvasVariant.toDataURL('image/jpeg', 0.7),
            angle,
            pass
          });
        }
      }

      onProgress(`PROCESSANDO_THREADS_PARALELOS`);

      const results = await Promise.all(variants.map(async (v, idx) => {
        try {
          const res = await scheduler.addJob('recognize', v.image);
          const text = res.data.text.toUpperCase();
          const date = extractDateUltraRobust(text);
          if (date) {
            onProgress(`AMOSTRA_${idx + 1}/12_CONFIRMADA`);
            return { date, confidence: res.data.confidence, text, image: v.image };
          }
        } catch (e) {
          console.warn("Job Error", e);
        }
        return null;
      }));

      await scheduler.terminate();
      const validResults = results.filter(r => r !== null) as OCRSample[];

      if (validResults.length === 0) {
        resolve({ text: "", birthDate: null, confidence: 0 });
        return;
      }

      const allDates = validResults.map(s => s.date);
      const consensusDate = getMostFrequent(allDates);
      const bestSample = validResults
        .filter(s => s.date === consensusDate)
        .sort((a, b) => b.confidence - a.confidence)[0];

      onProgress(`CONSENSO_ESTABELECIDO`);

      resolve({
        text: bestSample.text,
        birthDate: bestSample.date,
        confidence: bestSample.confidence,
        processedImage: bestSample.image,
        samplesFound: validResults.length
      });
    };
    img.src = imagePath;
  });
};

function extractDateUltraRobust(text: string): string | null {
  const clean = text.replace(/[^0-9\/.\-\s]/g, ' ');
  const mrzMatches = text.match(/([0-9]{6})[0-9][M|F|X]([0-9]{6})/);
  if (mrzMatches) {
    const raw = mrzMatches[1];
    const yr = parseInt(raw.substring(0, 2));
    const year = (yr > new Date().getFullYear() % 100 ? "19" : "20") + raw.substring(0, 2);
    return `${year}-${raw.substring(2, 4)}-${raw.substring(4, 6)}`;
  }

  const dateRegex = /(\d{2})\s*[\/\-. ]\s*(\d{2})\s*[\/\-. ]\s*(\d{4})/g;
  const matches = [...clean.matchAll(dateRegex)];
  const validDates = matches.map(m => {
    const d = parseInt(m[1]), mth = parseInt(m[2]), y = parseInt(m[3]);
    if (mth >= 1 && mth <= 12 && d >= 1 && d <= 31 && y > 1920 && y < new Date().getFullYear() - 5) {
      return `${y}-${String(mth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }).filter(Boolean) as string[];
  return validDates.length > 0 ? validDates.sort()[0] : null;
}
