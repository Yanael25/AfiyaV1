import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const getFinancialAdvice = async (balance: number, transactions: any[], profile: any) => {
  try {
    const prompt = `
      En tant qu'expert financier pour l'application Afiya (une plateforme de tontines et d'épargne en Afrique de l'Ouest), donne un conseil court et pertinent à l'utilisateur suivant :
      - Nom : ${profile?.full_name}
      - Solde actuel : ${balance} FCFA
      - Tier : ${profile?.tier}
      - Score Afiya : ${profile?.score_afiya}/100
      - Dernières transactions : ${JSON.stringify(transactions.slice(0, 5))}

      Le conseil doit être en français, encourageant, et lié à l'épargne ou à la participation aux tontines (Cercles).
      Réponds en une ou deux phrases maximum.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Continuez à épargner pour réaliser vos projets !";
  } catch (error) {
    console.error("Error getting financial advice:", error);
    return "Épargnez régulièrement pour renforcer votre score Afiya.";
  }
};
