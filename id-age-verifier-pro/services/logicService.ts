
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
