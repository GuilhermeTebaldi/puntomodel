
import { GoogleGenAI, Type } from "@google/genai";
import { VerificationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeDocument = async (base64Image: string): Promise<VerificationResult> => {
  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    Analise esta imagem de um documento de identidade.
    Sua tarefa é extrair as seguintes informações:
    1. Nome completo (fullName)
    2. Tipo de documento (documentType: 'Passaporte', 'RG', 'CNH', 'Desconhecido')
    3. Data de nascimento (dateOfBirth no formato YYYY-MM-DD)
    4. País do documento (documentCountry)
    5. Calcule a idade atual com base na data de hoje: ${new Date().toISOString().split('T')[0]}
    6. Determine se a pessoa tem 18 anos ou mais (isOver18)
    7. Confiança na leitura (confidence: 0-1)

    Responda EXCLUSIVAMENTE em JSON.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          documentType: { type: Type.STRING },
          dateOfBirth: { type: Type.STRING },
          currentAge: { type: Type.NUMBER },
          isOver18: { type: Type.BOOLEAN },
          documentCountry: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ["fullName", "documentType", "dateOfBirth", "currentAge", "isOver18", "documentCountry", "confidence"]
      },
    },
  });

  const resultText = response.text;
  if (!resultText) throw new Error("Não foi possível processar a imagem.");
  
  return JSON.parse(resultText) as VerificationResult;
};
