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
  documentType?: 'passport' | 'id' | 'unknown';
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

const normalizeDateParts = (day: number, month: number, year: number) => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1920 || year > new Date().getFullYear()) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const extractDateCandidates = (text: string) => {
  const clean = text.replace(/[^0-9\/.\-\s]/g, ' ');
  const dateRegex = /(\d{2})\s*[\/\-. ]\s*(\d{2})\s*[\/\-. ]\s*(\d{4})/g;
  const matches = [...clean.matchAll(dateRegex)];
  return matches
    .map((match) => normalizeDateParts(Number(match[1]), Number(match[2]), Number(match[3])))
    .filter(Boolean) as string[];
};

const extractDateNearLabel = (text: string) => {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const labelRegex = /(NASCIMENTO|DATA\s*DE\s*NASCIMENTO|DATA\s*NASC|DT\s*NASC|NASC\b|DOB|BIRTH|NACIMIENTO|NAISSANCE)/;
  for (let i = 0; i < lines.length; i += 1) {
    if (!labelRegex.test(lines[i])) continue;
    const fromLine = extractDateCandidates(lines[i]);
    if (fromLine.length) return fromLine[0];
    const nextLine = lines[i + 1];
    if (nextLine) {
      const fromNext = extractDateCandidates(nextLine);
      if (fromNext.length) return fromNext[0];
    }
  }
  return null;
};

const selectBestBirthDate = (dates: string[]) => {
  if (!dates.length) return null;
  const today = new Date();
  const withAge = dates.map((iso) => {
    const [year, month, day] = iso.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return { iso, age };
  });
  const plausible = withAge.filter(({ age }) => age >= 18 && age <= 90);
  if (!plausible.length) return null;
  return plausible.map((item) => item.iso).sort()[0];
};

const extractBirthDate = (text: string) => {
  const labeled = extractDateNearLabel(text);
  if (labeled) return labeled;
  const dates = extractDateCandidates(text);
  return selectBestBirthDate(dates);
};

const isPassportLike = (text: string) => /PASSAPORTE|PASSPORT|P</.test(text);

const extractDocumentNumber = (text: string, birthDate?: string | null) => {
  const upper = text.toUpperCase();
  const lines = upper.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const cpfMatch = upper.match(/\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/);
  if (cpfMatch) return cpfMatch[0].replace(/\s/g, '');

  const rgRegex = /\b\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[-\s]?[0-9X]\b/;
  const cnhRegex = /\b\d{11}\b/;
  const rgLabelRegex = /(RG|REGISTRO\s*GERAL)/;
  const cnhLabelRegex = /(CNH|REGISTRO|HABILITACAO|HABILITAÇÃO)/;

  for (let i = 0; i < lines.length; i += 1) {
    if (rgLabelRegex.test(lines[i])) {
      const match = lines[i].match(rgRegex) || lines[i + 1]?.match(rgRegex);
      if (match) return match[0].replace(/\s/g, '');
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (cnhLabelRegex.test(lines[i])) {
      const match = lines[i].match(cnhRegex) || lines[i + 1]?.match(cnhRegex);
      if (match) return match[0];
    }
  }

  const rgMatch = upper.match(rgRegex);
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
            const date = extractBirthDate(text);
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
        resolve({ text: '', birthDate: null, documentNumber: null, confidence: 0, documentType: 'unknown' });
        return;
      }

      const allDates = validResults.map((sample) => sample.date);
      const consensusDate = getMostFrequent(allDates);
      const bestSample = validResults
        .filter((sample) => sample.date === consensusDate)
        .sort((a, b) => b.confidence - a.confidence)[0];

      onProgress('CONSENSO_ESTABELECIDO');
      const documentNumber = extractDocumentNumber(bestSample.text, bestSample.date);
      const documentType = isPassportLike(bestSample.text) ? 'passport' : 'id';

      resolve({
        text: bestSample.text,
        birthDate: bestSample.date,
        documentNumber,
        confidence: bestSample.confidence,
        processedImage: bestSample.image,
        samplesFound: validResults.length,
        documentType,
      });
    };
    img.src = imagePath;
  });
};
