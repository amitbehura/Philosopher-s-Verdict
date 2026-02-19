import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Philosopher } from '../types';

interface DeliberationBubbleProps {
  message: ChatMessage;
  philosophers: Philosopher[];
}

export const DeliberationBubble: React.FC<DeliberationBubbleProps> = ({ message, philosophers }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll the inner content when new messages arrive if already expanded
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [message.innerMessages?.length, isExpanded]);

  const innerMessages = message.innerMessages || [];
  const lastInnerMessage = innerMessages[innerMessages.length - 1];
  const isComplete = message.status === 'completed';

  // Get unique avatars participating
  const participatingIds = Array.from(new Set(innerMessages.map(m => m.senderId)));
  const participants = philosophers.filter(p => participatingIds.includes(p.id));

  return (
    <div className="w-full mb-6 animate-fade-in px-4 md:px-0">
      <div className="max-w-2xl mx-auto">
        
        {/* Main Card */}
        <div className={`
          border rounded-xl overflow-hidden transition-all duration-300
          ${isExpanded 
            ? 'bg-slate-900/80 border-slate-700 shadow-2xl' 
            : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/60 cursor-pointer'}
        `}>
          
          {/* Header / Summary View */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-3 md:p-4 flex items-center justify-between gap-4 select-none"
          >
            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
              {/* Icon / Status */}
              <div className={`
                w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${isComplete ? 'bg-indigo-900/30 text-indigo-400' : 'bg-gold-dim/10 text-gold-accent'}
              `}>
                {isComplete ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                ) : (
                   <svg className="animate-spin-slow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                )}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                   <h3 className="text-sm font-semibold text-slate-200">
                     {isComplete ? 'The Council has Spoken' : 'Council Deliberation'}
                   </h3>
                   <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      {innerMessages.length} steps
                   </span>
                </div>
                
                {/* Dynamic Subtext */}
                <p className="text-xs text-slate-500 truncate font-mono">
                  {isComplete 
                    ? "Click to view the debate transcript" 
                    : lastInnerMessage 
                        ? `${lastInnerMessage.senderName} is speaking...` 
                        : "Gathering the philosophers..."}
                </p>
              </div>
            </div>

            {/* Expand/Collapse Chevron */}
            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-slate-500`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>

          {/* Expanded Content (The Discourse) */}
          {isExpanded && (
            <div className="border-t border-slate-800/60 bg-midnight-light/30">
               <div 
                 ref={scrollRef}
                 className="max-h-96 overflow-y-auto p-4 space-y-4 custom-scrollbar"
               >
                 {innerMessages.map((msg) => {
                   const p = philosophers.find(ph => ph.id === msg.senderId);
                   return (
                     <div key={msg.id} className="flex gap-3 animate-fade-in">
                       <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border border-slate-700 mt-1">
                          <img src={p?.avatar || `https://picsum.photos/seed/${msg.senderName}/50/50`} alt={msg.senderName} className="w-full h-full object-cover opacity-80" />
                       </div>
                       <div className="flex-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-bold text-gold-dim/80 mb-1 block">{msg.senderName}</span>
                          </div>
                          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-body">
                            {msg.text}
                          </p>
                       </div>
                     </div>
                   )
                 })}
                 
                 {!isComplete && (
                   <div className="flex items-center gap-2 text-xs text-slate-600 italic pl-11 animate-pulse">
                     <span>Thinking...</span>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};