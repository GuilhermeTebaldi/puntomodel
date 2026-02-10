
/**
 * Este arquivo contém "CÓDIGO PURO" (TypeScript/JavaScript).
 * Ele não usa IA. Ele apenas recebe textos e números e aplica lógica matemática.
 */

export const calculateAge = (birthDateStr: string): number => {
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const verifyMajority = (age: number): boolean => {
  return age >= 18;
};

export const formatDocumentType = (type: string): string => {
  return type.toUpperCase().trim();
};

/**
 * Retorna o valor mais frequente em um array (Moda).
 * Se houver empate, retorna o primeiro encontrado (o motor de OCR prioriza confiança).
 */
export const getMostFrequent = <T>(arr: T[]): T | null => {
  if (arr.length === 0) return null;
  const mapping = arr.reduce((acc, el) => {
    const key = String(el);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let max = 0;
  let result: string | null = null;
  for (const key in mapping) {
    if (mapping[key] > max) {
      max = mapping[key];
      result = key;
    }
  }
  // Tenta encontrar o objeto original no array caso T não seja string
  return arr.find(el => String(el) === result) || null;
};
