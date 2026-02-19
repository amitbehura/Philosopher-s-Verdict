import React, { useState } from 'react';
import { Philosopher } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  philosophers: Philosopher[];
  onReplacePhilosopher: (newPhilosopherName: string, context: string, idToReplace: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  philosophers, 
  onReplacePhilosopher 
}) => {
  const [newName, setNewName] = useState('');
  const [context, setContext] = useState('');
  const [selectedId, setSelectedId] = useState<string>(philosophers[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !selectedId) return;

    setIsLoading(true);
    setError(null);
    try {
      await onReplacePhilosopher(newName, context, selectedId);
      onClose();
      // Reset form
      setNewName('');
      setContext('');
      setSelectedId(philosophers[0]?.id || '');
    } catch (err) {
      setError("Could not summon this persona. Please check the name or provide more context.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/80 backdrop-blur-sm" onClick={!isLoading ? onClose : undefined}></div>
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl animate-fade-in-down">
        <h2 className="text-xl font-serif font-bold text-slate-100 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 1 8 8c0 3.36-1.78 6.46-4.67 8.16L12 22l-3.33-3.84A8.16 8.16 0 0 1 4 10a8 8 0 0 1 8-8z"/><circle cx="12" cy="10" r="3"/></svg>
          Summon New Thinker
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              New Philosopher Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Alan Watts, Confucius, Yoda"
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Who are they? (Optional Context)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Help the AI if the name is obscure or ambiguous..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Replace Which Philosopher?
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
              {philosophers.map(p => (
                <label 
                  key={p.id} 
                  className={`
                    flex items-center gap-3 p-2 rounded border cursor-pointer transition-all
                    ${selectedId === p.id 
                      ? 'bg-indigo-900/40 border-indigo-500' 
                      : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}
                  `}
                >
                  <input 
                    type="radio" 
                    name="replaceId" 
                    value={p.id}
                    checked={selectedId === p.id}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover grayscale" />
                  <span className="text-sm font-medium text-slate-300">{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-900/50">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !newName.trim() || !selectedId}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Summoning...
                </>
              ) : (
                'Replace & Summon'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};