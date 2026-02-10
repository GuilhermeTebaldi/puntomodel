
export enum VerificationStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface VerificationResult {
  fullName: string;
  documentType: 'Passaporte' | 'RG' | 'CNH' | 'Desconhecido';
  dateOfBirth: string;
  rawDateOfBirthFound: string; // O que o OCR leu originalmente
  currentAge: number;
  isOver18: boolean;
  documentCountry: string;
  documentNumber: string;
  expiryDate: string;
  isValid: boolean;
  confidence: number;
  reasoning: string; // Explicação de como a idade foi calculada
}

export interface VerificationState {
  status: VerificationStatus;
  result: VerificationResult | null;
  error: string | null;
  imagePreview: string | null;
}
