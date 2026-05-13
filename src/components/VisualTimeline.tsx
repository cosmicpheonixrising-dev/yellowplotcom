import React from 'react';
import { motion } from 'motion/react';
import { TimelineEvent, Character } from '../types';
import { cn } from '../lib/utils';
import { UserCircle, Calendar } from 'lucide-react';

interface VisualTimelineProps {
  events: TimelineEvent[];
  characters: Character[];
}

export default function VisualTimeline({ events, characters }: VisualTimelineProps) {
  if (events.length === 0) return null;

  return (
    <div className="w-full bg-slate-50/50 rounded-[40px] border border-slate-100 p-10 overflow-x-auto no-scrollbar shadow-inner mb-12">
      <div className="flex items-center gap-2 mb-8">
        <Calendar size={18} className="text-amber-500" />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chronological Flow</h3>
      </div>
      
      <div className="relative min-w-[1000px] pb-12">
        {/* Main Axis */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 rounded-full" />
        
        <div className="flex justify-between items-center relative z-10">
          {events.map((event, index) => {
            const participants = characters.filter(c => event.characterIds?.includes(c.id));
            
            return (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center group relative w-48"
              >
                {/* Connection Line */}
                <div className={cn(
                  "absolute h-10 w-0.5 bg-slate-200 bottom-full mb-4 group-hover:bg-amber-400 transition-colors",
                  index % 2 === 0 ? "h-20" : "h-10"
                )} />

                {/* Event Card (Floating) */}
                <div className={cn(
                  "absolute bottom-full mb-14 w-40 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-all pointer-events-none transform translate-y-2 group-hover:translate-y-0",
                  index % 2 === 0 ? "mb-24" : "mb-14"
                )}>
                  <div className="text-[8px] font-black uppercase tracking-[0.1em] text-amber-500 mb-1">{event.date}</div>
                  <h4 className="text-[10px] font-bold text-slate-800 line-clamp-2 leading-tight">{event.event}</h4>
                </div>

                {/* Node */}
                <div className="w-6 h-6 rounded-full bg-white border-4 border-slate-200 group-hover:border-amber-500 group-hover:scale-125 transition-all duration-300 shadow-sm relative">
                  <div className="absolute inset-0 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Date Label (Bottom) */}
                <div className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{event.date}</div>

                {/* Participants */}
                <div className="mt-2 flex -space-x-2">
                  {participants.slice(0, 3).map(p => (
                    <div key={p.id} className="w-5 h-5 rounded-full bg-amber-100 border border-white flex items-center justify-center text-amber-600 shadow-sm" title={p.name}>
                      <UserCircle size={12} />
                    </div>
                  ))}
                  {participants.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[7px] font-bold text-slate-500">
                      +{participants.length - 3}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
