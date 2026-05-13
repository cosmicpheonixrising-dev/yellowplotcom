import React from 'react';
import { motion } from 'motion/react';
import { Character, PlotPoint, TimelineEvent } from '../types';
import { cn } from '../lib/utils';
import { UserCircle, Sparkles, Zap, Award, Flame, Compass } from 'lucide-react';

interface ArcPoint {
  id: string;
  title: string;
  description: string;
  type: 'plot' | 'timeline';
  momentType?: 'Conflict' | 'Decision' | 'Shift' | 'Climax' | 'Resolution';
  impact: number;
  order: number;
}

interface CharacterArcVisualProps {
  character: Character;
  plots: PlotPoint[];
  timelines: TimelineEvent[];
  allCharacters: Character[];
}

const MOMENT_COLORS = {
  Conflict: 'bg-rose-500 border-rose-200 text-white',
  Decision: 'bg-indigo-500 border-indigo-200 text-white',
  Shift: 'bg-amber-500 border-amber-200 text-white',
  Climax: 'bg-slate-900 border-slate-700 text-white shadow-xl',
  Resolution: 'bg-emerald-500 border-emerald-200 text-white',
  default: 'bg-white border-slate-200 text-slate-400'
};

const MOMENT_ICONS = {
  Conflict: <Flame size={12} />,
  Decision: <Split size={12} />,
  Shift: <Zap size={12} />,
  Climax: <Sparkles size={12} />,
  Resolution: <Award size={12} />,
  default: <Compass size={12} />
};

function Split({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5" />
      <path d="M8 3H3v5" />
      <path d="M12 21v-8a4 4 0 0 0-4-4H3" />
      <path d="M12 21v-8a4 4 0 0 1 4-4h5" />
    </svg>
  );
}

export default function CharacterArcVisual({ character, plots, timelines, allCharacters }: CharacterArcVisualProps) {
  // Merge and sort plots and timelines where character is involved
  const characterPlots: ArcPoint[] = plots
    .filter(p => p.characterIds?.includes(character.id))
    .map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      type: 'plot',
      momentType: p.momentType || 'Shift',
      impact: p.impact || 3,
      order: p.order
    }));

  const characterTimelines: ArcPoint[] = timelines
    .filter(t => t.characterIds?.includes(character.id))
    .map(t => ({
      id: t.id,
      title: t.event,
      description: t.date,
      type: 'timeline',
      momentType: 'Resolution',
      impact: 2,
      order: t.order * 2
    }));

  const combinedPoints = [...characterPlots].sort((a,b) => a.order - b.order);

  if (combinedPoints.length === 0) {
    return (
      <div className="py-12 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">The character has no recorded milestones yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-3">
            <UserCircle size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{character.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="px-2 py-0.5 bg-amber-100 rounded-lg">
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600">{character.role}</span>
              </div>
              <span className="w-1.5 h-1.5 bg-slate-100 rounded-full" />
              <span className="text-[10px] font-bold text-slate-400 capitalize">{combinedPoints.length} Key Beats</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {['Conflict', 'Decision', 'Shift', 'Climax', 'Resolution'].map(type => (
            <div key={type} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
               <div className={cn("w-2 h-2 rounded-full", MOMENT_COLORS[type as keyof typeof MOMENT_COLORS].split(' ')[0])} />
               <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative pt-32 pb-20">
        {/* Connection Spine */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-50 -translate-y-1/2" />
        
        <div className="flex justify-between items-center relative z-10 px-8">
          {combinedPoints.map((point, i) => {
            const mType = point.momentType || 'Shift';
            const colorClass = MOMENT_COLORS[mType as keyof typeof MOMENT_COLORS];
            const icon = MOMENT_ICONS[mType as keyof typeof MOMENT_ICONS];
            const scale = 0.8 + (point.impact / 5) * 0.8; // Scale based on impact

            return (
              <motion.div 
                key={point.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center group relative w-full"
              >
                {/* Vertical Offset Line */}
                <div 
                  className={cn(
                    "absolute w-[1px] bg-slate-200 transition-all duration-500 group-hover:bg-amber-400",
                    i % 2 === 0 ? "bottom-full h-16 origin-bottom" : "top-full h-16 origin-top"
                  )} 
                />

                {/* Floating Info Card */}
                <div className={cn(
                   "absolute w-64 p-5 bg-white rounded-3xl shadow-2xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-all pointer-events-none transform z-50",
                   i % 2 === 0 ? "bottom-full mb-20 -translate-y-2 group-hover:translate-y-0" : "top-full mt-20 translate-y-2 group-hover:translate-y-0"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-[7px] font-black uppercase tracking-[0.2em]", colorClass)}>
                      {point.momentType}
                    </span>
                    <div className="flex items-center gap-1">
                       <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Impact</span>
                       <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(v => (
                             <div key={v} className={cn("w-1 h-2 rounded-full", v <= point.impact ? "bg-amber-400" : "bg-slate-100")} />
                          ))}
                       </div>
                    </div>
                  </div>
                  <h4 className="text-[11px] font-black text-slate-800 mb-2 leading-tight uppercase tracking-tight">{point.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium line-clamp-4">{point.description}</p>
                  
                  {point.type === 'plot' && plots.find(p => p.id === point.id)?.characterIds?.some(id => id !== character.id) && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">With</p>
                      <div className="flex flex-wrap gap-1">
                        {plots.find(p => p.id === point.id)?.characterIds?.filter(id => id !== character.id).map(id => {
                          const coChar = allCharacters.find(c => c.id === id);
                          if (!coChar) return null;
                          return (
                            <span key={id} className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[8px] font-bold rounded-md border border-slate-100">
                              {coChar.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* The Node */}
                <motion.div 
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  style={{ scale }}
                  className={cn(
                    "w-12 h-12 rounded-[20px] flex items-center justify-center transition-all duration-500 shadow-xl border cursor-help relative z-20",
                    colorClass
                  )}
                >
                  {icon}
                  {/* Subtle Pulse for High Impact */}
                  {point.impact >= 4 && (
                    <div className="absolute inset-0 rounded-[20px] animate-ping opacity-20 bg-inherit" />
                  )}
                </motion.div>

                {/* Label (Center-ish) */}
                <div className={cn(
                  "absolute text-center w-32 left-1/2 -translate-x-1/2",
                  i % 2 === 0 ? "top-full mt-8" : "bottom-full mb-8"
                )}>
                  <div className="text-[8px] font-black text-slate-800 uppercase tracking-widest truncate truncate max-w-full">{point.title}</div>
                  <div className="text-[6px] font-bold text-amber-500 uppercase tracking-[0.3em] mt-1">Impact Level {point.impact}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Character Path Trace</span>
            <div className="h-1 w-32 bg-slate-100 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: "100%" }}
                 transition={{ duration: 2, ease: "easeInOut" }}
                 className="h-full bg-slate-900" 
               />
            </div>
         </div>
         <p className="text-[9px] font-bold italic text-slate-400">
            "A soul in motion is a story in truth."
         </p>
      </div>
    </div>
  );
}
