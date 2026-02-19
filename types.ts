export interface Philosopher {
  id: string;
  name: string;
  avatar: string; // URL to image
  quote: string;
  archetype: string; // e.g. "The Stoic", "The Nihilist"
  bio: string;
  style: string; // Prompt engineering context
  voiceName: string; // 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'
}

export enum SenderType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  PHILOSOPHER = 'PHILOSOPHER',
  DELIBERATION = 'DELIBERATION' // New type for the container of the debate
}

export interface ChatMessage {
  id: string;
  senderId: string; 
  senderName: string;
  text: string;
  timestamp: number;
  type: SenderType;
  
  // New fields for Deliberation
  isDeliberation?: boolean;
  innerMessages?: ChatMessage[]; // The debate steps happen inside here
  status?: 'thinking' | 'debating' | 'summarizing' | 'completed';
  
  // Styling flags
  isVerdict?: boolean; 
  isSummary?: boolean; // Kept for legacy compatibility, though we merge visually now
  summary?: string; // The text of the debate summary
  
  // Audio Data (Base64 PCM)
  audioData?: string;
  isAudioLoading?: boolean;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING', // Simplified state
  FINISHED = 'FINISHED',
  ERROR = 'ERROR'
}

export interface DebateContext {
  topic: string;
  opinions: Record<string, string>; 
}