import React, { useState, useRef } from 'react';
import { ChatMessage, SenderType, Philosopher } from '../types';
import { DeliberationBubble } from './DeliberationBubble';

interface ChatBubbleProps {
  message: ChatMessage;
  philosophers: Philosopher[];
}

// --- Audio Helper Functions from System Instructions ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Components ---

// Simple Markdown Formatter Component
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Split by double newlines to handle paragraphs
  const paragraphs = text.split(/\n\s*\n/);

  return (
    <>
      {paragraphs.map((paragraph, pIndex) => {
        // Split by bold (**...**) and italic (*...*) markers
        // The regex captures delimiters so we can process them in the map
        const parts = paragraph.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        
        return (
          <p key={pIndex} className="mb-3 last:mb-0 min-h-[1.5em]">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={i} className="italic opacity-90">{part.slice(1, -1)}</em>;
              }
              return part;
            })}
          </p>
        );
      })}
    </>
  );
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, philosophers }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 1. Handle Deliberation Logic Blocks (The "Chain of Thought")
  if (message.type === SenderType.DELIBERATION) {
    return <DeliberationBubble message={message} philosophers={philosophers} />;
  }

  // 2. Handle System Messages
  if (message.isSummary) {
    return null; // Hidden because it's merged into the Verdict now
  }

  const isSystem = message.type === SenderType.SYSTEM;
  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-6 animate-fade-in px-8 opacity-60">
        <div className="h-px bg-slate-800 flex-grow max-w-[50px]"></div>
        <span className="px-4 text-[10px] md:text-xs text-slate-500 font-serif tracking-[0.2em] uppercase text-center">
          {message.text}
        </span>
        <div className="h-px bg-slate-800 flex-grow max-w-[50px]"></div>
      </div>
    );
  }

  // 3. Handle Standard Chat Messages (User or Final Answer)
  const isUser = message.type === SenderType.USER;
  const philosopher = philosophers.find(p => p.id === message.senderId);
  
  const avatarUrl = philosopher 
    ? philosopher.avatar 
    : `https://picsum.photos/seed/${message.senderName.replace(/\s/g,'')}/50/50`;

  const handlePlayAudio = async () => {
     if (!message.audioData || isPlaying) return;
     
     try {
       setIsPlaying(true);
       const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
       const outputNode = outputAudioContext.createGain();
       
       const audioBytes = decode(message.audioData);
       const audioBuffer = await decodeAudioData(
         audioBytes,
         outputAudioContext,
         24000,
         1
       );
       
       const source = outputAudioContext.createBufferSource();
       source.buffer = audioBuffer;
       source.connect(outputAudioContext.destination);
       
       source.onended = () => {
          setIsPlaying(false);
          outputAudioContext.close();
       };
       
       source.start();
       
     } catch (e) {
       console.error("Audio playback error:", e);
       setIsPlaying(false);
     }
  };

  // --- THE MERGED VERDICT UI ---
  if (message.isVerdict) {
    // Show button if we have data OR if we are loading it
    const showAudioButton = message.audioData || message.isAudioLoading;

    return (
      <div className="flex w-full mb-12 justify-center animate-slide-up px-2 md:px-0">
        <div className="relative w-full max-w-3xl">
          {/* Decorative Background Glow */}
          <div className="absolute -inset-4 bg-gold-accent/5 rounded-3xl blur-xl"></div>
          
          <div className="relative bg-[#0d121f] border border-gold-dim/40 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.08)]">
             
             {/* Header */}
             <div className="bg-[#151b2d] px-6 py-3 border-b border-gold-dim/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full border-2 border-gold-accent p-0.5">
                      <img src={avatarUrl} className="w-full h-full rounded-full object-cover" />
                   </div>
                   <div>
                      <h4 className="text-gold-accent font-serif font-bold text-sm tracking-wide">The Verdict</h4>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest">{message.senderName} Speaks</div>
                   </div>
                </div>
                
                {showAudioButton && (
                    <button 
                      onClick={handlePlayAudio}
                      disabled={isPlaying || message.isAudioLoading}
                      className={`
                        flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all
                        ${isPlaying 
                          ? 'bg-gold-accent/20 text-gold-accent border border-gold-accent/50 animate-pulse' 
                          : message.isAudioLoading
                            ? 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-wait'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-gold-accent hover:text-midnight hover:border-gold-accent'}
                      `}
                    >
                      {isPlaying ? (
                          <>
                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                            Speaking...
                          </>
                      ) : message.isAudioLoading ? (
                          <>
                             <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             Preparing Voice...
                          </>
                      ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                            Listen
                          </>
                      )}
                    </button>
                )}
             </div>

             {/* Combined Body */}
             <div className="p-6 md:p-8 space-y-6">
                
                {/* SECTION 1: The Summary (Inner Box) */}
                {message.summary && (
                  <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 mb-4">
                     <div className="flex items-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Council Findings</span>
                     </div>
                     <div className="text-sm text-slate-400 font-serif italic leading-relaxed">
                        {message.summary}
                     </div>
                  </div>
                )}

                {/* SECTION 2: The Verdict (Main Text) */}
                <div className="font-body text-base md:text-lg leading-loose text-slate-200">
                   <span className="text-3xl float-left mr-2 mt-[-6px] text-gold-dim font-serif">"</span>
                   <FormattedText text={message.text} />
                   <div className="clear-both"></div>
                   <span className="text-3xl text-gold-dim font-serif float-right mt-[-20px]">"</span>
                </div>
             </div>

             {/* Footer Action */}
             <div className="bg-gold-dim/5 px-6 py-2 border-t border-gold-dim/10 flex justify-end">
                <button className="text-[10px] text-gold-dim hover:text-gold-accent font-mono uppercase tracking-wider flex items-center gap-1 transition-colors">
                  Continue the dialogue <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard Chat Message
  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up group px-2 md:px-0`}>
      <div className={`flex max-w-[95%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3 md:gap-4`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 md:w-12 md:h-12 rounded-full overflow-hidden shadow-xl mt-1 border-2
          ${isUser ? 'border-indigo-500/30' : 'border-gold-accent shadow-gold-accent/10'}
        `}>
           <img src={isUser ? 'https://picsum.photos/seed/user/50/50' : avatarUrl} alt={message.senderName} className="w-full h-full object-cover" />
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 mb-1.5 ml-1">
             <span className={`text-xs md:text-sm font-bold tracking-wide ${isUser ? 'text-indigo-300' : 'text-gold-accent'}`}>
               {message.senderName}
             </span>
             {!isUser && philosopher && (
               <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 uppercase tracking-wider">
                 {philosopher.archetype}
               </span>
             )}
          </div>
          
          <div 
            className={`
              relative px-5 py-4 rounded-2xl text-sm md:text-[15px] leading-relaxed shadow-2xl font-body
              ${isUser 
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none' 
                : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-slate-200 rounded-tl-none'}
            `}
          >
            <FormattedText text={message.text} />
          </div>
        </div>
      </div>
    </div>
  );
};