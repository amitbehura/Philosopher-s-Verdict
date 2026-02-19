import React from 'react';
import { Philosopher } from '../types';

interface PhilosopherCardProps {
  philosopher: Philosopher;
  isActive: boolean;
  isSpeaking: boolean;
  variant?: 'default' | 'sidebar';
}

export const PhilosopherCard: React.FC<PhilosopherCardProps> = ({ 
  philosopher, 
  isActive, 
  isSpeaking,
  variant = 'default' 
}) => {
  
  // SIDEBAR VARIANT (Desktop Left Panel)
  if (variant === 'sidebar') {
    return (
      <div 
        className={`
          relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-300
          ${isActive 
            ? 'bg-slate-800 border-gold-accent shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
            : 'bg-midnight-light/50 border-transparent hover:bg-slate-800/50 hover:border-slate-700'}
        `}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 ${isActive || isSpeaking ? 'border-gold-accent' : 'border-slate-600'}`}>
             <img src={philosopher.avatar} alt={philosopher.name} className="w-full h-full object-cover" />
          </div>
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-accent"></span>
            </span>
          )}
        </div>
        
        {/* Text Info */}
        <div className="flex-1 min-w-0 text-left">
          <h3 className={`font-serif font-bold text-xs md:text-sm truncate ${isActive ? 'text-gold-accent' : 'text-slate-300'}`}>
            {philosopher.name}
          </h3>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-gold-dim/80 truncate">
             {philosopher.archetype || "The Sage"}
          </p>
        </div>
      </div>
    );
  }

  // DEFAULT VARIANT (Mobile / Grid)
  return (
    <div 
      className={`
        relative group rounded-xl transition-all duration-500 border overflow-hidden
        w-32 md:w-40 flex-shrink-0
        ${isActive 
          ? 'bg-midnight-light border-gold-accent shadow-[0_0_20px_rgba(212,175,55,0.2)] scale-105 z-20' 
          : 'bg-card-bg/60 border-slate-800 opacity-90 hover:opacity-100 hover:border-slate-600'}
        flex flex-col items-center text-center h-48 md:h-52
      `}
    >
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(${philosopher.avatar})` }}
      />
      
      <div className="relative z-10 p-3 flex flex-col items-center h-full w-full">
        <div className={`
          relative w-14 h-14 md:w-16 md:h-16 mb-2 rounded-full overflow-hidden border-2 transition-all duration-500
          ${isActive || isSpeaking ? 'border-gold-accent shadow-lg shadow-gold-accent/20' : 'border-slate-600'}
        `}>
          <img 
            src={philosopher.avatar} 
            alt={philosopher.name} 
            className={`w-full h-full object-cover transition-all duration-700 ${isActive ? 'grayscale-0' : 'grayscale contrast-125'}`} 
          />
        </div>
        
        <h3 className={`font-serif font-bold mb-0.5 transition-colors ${isActive ? 'text-gold-accent' : 'text-slate-200'} text-xs md:text-sm`}>
          {philosopher.name}
        </h3>
        
        <div className="flex-grow flex flex-col items-center justify-start w-full px-1 mt-1">
           <span className="px-2 py-0.5 rounded-full bg-slate-900/50 border border-slate-700/50 text-[9px] text-gold-dim uppercase tracking-wider mb-1">
             {philosopher.archetype || "Sage"}
           </span>
           <p className="text-[9px] md:text-[10px] text-slate-400 italic line-clamp-2 font-body leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
              "{philosopher.quote}"
           </p>
        </div>
      </div>
      
      {isSpeaking && (
        <div className="absolute top-2 right-2 flex space-x-1 z-20">
          <div className="w-1.5 h-1.5 bg-gold-accent rounded-full animate-bounce"></div>
          <div className="w-1.5 h-1.5 bg-gold-accent rounded-full animate-bounce delay-100"></div>
        </div>
      )}
    </div>
  );
};