import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Book, Layout, Compass, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import { STORY_TEMPLATES, PlotTemplate } from '../constants/templates';
import { cn } from '../lib/utils';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: PlotTemplate | null) => void;
}

export default function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="text-amber-500" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Foundation</span>
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Choose Your Structure.</h2>
                <p className="text-slate-500 font-medium mt-2">Start with a blank slate or pre-populate your plot with a tried-and-true template.</p>
              </div>
              <button 
                onClick={onClose}
                className="p-4 text-slate-400 hover:text-slate-600 bg-white shadow-sm border border-slate-100 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Blank Option */}
                <button 
                  onClick={() => onSelect(null)}
                  className="group relative flex flex-col text-left p-8 bg-white border-2 border-slate-100 rounded-[32px] hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-100/50 transition-all duration-300"
                >
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-8 transition-colors group-hover:bg-amber-50 group-hover:text-amber-600">
                    <Book size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">Blank Canvas</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">Clear your mind. Start from scratch with zero constraints and infinite possibilities.</p>
                  <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-amber-600 transition-colors">
                    Begin Journey <ChevronRight size={14} />
                  </div>
                </button>

                {STORY_TEMPLATES.map((template) => (
                  <button 
                    key={template.name}
                    onClick={() => onSelect(template)}
                    className="group relative flex flex-col text-left p-8 bg-white border-2 border-slate-100 rounded-[32px] hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-100/50 transition-all duration-300"
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-8 transition-colors group-hover:bg-amber-50 group-hover:text-amber-600">
                      {template.name.includes('Three-Act') ? <Layout size={32} /> : <Compass size={32} />}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight">{template.name}</h3>
                      <div className="px-3 py-1 bg-amber-50 text-amber-600 text-[8px] font-black uppercase rounded-lg border border-amber-100">
                        {template.beats.length} Beats
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">{template.description}</p>
                    
                    <div className="space-y-3 mb-8">
                       {template.beats.slice(0, 3).map((beat, i) => (
                         <div key={i} className="flex items-center gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1">{beat.title}</span>
                         </div>
                       ))}
                       <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-4">+ and more...</div>
                    </div>

                    <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-amber-600 transition-colors">
                      Select Template <ChevronRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
               <CheckCircle2 size={14} className="text-emerald-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Templates automatically load in the Story Planner</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
