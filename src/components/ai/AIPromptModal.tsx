import { useState } from 'react';
import { X, Sparkles, Wand2, BookOpen, UserCircle, Map, Terminal, Copy, Check } from 'lucide-react';
import { aiService } from '../../services/aiService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

type Tool = 'Idea' | 'Character' | 'Title' | 'Plot' | 'Assistant';

export default function AIPromptModal({ onClose }: { onClose: () => void }) {
  const [activeTool, setActiveTool] = useState<Tool>('Idea');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult('');
    try {
      let output = '';
      switch (activeTool) {
        case 'Idea': output = await aiService.generateStoryIdea(prompt); break;
        case 'Character': output = await aiService.generateCharacter(prompt); break;
        case 'Title': output = await aiService.brainstormTitles('novel', prompt); break;
        case 'Plot': output = await aiService.expandPlot(prompt); break;
        case 'Assistant': output = await aiService.writingAssistant('N/A', prompt); break;
      }
      setResult(output);
    } catch (err) {
      setResult('Error generating content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-5xl max-h-[85vh] rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-200"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100 rotate-2">
              <Sparkles className="text-white w-7 h-7" />
            </div>
            <div>
              <h2 className="font-sans text-2xl font-black tracking-tighter text-slate-800">Neural AI Muse</h2>
              <p className="text-[10px] text-amber-500 uppercase tracking-[0.2em] font-black">Powered by Gemini · Story Laboratory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-300 hover:text-rose-500">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-20 md:w-72 border-r border-slate-100 p-6 shrink-0 flex flex-col gap-4 bg-slate-50/30">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2 px-2 hidden md:block">Abilities</div>
            <ToolButton 
              active={activeTool === 'Idea'} 
              onClick={() => setActiveTool('Idea')} 
              icon={<Map size={20} />} 
              label="Inception" 
            />
            <ToolButton 
              active={activeTool === 'Character'} 
              onClick={() => setActiveTool('Character')} 
              icon={<UserCircle size={20} />} 
              label="Bio-Graphy" 
            />
            <ToolButton 
              active={activeTool === 'Plot'} 
              onClick={() => setActiveTool('Plot')} 
              icon={<Terminal size={20} />} 
              label="Beat Expansion" 
            />
            <ToolButton 
              active={activeTool === 'Title'} 
              onClick={() => setActiveTool('Title')} 
              icon={<BookOpen size={20} />} 
              label="Nomenclature" 
            />
            <ToolButton 
              active={activeTool === 'Assistant'} 
              onClick={() => setActiveTool('Assistant')} 
              icon={<Wand2 size={20} />} 
              label="Prose Review" 
            />
          </aside>

          <main className="flex-1 flex flex-col p-8 overflow-hidden bg-white">
            <div className="mb-10">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
                {activeTool === 'Assistant' ? 'Manuscript Inquiry' : 'Architectural Input'}
              </label>
              <div className="relative group">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your creative bottleneck..."
                  className="w-full h-36 p-6 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-200 transition-all resize-none placeholder:text-slate-200"
                  id="ai-prompt-input"
                />
                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="absolute bottom-6 right-6 bg-amber-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-2xl shadow-amber-200 group-hover:scale-105 active:scale-95"
                >
                  {loading ? 'Processing...' : 'Engage'}
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-3xl p-8 overflow-y-auto relative min-h-[300px]">
              {result ? (
                <>
                  <div className="absolute top-6 right-6 flex gap-2">
                    <button 
                      onClick={handleCopy}
                      className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-lg transition-all text-slate-300 hover:text-amber-600"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <div className="prose prose-slate max-w-none font-serif text-lg leading-[1.8] text-slate-700">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-6 opacity-80">
                  <Wand2 size={64} className="animate-pulse" />
                  <p className="font-sans text-sm font-bold uppercase tracking-[0.2em]">Awaiting creative command</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </motion.div>
    </div>
  );
}

function ToolButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
        active 
          ? 'bg-white text-black shadow-sm ring-1 ring-gray-200' 
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
    >
      <div className={`${active ? 'text-[#5A5A40]' : 'text-gray-300'}`}>{icon}</div>
      <span className="hidden md:block text-xs font-bold uppercase tracking-widest text-left">{label}</span>
    </button>
  );
}
