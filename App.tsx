import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_PHILOSOPHERS, INITIAL_GREETING, SUGGESTED_TOPICS } from './constants';
import { ChatMessage, SenderType, AppState, Philosopher } from './types';
import { PhilosopherCard } from './components/PhilosopherCard';
import { ChatBubble } from './components/ChatBubble';
import { InputArea } from './components/InputArea';
import { SettingsModal } from './components/SettingsModal';
import { getInitialOpinion, generateDebateRound, generateVerdict, generateDebateSummary, generatePhilosopherPersona, generatePhilosopherSpeech } from './services/geminiService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>('');
  
  // NEW: Agency State
  const [selectedPhilosopher, setSelectedPhilosopher] = useState<Philosopher | null>(null);
  
  const [philosophers, setPhilosophers] = useState<Philosopher[]>(INITIAL_PHILOSOPHERS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length, appState]); // Scroll on new messages or state change

  // Helper to append inner messages to the active deliberation block
  const addToDeliberation = (deliberationId: string, newInnerMsg: ChatMessage) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === deliberationId && msg.type === SenderType.DELIBERATION) {
        return {
          ...msg,
          innerMessages: [...(msg.innerMessages || []), newInnerMsg]
        };
      }
      return msg;
    }));
    // Also update speaker highlight
    setCurrentSpeakerId(newInnerMsg.senderId);
    setTimeout(() => setCurrentSpeakerId(null), 2000);
  };

  const markDeliberationComplete = (deliberationId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === deliberationId) {
        return { ...msg, status: 'completed' };
      }
      return msg;
    }));
  };

  const handlePhilosopherClick = (p: Philosopher) => {
    // Only allow selection if we are not currently processing
    if (appState === AppState.IDLE || appState === AppState.FINISHED) {
      setSelectedPhilosopher(p.id === selectedPhilosopher?.id ? null : p);
    }
  };

  const handleUserSubmit = async (text: string) => {
    if (appState === AppState.IDLE) {
      setTopic(text);
    }
    
    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: 'user',
      senderName: 'You',
      text: text,
      timestamp: Date.now(),
      type: SenderType.USER
    };
    
    // 2. Add Deliberation Container
    const deliberationId = crypto.randomUUID();
    const deliberationMsg: ChatMessage = {
      id: deliberationId,
      senderId: 'system',
      senderName: 'Council',
      text: selectedPhilosopher ? `Consulting ${selectedPhilosopher.name}...` : 'Deliberating...',
      timestamp: Date.now(),
      type: SenderType.DELIBERATION,
      status: 'thinking',
      innerMessages: []
    };

    setMessages(prev => [...prev, userMsg, deliberationMsg]);
    setAppState(AppState.PROCESSING);

    // Capture the current target before resetting for next turn, but keep it for logic
    const activeTarget = selectedPhilosopher;
    setSelectedPhilosopher(null); // Clear selection after submission to return to "Council" mode

    try {
      // Create context from previous messages
      const historyContext = messages
        .filter(m => m.type !== SenderType.SYSTEM && m.type !== SenderType.DELIBERATION)
        .slice(-5) 
        .map(m => `${m.senderName}: ${m.text}`)
        .join('\n');

      // PHASE 1: Opinions
      // If we have a target, they go first and get special context
      let opinionMakers = philosophers;
      
      // We process opinions in parallel
      const opinions = await Promise.all(
        opinionMakers.map(async (p) => {
           // If there is an active target, only they get the 'isDirectlyAddressed' flag
           const isTarget = activeTarget?.id === p.id;
           const op = await getInitialOpinion(p, text, historyContext, isTarget);
           
           // If this is the target, add them immediately. If not, small delay to simulate group thought
           if (!isTarget) await new Promise(r => setTimeout(r, Math.random() * 1000));
           
           addToDeliberation(deliberationId, op);
           return op;
        })
      );

      // PHASE 2: Debate
      addToDeliberation(deliberationId, {
        id: crypto.randomUUID(),
        senderId: 'system',
        senderName: 'System',
        text: 'The Council enters open debate...',
        timestamp: Date.now(),
        type: SenderType.SYSTEM
      });

      const debateMessages = await generateDebateRound(opinions, philosophers);
      
      // Simulate reading speed for debate
      for (const msg of debateMessages) {
        await new Promise(r => setTimeout(r, 1500));
        addToDeliberation(deliberationId, msg);
      }

      // PHASE 3: Wrap up deliberation
      markDeliberationComplete(deliberationId);
      
      const allMessages = [...messages, userMsg, ...opinions, ...debateMessages];

      // PHASE 4: Verdict & Summary
      // Generate summary text internally
      const summaryText = await generateDebateSummary(text, allMessages);

      // If user targeted someone, Force that person to deliver the verdict
      const verdict = await generateVerdict(
          text, 
          summaryText,
          philosophers, 
          activeTarget?.id
      );
      
      // Add final answer as a standard message (Mark audio as loading)
      const verdictMsg: ChatMessage = {
          ...verdict,
          isAudioLoading: true
      };
      setMessages(prev => [...prev, verdictMsg]);
      setCurrentSpeakerId(verdict.senderId);

      setAppState(AppState.FINISHED);

      // PHASE 5: Generate Audio (Background)
      const speaker = philosophers.find(p => p.id === verdict.senderId);
      if (speaker) {
         const audioData = await generatePhilosopherSpeech(verdict.text, speaker.voiceName);
         if (audioData) {
             setMessages(prev => prev.map(m => 
                 m.id === verdict.id 
                 ? { ...m, audioData, isAudioLoading: false } 
                 : m
             ));
         } else {
             setMessages(prev => prev.map(m => 
                 m.id === verdict.id 
                 ? { ...m, isAudioLoading: false } 
                 : m
             ));
         }
      }

    } catch (error) {
      console.error("Workflow error:", error);
      setMessages(prev => [...prev, {
        id: 'err',
        senderId: 'system',
        senderName: 'System',
        text: 'The connection to the ethereal plane was lost.',
        timestamp: Date.now(),
        type: SenderType.SYSTEM
      }]);
      setAppState(AppState.ERROR);
    }
  };

  const handleReplacePhilosopher = async (name: string, context: string, idToReplace: string) => {
    const newPhilosopher = await generatePhilosopherPersona(name, context);
    setPhilosophers(prev => prev.map(p => p.id === idToReplace ? newPhilosopher : p));
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      senderId: 'system',
      senderName: 'System',
      text: `${newPhilosopher.name} (${newPhilosopher.archetype}) has joined the Council.`,
      timestamp: Date.now(),
      type: SenderType.SYSTEM
    }]);
  };

  const handleReset = () => {
    setMessages([INITIAL_GREETING]);
    setAppState(AppState.IDLE);
    setTopic('');
    setCurrentSpeakerId(null);
    setSelectedPhilosopher(null);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-midnight text-slate-200 font-sans overflow-hidden">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        philosophers={philosophers}
        onReplacePhilosopher={handleReplacePhilosopher}
      />

      {/* App Header */}
      <header className="h-16 flex-shrink-0 border-b border-slate-800/80 bg-midnight/90 backdrop-blur-md z-50">
        <div className="h-full max-w-full px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-slate-100 to-slate-400 p-1.5 rounded-lg text-midnight shadow-lg shadow-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <h1 className="text-lg font-serif font-bold text-slate-100 tracking-wider">The Socratic Circle</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {appState === AppState.FINISHED && (
              <button onClick={handleReset} className="text-xs font-bold text-gold-accent hover:text-white uppercase tracking-wider px-3 py-1 border border-gold-dim/30 rounded hover:bg-gold-dim/20 transition-all">
                New Session
              </button>
            )}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              title="Summon new philosophers"
              disabled={appState === AppState.PROCESSING}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout - Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR (Desktop Only) */}
        <aside className="hidden md:flex flex-col w-80 bg-midnight-light/40 border-r border-slate-800/60 backdrop-blur-sm z-10">
          <div className="p-4 border-b border-slate-800/60">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">The Council</div>
             <p className="text-[10px] text-slate-600">Click a philosopher to address them directly</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {philosophers.map(p => (
              <div key={p.id} onClick={() => handlePhilosopherClick(p)} className="cursor-pointer">
                <PhilosopherCard 
                  philosopher={p}
                  isActive={currentSpeakerId === p.id || selectedPhilosopher?.id === p.id}
                  isSpeaking={currentSpeakerId === p.id}
                  variant="sidebar"
                />
              </div>
            ))}
          </div>
          {/* Sidebar Footer Info */}
          <div className="p-4 text-center text-xs text-slate-600 border-t border-slate-800/60">
             AI-Powered Debate Engine
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-midnight via-[#0a0f1c] to-midnight relative">
          
          {/* MOBILE TOP BAR (Adaptive) */}
          <div className="md:hidden flex-shrink-0 border-b border-slate-800/60 bg-midnight/95 backdrop-blur z-20 transition-all duration-500">
             {appState === AppState.IDLE ? (
                // IDLE STATE: Show Full Cards for Selection
                <div className="p-4">
                  <div className="text-center mb-3">
                    <p className="text-xs text-slate-400 font-serif uppercase tracking-widest">Assemble & Target</p>
                  </div>
                  <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scrollbar-hide">
                    {philosophers.map((p) => (
                      <div key={p.id} className="snap-center" onClick={() => handlePhilosopherClick(p)}>
                        <PhilosopherCard 
                          philosopher={p} 
                          isActive={currentSpeakerId === p.id || selectedPhilosopher?.id === p.id}
                          isSpeaking={currentSpeakerId === p.id}
                          variant="default"
                        />
                      </div>
                    ))}
                  </div>
                </div>
             ) : (
                // ACTIVE STATE: Compact Avatar Row
                <div className="px-4 py-2 flex items-center justify-between">
                   <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mask-linear-fade">
                      {philosophers.map(p => (
                         <div key={p.id} onClick={() => handlePhilosopherClick(p)} className={`relative transition-all duration-300 ${currentSpeakerId === p.id ? 'scale-110 opacity-100' : 'opacity-40 grayscale'} cursor-pointer`}>
                            <div className={`w-10 h-10 rounded-full border-2 overflow-hidden ${currentSpeakerId === p.id ? 'border-gold-accent' : 'border-slate-600'} ${selectedPhilosopher?.id === p.id ? 'ring-2 ring-indigo-500' : ''}`}>
                               <img src={p.avatar} className="w-full h-full object-cover" />
                            </div>
                         </div>
                      ))}
                   </div>
                   {topic && (
                     <div className="ml-4 text-right flex-1 min-w-0">
                        <div className="text-[10px] text-gold-dim uppercase tracking-wider font-bold">In Debate</div>
                     </div>
                   )}
                </div>
             )}
          </div>

          {/* CHAT INTERFACE - Takes all remaining space */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
             
             {/* Sticky Topic Header (Desktop) */}
             {topic && (
                <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-10 px-6 py-2 bg-midnight/80 backdrop-blur-md border border-slate-700/50 rounded-full shadow-xl animate-fade-in items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-slate-300 text-sm font-serif italic max-w-md truncate">"{topic}"</span>
                </div>
             )}

             {/* Messages Container */}
             <div 
               ref={chatContainerRef}
               className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-10 pb-28 md:pb-36"
             >
                {/* Intro Spacer */}
                <div className="h-4 md:h-12"></div>
                
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} philosophers={philosophers} />
                ))}

                {/* Additional Spacer for bottom */}
                <div className="h-12"></div>
             </div>

             {/* BOTTOM AREA: Input + Suggestions */}
             <div className="absolute bottom-0 left-0 right-0 z-20">
                {/* Suggestions Chips (Only in IDLE) */}
                {appState === AppState.IDLE && (
                  <div className="flex justify-center gap-2 mb-2 flex-wrap px-4">
                     {SUGGESTED_TOPICS.map((t, i) => (
                        <button 
                           key={i} 
                           onClick={() => handleUserSubmit(t)}
                           className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-700/50 backdrop-blur transition-all"
                        >
                           {t}
                        </button>
                     ))}
                  </div>
                )}
                
                {/* Input Area (Visible in IDLE or FINISHED or PROCESSING if we want to allow queuing, but let's disable during processing for simplicity) */}
                <div className="p-4 md:p-8 bg-gradient-to-t from-midnight via-midnight to-transparent">
                    <InputArea 
                      onSend={handleUserSubmit} 
                      appState={appState}
                      selectedPhilosopher={selectedPhilosopher}
                      onClearSelection={() => setSelectedPhilosopher(null)}
                    />
                    {appState === AppState.FINISHED && (
                      <p className="text-center text-[10px] text-slate-500 mt-2 animate-fade-in">
                         Click a philosopher to target your next question directly.
                      </p>
                    )}
                </div>
             </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;