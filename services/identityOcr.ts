type OCRSample = {
  date: string;
  confidence: number;
  text: string;
  image: string;
};

export type IdentityScanResult = {
  text: string;
  birthDate: string | null;
  documentNumber: string | null;
  confidence: number;
  processedImage?: string;
  samplesFound?: number;
};

const loadTesseract = () =>
  new Promise<any>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('tesseract_unavailable'));
      return;
    }
    const existing = (window as any).Tesseract;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => resolve((window as any).Tesseract);
    script.onerror = () => reject(new Error('tesseract_load_failed'));
    document.head.appendChild(script);
  });

const getMostFrequent = <T,>(arr: T[]): T | null => {
  if (!arr.length) return null;
  const counts = arr.reduce((acc, value) => {
    const key = String(value);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  let bestKey = '';
  let bestCount = 0;
  Object.entries(counts).forEach(([key, count]) => {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  });
  return arr.find((value) => String(value) === bestKey) ?? null;
};

const filters = {
  resize: (img: HTMLImageElement, maxDim = 1200) => {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;
    if (width > height) {
      if (width > maxDim) {
        height *= maxDim / width;
        width = maxDim;
      }
    } else if (height > maxDim) {
      width *= maxDim / height;
      height = maxDim;
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
      const avg = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      const v = avg > threshold ? Math.min(255, avg * 1.5) : avg * 0.5;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
  },
  rotate: (canvas: HTMLCanvasElement, degrees: number) => {
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
  },
};

const extractDateUltraRobust = (text: string) => {
  const clean = text.replace(/[^0-9\/.\-\s]/g, ' ');
  const mrzMatches = text.match(/([0-9]{6})[0-9][M|F|X]([0-9]{6})/);
  if (mrzMatches) {
    const raw = mrzMatches[1];
    const yr = parseInt(raw.substring(0, 2), 10);
    const year = `${yr > new Date().getFullYear() % 100 ? '19' : '20'}${raw.substring(0, 2)}`;
    return `${year}-${raw.substring(2, 4)}-${raw.substring(4, 6)}`;
  }
  const dateRegex = /(\d{2})\s*[\/\-. ]\s*(\d{2})\s*[\/\-. ]\s*(\d{4})/g;
  const matches = [...clean.matchAll(dateRegex)];
  const validDates = matches
    .map((match) => {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 1920 && year < new Date().getFullYear() - 5) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return null;
    })
    .filter(Boolean) as string[];
  return validDates.length ? validDates.sort()[0] : null;
};

const extractDocumentNumber = (text: string, birthDate?: string | null) => {
  const upper = text.toUpperCase();
  const cpfMatch = upper.match(/\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/);
  if (cpfMatch) return cpfMatch[0].replace(/\s/g, '');
  const passportMatch = upper.match(/\b[A-Z]{1,2}\d{6,8}\b/);
  if (passportMatch) return passportMatch[0];
  const rgMatch = upper.match(/\b\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[-\s]?[0-9X]\b/);
  if (rgMatch) return rgMatch[0].replace(/\s/g, '');
  const birthDigits = birthDate ? birthDate.replace(/-/g, '') : '';
  const birthDigitsBr = birthDate ? `${birthDate.slice(8, 10)}${birthDate.slice(5, 7)}${birthDate.slice(0, 4)}` : '';
  const candidates = upper
    .replace(/[^0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((value) => value.length >= 7 && value.length <= 12)
    .filter((value) => value !== birthDigits && value !== birthDigitsBr);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.length - a.length)[0];
};

export const scanIdentityDocument = async (
  imagePath: string,
  onProgress: (step: string) => void
): Promise<IdentityScanResult> => {
  const Tesseract = await loadTesseract();
  const scheduler = Tesseract.createScheduler();
  const cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
  const numWorkers = Math.min(cores, 4);
  onProgress(`INICIALIZANDO_${numWorkers}_CORES`);

  for (let i = 0; i < numWorkers; i += 1) {
    const worker = await Tesseract.createWorker('por');
    scheduler.addWorker(worker);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const optimizedCanvas = filters.resize(img, 1200);
      const angles = [0, 90, 180, 270];
      const passes = [0, 1, 2];
      const variants: { image: string; angle: number; pass: number }[] = [];

      onProgress('PREPARANDO_AMOSTRAS');
      for (const angle of angles) {
        for (const pass of passes) {
          const canvasVariant = filters.rotate(optimizedCanvas, angle);
          const ctxVariant = canvasVariant.getContext('2d')!;
          filters.enhance(ctxVariant, canvasVariant.width, canvasVariant.height, pass);
          variants.push({
            image: canvasVariant.toDataURL('image/jpeg', 0.7),
            angle,
            pass,
          });
        }
      }

      onProgress('PROCESSANDO_THREADS_PARALELOS');
      const results = await Promise.all(
        variants.map(async (variant, index) => {
          try {
            const res = await scheduler.addJob('recognize', variant.image);
            const text = res.data.text.toUpperCase();
            const date = extractDateUltraRobust(text);
            if (date) {
              onProgress(`AMOSTRA_${index + 1}_OK`);
              return { date, confidence: res.data.confidence, text, image: variant.image };
            }
          } catch {
            // ignore
          }
          return null;
        })
      );

      await scheduler.terminate();
      const validResults = results.filter((item) => item !== null) as OCRSample[];
      if (!validResults.length) {
        resolve({ text: '', birthDate: null, documentNumber: null, confidence: 0 });
        return;
      }

      const allDates = validResults.map((sample) => sample.date);
      const consensusDate = getMostFrequent(allDates);
      const bestSample = validResults
        .filter((sample) => sample.date === consensusDate)
        .sort((a, b) => b.confidence - a.confidence)[0];

      onProgress('CONSENSO_ESTABELECIDO');
      const documentNumber = extractDocumentNumber(bestSample.text, bestSample.date);

      resolve({
        text: bestSample.text,
        birthDate: bestSample.date,
        documentNumber,
        confidence: bestSample.confidence,
        processedImage: bestSample.image,
        samplesFound: validResults.length,
      });
    };
    img.src = imagePath;
  });
};
