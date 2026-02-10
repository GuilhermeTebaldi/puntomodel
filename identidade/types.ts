
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
  currentAge: number;
  isOver18: boolean;
  documentCountry: string;
  confidence: number;
}

export interface VerificationState {
  status: VerificationStatus;
  result: VerificationResult | null;
  error: string | null;
  imagePreview: string | null;
}
