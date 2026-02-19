import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Philosopher, ChatMessage, SenderType } from "../types";

// Text models
const TEXT_MODEL_NAME = "gemini-flash-lite-latest";
// TTS model
const AUDIO_MODEL_NAME = "gemini-2.5-flash-preview-tts";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing from environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * PHASE 1: Get initial opinion from a single philosopher.
 */
export const getInitialOpinion = async (
  philosopher: Philosopher,
  topic: string,
  historyContext?: string,
  isDirectlyAddressed: boolean = false
): Promise<ChatMessage> => {
  const ai = getAIClient();

  const prompt = `
    Context: You are participating in a philosophical debate via a web interface.
    ${historyContext ? `Previous Discussion Summary: "${historyContext}"` : ''}
    
    Current Topic/Question: "${topic}"
    
    System Instruction: ${philosopher.style}
    ${isDirectlyAddressed ? "IMPORTANT: The user has specifically addressed YOU. Acknowledge this direct request. Be more personal." : ""}
    
    Task: Provide your opinion on the current topic. 
    Constraint: Keep it under 50 words. Be distinct and true to your character.
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
    });

    return {
      id: crypto.randomUUID(),
      senderId: philosopher.id,
      senderName: philosopher.name,
      text: response.text?.trim() || "I am currently lost in thought...",
      timestamp: Date.now(),
      type: SenderType.PHILOSOPHER,
    };
  } catch (error) {
    console.error(`Error getting opinion from ${philosopher.name}:`, error);
    return {
      id: crypto.randomUUID(),
      senderId: philosopher.id,
      senderName: philosopher.name,
      text: "I cannot formulate my thoughts at this moment.",
      timestamp: Date.now(),
      type: SenderType.PHILOSOPHER,
    };
  }
};

/**
 * PHASE 2: Generate a debate script where philosophers respond to each other.
 */
export const generateDebateRound = async (
  initialOpinions: ChatMessage[],
  currentPhilosophers: Philosopher[]
): Promise<ChatMessage[]> => {
  const ai = getAIClient();

  // Construct context of what has been said so far
  const transcript = initialOpinions
    .map((msg) => `${msg.senderName}: "${msg.text}"`)
    .join("\n");

  const prompt = `
    You are the scribe of the Agora. 
    
    The following philosophers have given their initial opinions on a topic:
    ${transcript}
    
    Task: Generate a short, intense debate round (2-3 exchanges).
    The philosophers should read each other's opinions and critique/support them based on their own distinct philosophies.
    
    Format your response as a JSON array of objects with 'speaker' (name) and 'text' (content).
    Example: [{"speaker": "Socrates", "text": "But Nietzsche, does power truly equal virtue?"}, ...]
    
    Constraint: Keep each response concise (under 40 words). Ensure at least 3 different philosophers speak in this round.
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ["speaker", "text"],
          },
        },
      },
    });

    const jsonResponse = JSON.parse(response.text || "[]");
    
    // Map back to ChatMessage format
    const debateMessages: ChatMessage[] = jsonResponse.map((entry: any) => {
        const philosopher = currentPhilosophers.find(p => p.name === entry.speaker);
        const pid = philosopher ? philosopher.id : 'unknown';
        
        return {
            id: crypto.randomUUID(),
            senderId: pid,
            senderName: entry.speaker,
            text: entry.text,
            timestamp: Date.now(),
            type: SenderType.PHILOSOPHER
        }
    });

    return debateMessages;

  } catch (error) {
    console.error("Error generating debate round:", error);
    return [];
  }
};

/**
 * PHASE 3a: Generate a neutral summary of the debate string.
 */
export const generateDebateSummary = async (
  topic: string,
  fullHistory: ChatMessage[]
): Promise<string> => {
  const ai = getAIClient();

  const transcript = fullHistory
    .filter(m => m.type === SenderType.PHILOSOPHER)
    .map((msg) => `${msg.senderName}: "${msg.text}"`)
    .join("\n");

  const prompt = `
    Context: A philosophical debate on "${topic}" has just concluded.
    Transcript:
    ${transcript}
    
    Task: Provide a VERY concise, neutral summary of the core conflict.
    Constraint: Maximum 2 sentences. No fluff.
    
    Output: Plain text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
    });

    return response.text?.trim() || "The philosophers debated the nature of the issue.";
  } catch (error) {
     console.error("Error generating debate summary:", error);
     return "The discussion was complex and varied.";
  }
}

/**
 * PHASE 3b: Select a speaker and give the final verdict/advice.
 */
export const generateVerdict = async (
  topic: string,
  summary: string,
  currentPhilosophers: Philosopher[],
  forcedSpeakerId?: string | null
): Promise<ChatMessage> => {
  const ai = getAIClient();

  let forcedName = null;
  if (forcedSpeakerId) {
      const p = currentPhilosophers.find(ph => ph.id === forcedSpeakerId);
      if (p) forcedName = p.name;
  }

  const prompt = `
    Context: A debate on "${topic}" has concluded.
    Summary of arguments: "${summary}"
    
    Task: 
    1. ${forcedName ? `You MUST act as ${forcedName}.` : "Randomly select one of the participating philosophers to have the final word."}
    2. Read the summary of the debate.
    3. Provide a final, wise VERDICT and ADVICE to the user regarding their original query: "${topic}".
    
    Constraints: 
    - Keep the verdict CONCISE (Maximum 50 words / 3 sentences). 
    - This will be spoken aloud, so avoid complex lists.
    - The tone should be authoritative, helpful, and conclusive.
    
    Output Format: JSON object with 'speaker' and 'text'.
  `;

  try {
     const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                speaker: { type: Type.STRING },
                text: { type: Type.STRING }
            }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    const philosopher = currentPhilosophers.find(p => p.name === data.speaker);

    return {
        id: crypto.randomUUID(),
        senderId: philosopher ? philosopher.id : 'unknown',
        senderName: data.speaker || "The Moderator",
        text: data.text || "The debate has concluded, but silence is the only answer.",
        timestamp: Date.now(),
        type: SenderType.PHILOSOPHER,
        isVerdict: true,
        summary: summary // Embed the summary here
    };

  } catch (error) {
    console.error("Error generating verdict:", error);
    return {
        id: crypto.randomUUID(),
        senderId: 'system',
        senderName: 'System',
        text: "The debate ended abruptly. The wisdom was lost.",
        timestamp: Date.now(),
        type: SenderType.SYSTEM
    }
  }
};

/**
 * GENERATE AUDIO (TTS)
 */
export const generatePhilosopherSpeech = async (
  text: string,
  voiceName: string
): Promise<string | undefined> => {
  const ai = getAIClient();
  
  // Clean text of markdown stars for better speech
  const cleanText = text.replace(/[\*#]/g, '').trim();

  try {
    const response = await ai.models.generateContent({
      model: AUDIO_MODEL_NAME,
      contents: {
        parts: [{ text: cleanText }]
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' },
          },
        },
      },
    });

    // Extract base64 audio
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    return undefined;
  }
}

/**
 * GENERATE NEW PERSONA
 */
export const generatePhilosopherPersona = async (
    name: string,
    userContext?: string
): Promise<Philosopher> => {
    const ai = getAIClient();

    const prompt = `
      Task: Create a detailed persona for a philosopher or thinker named "${name}".
      ${userContext ? `Context provided by user: "${userContext}"` : ''}

      Return a JSON object matching this structure:
      {
        "name": "Corrected Name",
        "quote": "A famous or representative quote (max 15 words)",
        "archetype": "A 1-2 word archetype describing their role (e.g. 'The Mystic', 'The Realist')",
        "bio": "A very short biography (max 20 words)",
        "style": "Instructions for an AI on how to roleplay this person. Include tone, vocabulary, and philosophical focus. (max 40 words)",
        "gender": "male" or "female" (for voice selection)
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        quote: { type: Type.STRING },
                        archetype: { type: Type.STRING },
                        bio: { type: Type.STRING },
                        style: { type: Type.STRING },
                        gender: { type: Type.STRING }
                    },
                    required: ["name", "quote", "archetype", "bio", "style", "gender"]
                }
            }
        });

        const data = JSON.parse(response.text || "{}");
        if (!data.name) throw new Error("Failed to generate persona data");

        // Assign a voice based on gender
        const voiceName = data.gender?.toLowerCase() === 'female' ? 'Kore' : 'Puck';

        return {
            id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            name: data.name,
            avatar: `https://picsum.photos/seed/${data.name.replace(/\s/g,'')}/200/200`,
            quote: data.quote,
            archetype: data.archetype || "The Thinker",
            bio: data.bio,
            style: data.style,
            voiceName: voiceName
        };
    } catch (error) {
        console.error("Error generating persona:", error);
        throw error;
    }
}