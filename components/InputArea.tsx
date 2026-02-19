import React, { useState } from 'react';
import { AppState, Philosopher } from '../types';

interface InputAreaProps {
  onSend: (text: string) => void;
  appState: AppState;
  selectedPhilosopher: Philosopher | null;
  onClearSelection: () => void;
}

export const InputArea: React.FC<InputAreaProps> = ({ 
  onSend, 
  appState, 
  selectedPhilosopher,
  onClearSelection
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const isDisabled = appState !== AppState.IDLE && appState !== AppState.FINISHED;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      {/* Selection Pill */}
      {selectedPhilosopher && (
        <div className="absolute -top-10 left-0 animate-fade-in z-10">
          <div className="flex items-center gap-2 bg-slate-800 border border-gold-dim/50 rounded-full px-3 py-1.5 shadow-lg">
             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Addressing:</span>
             <div className="flex items-center gap-1.5">
                <img src={selectedPhilosopher.avatar} className="w-4 h-4 rounded-full" />
                <span className="text-xs font-bold text-gold-accent">{selectedPhilosopher.name}</span>
             </div>
             <button 
               onClick={onClearSelection}
               className="ml-1 p-0.5 rounded-full hover:bg-slate-700 text-slate-500 hover:text-white"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-900 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1.5 focus-within:border-indigo-500 transition-colors">
            
          <div className="pl-3 text-slate-500">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isDisabled}
            placeholder={
              isDisabled 
              ? "The philosophers are debating..." 
              : selectedPhilosopher 
                ? `Ask ${selectedPhilosopher.name} a question...`
                : "What burdens your mind today? Ask the Council..."
            }
            className="w-full bg-transparent text-slate-200 placeholder-slate-500 px-4 py-3 focus:outline-none"
          />

          <button
            type="submit"
            disabled={isDisabled || !text.trim()}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-sm transition-all
              ${isDisabled || !text.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/30'}
            `}
          >
            {isDisabled ? (
               <span className="flex items-center gap-2">
                 <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Thinking
               </span>
            ) : (
                <>
                {selectedPhilosopher ? 'Ask' : 'Enter Arena'}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};