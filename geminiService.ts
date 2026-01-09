
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SongAnalysis, StoryboardScene, AspectRatio, VisualStyle } from "./types";

// Usamos import.meta.env porque es lo que Vite requiere
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY }); 
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error?.message?.includes('429') || error?.status === 429;
      if (isQuotaError) {
        const waitTime = Math.pow(2, i + 1) * 1000;
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const analyzeSong = async (title: string, lyrics: string): Promise<SongAnalysis> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza profundamente esta canción titulada "${title}". 
      Letra: ${lyrics}
      
      Genera un objeto JSON que incluya:
      1. genre (string): Género predominante.
      2. bpm (number): Estimación de ritmo.
      3. synopsis (string): Resumen narrativo y emocional de la canción.
      4. characterDesign (string): Descripción física detallada y constante del protagonista.
      5. visualConsistencyGuide (string): Reglas sobre la iluminación, paleta de colores y atmósfera.
      6. suggestedStyles (array): 4 estilos visuales únicos basados en la letra.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            genre: { type: Type.STRING },
            bpm: { type: Type.NUMBER },
            synopsis: { type: Type.STRING },
            characterDesign: { type: Type.STRING },
            visualConsistencyGuide: { type: Type.STRING },
            suggestedStyles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING }
                },
                required: ["name", "description", "imagePrompt"]
              }
            }
          },
          required: ["genre", "bpm", "synopsis", "characterDesign", "visualConsistencyGuide", "suggestedStyles"]
        }
      }
    });

    const analysis = JSON.parse(response.text);
    analysis.suggestedStyles = analysis.suggestedStyles.map((s: any, i: number) => ({ ...s, id: `style-${Date.now()}-${i}` }));
    return analysis as SongAnalysis;
  });
};

export const generateMoreStyles = async (title: string, lyrics: string, existingStyles: string[]): Promise<VisualStyle[]> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Basado en la canción "${title}" (${lyrics}), genera 4 estilos visuales ADICIONALES y DIFERENTES a estos: ${existingStyles.join(", ")}.
      Proporciona un array de objetos JSON con name, description e imagePrompt.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            styles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING }
                },
                required: ["name", "description", "imagePrompt"]
              }
            }
          },
          required: ["styles"]
        }
      }
    });

    const data = JSON.parse(response.text);
    return data.styles.map((s: any, i: number) => ({ ...s, id: `style-more-${Date.now()}-${i}` }));
  });
};

export const generateImage = async (prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: aspectRatio as any } }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data");
  });
};

export const generateStoryboardPlan = async (
  title: string, 
  lyrics: string, 
  duration: number, 
  style: VisualStyle,
  analysis: SongAnalysis,
  extraPrompt?: string
): Promise<StoryboardScene[]> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crea un plan de storyboard narrativo que cuente una HISTORIA COMPLETA de principio a fin para "${title}" (${duration}s).
      
      DATOS DE CONSISTENCIA:
      - PERSONAJE PRINCIPAL: ${analysis.characterDesign}
      - GUÍA VISUAL Y ATMÓSFERA: ${analysis.visualConsistencyGuide}
      - ESTILO ARTÍSTICO: ${style.name} - ${style.description}

      INSTRUCCIONES:
      - Cubre el 100% de la canción.
      - Entre 12 y 24 escenas.
      - Cada visualPrompt DEBE incluir: [Tipo de plano cinematográfico], [Acción detallada del personaje], [Entorno], [Iluminación/Estilo].`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  timestamp: { type: Type.STRING },
                  lyrics: { type: Type.STRING },
                  visualPrompt: { type: Type.STRING },
                  videoPrompt: { type: Type.STRING }
                },
                required: ["id", "timestamp", "lyrics", "visualPrompt", "videoPrompt"]
              }
            }
          },
          required: ["scenes"]
        }
      }
    });
    return JSON.parse(response.text).scenes;
  });
};
