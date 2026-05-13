import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../services/firebase';
import { Story, Character, Lore, PlotPoint, TimelineEvent } from '../types';
import { ChevronLeft, Maximize2, Minimize2, Map, Layout, Wand2, Sparkles, Check, Save, History, RotateCcw, Download, Plus, User, Book, Type, FileJson, FileText, FileCode, Target, Edit3, Languages, Palette, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'motion/react';
import { aiService } from '../services/aiService';
import { exportService } from '../services/exportService';
import { cn } from '../lib/utils';
import PresenceIndicator from '../components/PresenceIndicator';

import { useSubscription } from '../components/SubscriptionContext';
import PricingModal from '../components/PricingModal';
import { Crown } from 'lucide-react';

export default function Editor() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const { isPro } = useSubscription();
  const [showPricing, setShowPricing] = useState(false);
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTypewriterMode, setIsTypewriterMode] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  const [lineHeight, setLineHeight] = useState(2);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [lores, setLores] = useState<Lore[]>([]);
  const [plots, setPlots] = useState<PlotPoint[]>([]);
  const [timelines, setTimelines] = useState<TimelineEvent[]>([]);
  const [selection, setSelection] = useState<{ text: string, x: number, y: number } | null>(null);
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const STYLE_ALCHEMY = [
    { name: 'Hemingway', desc: 'Short, minimalist prose.', prompt: 'Rewrite in the style of Ernest Hemingway: short, direct sentences, minimalist prose, and focus on concrete action.' },
    { name: 'Shakespeare', desc: 'Poetic, grand metaphors.', prompt: 'Rewrite in the style of William Shakespeare: use Early Modern English, poetic metaphors, and dramatic flair.' },
    { name: 'Noir', desc: 'Gritty, hardboiled cynicism.', prompt: 'Rewrite in the style of a hardboiled Noir detective novel: cynical internal monologue, gritty atmospheric descriptions.' },
    { name: 'Victorian', desc: 'Formal, ornate structures.', prompt: 'Rewrite in the style of a Victorian novelist like Dickens: ornate, formal language, and complex sentence structures.' },
    { name: 'Cinematic', desc: 'Visceral visual impact.', prompt: 'Rewrite in a cinematic style: focus on visual sensory details and cinematic impact.' },
  ];
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lastSyncContent = useRef<string>('');
  const isTyping = useRef<boolean>(false);
  const typingTimeout = useRef<any>(null);

  const [initialWordCount, setInitialWordCount] = useState<number | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number>(1000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  useEffect(() => {
    if (story && initialWordCount === null) {
      const count = story.content?.trim() ? story.content.trim().split(/\s+/).length : 0;
      setInitialWordCount(count);
    }
    if (story?.dailyGoal) {
      setDailyGoal(story.dailyGoal);
    }
  }, [story, initialWordCount]);

  const dailyProgress = useMemo(() => {
    if (initialWordCount === null) return 0;
    return Math.max(0, wordCount - initialWordCount);
  }, [wordCount, initialWordCount]);

  const updateDailyGoal = async (newGoal: number) => {
    if (!storyId) return;
    setDailyGoal(newGoal);
    try {
      await updateDoc(doc(db, 'stories', storyId), {
        dailyGoal: newGoal
      });
    } catch (e) {
      console.error("Failed to update daily goal:", e);
    }
  };

  useEffect(() => {
    if (!storyId) return;

    // Fetch Plots & Timelines for export
    const unsubPlots = onSnapshot(query(collection(db, 'plots'), where('storyId', '==', storyId)), (s) => {
      setPlots(s.docs.map(d => ({ id: d.id, ...d.data() })) as PlotPoint[]);
    });
    const unsubTimelines = onSnapshot(query(collection(db, 'timelines'), where('storyId', '==', storyId)), (s) => {
      setTimelines(s.docs.map(d => ({ id: d.id, ...d.data() })) as TimelineEvent[]);
    });

    // Fetch Characters
    const qChar = query(collection(db, 'characters'), where('storyId', '==', storyId));
    const unsubChar = onSnapshot(qChar, (s) => {
      setCharacters(s.docs.map(d => ({ id: d.id, ...d.data() })) as Character[]);
    });

    // Fetch Lore
    const qLore = query(collection(db, 'lores'), where('storyId', '==', storyId));
    const unsubLore = onSnapshot(qLore, (s) => {
      setLores(s.docs.map(d => ({ id: d.id, ...d.data() })) as Lore[]);
    });

    // Fetch Snapshots
    const qSnap = query(collection(db, 'snapshots'), where('storyId', '==', storyId));
    const unsubSnap = onSnapshot(qSnap, (s) => {
      setSnapshots(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });

    const unsubscribe = onSnapshot(doc(db, 'stories', storyId), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Story;
        setStory({ id: doc.id, ...data });
        
        // Remote Sync Guard: Only update if not typing OR content is significantly different
        if (!isTyping.current || data.content !== lastSyncContent.current) {
          if (data.content !== undefined && data.content !== content) {
             setContent(data.content || '');
             lastSyncContent.current = data.content || '';
          }
        }
      } else {
        navigate('/dashboard');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `stories/${storyId}`);
    });

    return () => {
      unsubscribe();
      unsubChar();
      unsubLore();
      unsubPlots();
      unsubTimelines();
    };
  }, [storyId, navigate]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    isTyping.current = true;
    
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTyping.current = false;
    }, 2000);
  };

  // Detected entities based on content
  const detectedEntities = useMemo(() => {
    const allEntities = [
      ...characters.map(c => ({ id: c.id, name: c.name, type: 'Character', description: c.description })),
      ...lores.map(l => ({ id: l.id, name: l.title, type: 'Lore', description: l.content }))
    ];
    return allEntities.filter(entity => 
      content.toLowerCase().includes(entity.name.toLowerCase())
    ).slice(0, 3);
  }, [content, characters, lores]);

  const handleSelection = () => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value.substring(start, end).trim();

    if (text.length > 2) {
      // Basic position calculation for the toolbar
      // In a real implementation with a proper editor, this would be more precise
      setSelection({ text, x: 0, y: 0 }); 
    } else {
      setSelection(null);
      setShowStyleMenu(false);
    }
  };

  const applyAiPowerup = async (action: string) => {
    if (!selection) return;
    if (!isPro) {
      setShowPricing(true);
      return;
    }
    setAiLoading(true);
    try {
      const prompt = `${action}: "${selection.text}"`;
      const response = await aiService.writingAssistant(content, prompt);
      const newContent = content.replace(selection.text, response);
      setContent(newContent);
      setSelection(null);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Autosave after 2 seconds of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      if (story && content !== story.content) {
        saveContent();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content]);

  const saveContent = async (asSnapshot = false) => {
    if (!storyId || saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'stories', storyId), {
        content: content,
        updatedAt: serverTimestamp()
      });
      setLastSaved(new Date());
      
      if (asSnapshot) {
        await takeSnapshot();
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const takeSnapshot = async () => {
    if (!storyId || !content) return;
    try {
      await addDoc(collection(db, 'snapshots'), {
        content,
        createdAt: serverTimestamp(),
        storyId,
        ownerId: auth?.currentUser?.uid
      });
    } catch (e) {
      console.error(e);
    }
  };

  const exportManuscript = (format: 'md' | 'json' | 'txt') => {
    if (!story) return;
    if (!isPro && (format === 'md' || format === 'json')) {
      setShowPricing(true);
      return;
    }
    switch (format) {
      case 'md': exportService.exportAsMarkdown(story, characters, lores); break;
      case 'json': exportService.exportAsJSON(story, characters, plots, timelines, lores); break;
      case 'txt': exportService.exportAsPlain(story, characters, plots); break;
    }
    setShowExport(false);
  };

  const handleAIAction = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const response = await aiService.writingAssistant(content, aiInput);
      setContent(prev => (prev ? prev + '\n\n' + response : response));
      setAiInput('');
      setShowAI(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="h-full flex overflow-hidden bg-white">
      {/* Sidebar Toolrail */}
      {!isFullWidth && (
        <aside className="w-72 bg-slate-50 border-r border-slate-200 p-8 flex flex-col justify-between shrink-0 h-full overflow-y-auto">
          <div>
            <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-amber-600 transition-colors mb-10 text-[10px] font-black uppercase tracking-widest group">
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Back Dashboard
            </Link>
            
            <h1 className="font-serif text-3xl font-bold mb-10 leading-tight break-words text-slate-800">
              {story?.title}
            </h1>

            <nav className="space-y-2 mb-10">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4 px-2">Project Tools</div>
              <Link to={`/story/${storyId}/planner`} className="flex items-center gap-3 text-slate-500 hover:text-amber-600 transition-all p-3 rounded-xl hover:bg-white hover:shadow-sm">
                <Map size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Story Planner</span>
              </Link>
              <button 
                onClick={() => {
                  if (!isPro) setShowPricing(true);
                  else setShowSnapshots(!showSnapshots);
                }}
                className={cn(
                  "w-full flex items-center gap-3 transition-all p-3 rounded-xl hover:shadow-sm",
                  showSnapshots ? "bg-slate-900 text-white shadow-xl" : "text-slate-500 hover:text-amber-600 hover:bg-white"
                )}
              >
                {!isPro && <Crown size={14} className="fill-amber-500" />}
                <History size={18} />
                <span className="text-xs font-bold uppercase tracking-widest text-left">Version History</span>
              </button>
              <button 
                onClick={() => {
                  if (!isPro) setShowPricing(true);
                  else setShowAI(!showAI);
                }}
                className={cn(
                  "w-full flex items-center gap-3 transition-all p-3 rounded-xl hover:shadow-sm",
                  showAI ? "bg-amber-600 text-white shadow-amber-100 shadow-xl" : "text-slate-500 hover:text-amber-600 hover:bg-white"
                )}
              >
                {!isPro && <Crown size={14} className="fill-amber-500" />}
                <Wand2 size={18} />
                <span className="text-xs font-bold uppercase tracking-widest text-left">Neural Muse</span>
              </button>
            </nav>

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4 px-2">Outline</div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm text-xs text-slate-500 leading-relaxed font-medium">
                Chapter 1: The Beginning. Focus on establishing the main conflict and setting.
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div className="p-6 bg-amber-50/50 rounded-[32px] border border-amber-100/50 shadow-sm transition-all hover:bg-amber-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                    <Target size={14} />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Daily Progress</span>
                </div>
                <button 
                  onClick={() => setIsEditingGoal(!isEditingGoal)}
                  className="text-slate-400 hover:text-amber-600 transition-colors"
                >
                  <Edit3 size={12} />
                </button>
              </div>

              {isEditingGoal ? (
                <div className="mb-4">
                  <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Configure Goal</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={dailyGoal}
                      onChange={(e) => updateDailyGoal(parseInt(e.target.value) || 0)}
                      onBlur={() => setIsEditingGoal(false)}
                      autoFocus
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    <span className="text-[10px] font-bold text-slate-400">Words</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-black text-slate-800 tracking-tighter">{dailyProgress}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/ {dailyGoal} Goal</span>
                </div>
              )}

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (dailyProgress / dailyGoal) * 100)}%` }}
                  className={cn(
                    "h-full transition-all duration-500",
                    dailyProgress >= dailyGoal ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500"
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total: {wordCount} Words</span>
                </div>
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                  {Math.round((dailyProgress / dailyGoal) * 100)}% Complete
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-2">
                {saving ? (
                  <span className="animate-pulse">Saving...</span>
                ) : lastSaved ? (
                  <><Check size={12} className="text-emerald-500" /> Active Sync</>
                ) : (
                  <>Auto-Save</>
                )}
              </span>
              <button onClick={() => saveContent(true)} className="text-slate-400 hover:text-amber-600 transition-colors">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 overflow-y-auto bg-white flex flex-col relative scroll-smooth transition-all duration-700",
        isFocusMode ? "bg-slate-50" : "bg-white"
      )}>
        {/* Workspace Header */}
        {!isFocusMode && (
          <header className="h-16 border-b border-slate-50 flex items-center justify-between px-10 sticky top-0 bg-white/80 backdrop-blur-md z-30 shrink-0">
            <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Manuscript</span>
              <span className="text-slate-200">/</span>
              <span className="text-amber-600">{story?.type} View</span>
            </div>
            <div className="flex items-center gap-4 relative">
               {isPro && <PresenceIndicator storyId={storyId!} />}
               <button 
                onClick={() => setIsFullWidth(!isFullWidth)}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2"
              >
                {isFullWidth ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {isFullWidth ? 'Normal View' : 'Wide View'}
              </button>
              <button 
                onClick={() => { setIsFocusMode(true); setIsFullWidth(true); }}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 rounded-xl transition-all flex items-center gap-2"
              >
                <Sparkles size={14} />
                Zen Mode
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowExport(!showExport)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2"
                >
                  <Download size={14} />
                  Export
                </button>
                <AnimatePresence>
                  {showExport && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[70] overflow-hidden"
                    >
                      <button onClick={() => exportManuscript('md')} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all relative">
                        <FileCode size={16} className="text-amber-500" /> 
                        Markdown Manuscript
                        {!isPro && <Crown size={10} className="absolute right-3 text-amber-500 fill-amber-500" />}
                      </button>
                      <button onClick={() => exportManuscript('txt')} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all">
                        <FileText size={16} className="text-blue-500" /> Plain Text Archive
                      </button>
                      <button onClick={() => exportManuscript('json')} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all relative">
                        <FileJson size={16} className="text-emerald-500" /> 
                        Full World Bible (JSON)
                        {!isPro && <Crown size={10} className="absolute right-3 text-amber-500 fill-amber-500" />}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => saveContent(true)}
                className="px-5 py-2.5 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-700 transition-all shadow-amber-100 shadow-lg font-bold flex items-center gap-2"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save Draft
              </button>
            </div>
          </header>
        )}

        {isFocusMode && (
          <div className="fixed top-10 right-10 flex flex-col gap-4 z-50">
            {detectedEntities.map(entity => (
              <motion.div 
                key={entity.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-64 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  {entity.type === 'Character' ? <User size={12} className="text-amber-600" /> : <Book size={12} className="text-indigo-600" />}
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{entity.type}</span>
                </div>
                <h4 className="text-xs font-black text-slate-800 mb-2">{entity.name}</h4>
                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{entity.description}</p>
              </motion.div>
            ))}
          </div>
        )}

        {isFocusMode && (
          <div className="fixed bottom-10 right-10 flex gap-4 z-50">
             <div className="flex items-center bg-white/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-200 shadow-xl space-x-6 opacity-0 hover:opacity-100 transition-opacity">
               <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Text Size</span>
                 <div className="flex items-center gap-3">
                   <button onClick={() => setFontSize(f => Math.max(14, f - 2))} className="text-slate-400 hover:text-amber-600 font-bold">-</button>
                   <span className="text-[10px] font-bold w-4 text-center">{fontSize}</span>
                   <button onClick={() => setFontSize(f => Math.min(32, f + 2))} className="text-slate-400 hover:text-amber-600 font-bold">+</button>
                 </div>
               </div>
               <div className="h-6 w-px bg-slate-200" />
               <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Typing Mode</span>
                 <button 
                  onClick={() => setIsTypewriterMode(!isTypewriterMode)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                    isTypewriterMode ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-400"
                  )}
                 >
                   <Type size={12} className="inline mr-1" /> Typewriter
                 </button>
               </div>
               <div className="h-6 w-px bg-slate-200" />
               <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Spacing</span>
                 <div className="flex items-center gap-3">
                   <button onClick={() => setLineHeight(Math.max(1, lineHeight - 0.25))} className="text-slate-400 hover:text-amber-600 font-bold">-</button>
                   <span className="text-[10px] font-bold w-4 text-center">{lineHeight}</span>
                   <button onClick={() => setLineHeight(Math.min(3, lineHeight + 0.25))} className="text-slate-400 hover:text-amber-600 font-bold">+</button>
                 </div>
               </div>
             </div>
             <button 
               onClick={() => setIsFocusMode(false)}
               className="p-4 bg-slate-900 text-white rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
               title="Exit Zen Mode"
             >
               <Minimize2 size={24} />
             </button>
          </div>
        )}

        {/* AI Selection Toolbar */}
        <AnimatePresence>
          {selection && (
            <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-3">
              <AnimatePresence>
                {showStyleMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-800 rounded-[32px] p-2 shadow-2xl flex gap-2 overflow-hidden"
                  >
                    {STYLE_ALCHEMY.map((style) => (
                      <button
                        key={style.name}
                        onClick={() => {
                          applyAiPowerup(style.prompt);
                          setShowStyleMenu(false);
                        }}
                        className="px-4 py-3 hover:bg-white/10 rounded-2xl transition-all text-left flex flex-col min-w-[120px]"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-white mb-0.5">{style.name}</span>
                        <span className="text-[8px] text-slate-500 font-medium leading-tight">{style.desc}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="bg-slate-900 text-white p-2 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-800"
              >
                <span className="text-[9px] font-black uppercase tracking-widest px-4 text-slate-500 border-r border-slate-700 font-bold">Neural Tools</span>
                <button 
                  onClick={() => applyAiPowerup('Expand with vivid detail')} 
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2 relative"
                >
                  {!isPro && <Crown size={10} className="text-amber-500 fill-amber-500" />}
                  <Sparkles size={14} className="text-amber-400" /> Expand
                </button>
                
                <div className="h-4 w-px bg-slate-700" />

                <button 
                  onClick={() => setShowStyleMenu(!showStyleMenu)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 relative",
                    showStyleMenu ? "bg-amber-600 text-white shadow-lg" : "hover:bg-slate-800 text-amber-500"
                  )}
                >
                  {!isPro && <Crown size={10} className="text-amber-500 fill-amber-500" />}
                  <Palette size={14} /> Alchemy
                </button>

                <div className="h-4 w-px bg-slate-700" />

                <button 
                  onClick={() => applyAiPowerup('Rewrite in a more evocative tone')} 
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2 relative"
                >
                  {!isPro && <Crown size={10} className="text-amber-500 fill-amber-500" />}
                  <RotateCcw size={14} className="text-indigo-400" /> Rewrite
                </button>
                <button 
                  onClick={() => applyAiPowerup('Simplify the prose for clarity')} 
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2 relative"
                >
                  {!isPro && <Crown size={10} className="text-amber-500 fill-amber-500" />}
                  <Maximize2 size={14} className="text-emerald-400" /> Clarify
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Version History Panel */}
        <AnimatePresence>
          {showSnapshots && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 w-80 h-full bg-slate-50 border-l border-slate-200 z-50 shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-200 bg-white flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                  <History size={16} /> History
                </h3>
                <button onClick={() => setShowSnapshots(false)} className="text-slate-400 hover:text-amber-600"><Minimize2 size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <button 
                  onClick={takeSnapshot}
                  className="w-full py-4 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-amber-100 hover:bg-amber-700 transition-all mb-4"
                >
                  <Plus size={16} /> Save Version
                </button>
                
                {snapshots.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No versions saved yet.</p>
                  </div>
                ) : (
                  snapshots.map((snap: any) => (
                    <div key={snap.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm group">
                      <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">
                        {snap.createdAt?.toDate().toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-3 mb-4 leading-relaxed italic">
                        "{snap.content.slice(0, 100)}..."
                      </div>
                      <button 
                        onClick={() => {
                          if (window.confirm("Restore this version? This will overwrite your current draft.")) {
                            setContent(snap.content);
                          }
                        }}
                        className="w-full py-2 flex items-center justify-center gap-2 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 hover:text-amber-700 transition-all"
                      >
                        <RotateCcw size={12} /> Restore Version
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn(
          "flex-1 py-32 px-10 overflow-y-auto scrollbar-hide",
          isFocusMode ? "bg-slate-50" : "bg-white"
        )}>
          <div className={cn(
            "mx-auto transition-all duration-700", 
            isFullWidth ? "max-w-4xl" : "max-w-2xl",
            isFocusMode && "animate-in fade-in zoom-in duration-1000"
          )}>
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleContentChange}
              onMouseUp={handleSelection}
              onKeyUp={handleSelection}
              placeholder="The world is yours to scribe..."
              style={{ 
                fontSize: `${fontSize}px`, 
                lineHeight: lineHeight,
                marginTop: isTypewriterMode ? '35vh' : '0',
                marginBottom: isTypewriterMode ? '35vh' : '0'
              }}
              className={cn(
                "w-full min-h-[calc(100vh-20rem)] font-serif leading-[2] text-slate-800 bg-transparent resize-none focus:outline-none placeholder:text-slate-200 selection:bg-amber-100 selection:text-amber-900 transition-all",
                isFocusMode ? "text-slate-700" : "text-slate-800"
              )}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Floating AI Panel */}
        <AnimatePresence>
          {showAI && (
            <motion.div 
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="fixed top-24 right-10 w-80 bg-white shadow-2xl rounded-3xl border border-slate-100 overflow-hidden z-50 ring-1 ring-slate-200"
            >
              <div className="p-4 bg-amber-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Neural Assistant</span>
                </div>
                <button onClick={() => setShowAI(false)} className="hover:bg-amber-700 p-1 rounded-lg"><Minimize2 size={14} /></button>
              </div>
              <div className="p-6">
                <textarea 
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="How can I help with your prose today?"
                  className="w-full h-32 p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-amber-100 mb-6 resize-none font-medium text-slate-600"
                />
                <button 
                  onClick={handleAIAction}
                  disabled={aiLoading || !aiInput.trim()}
                  className="w-full bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl"
                >
                  {aiLoading ? 'Processing...' : 'Enhance Manuscript'}
                </button>
              </div>
              <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex flex-wrap gap-2">
                <PresetAiBtn onClick={() => setAiInput("Rewrite for deeper emotional impact.")} label="Add Emotion" />
                <PresetAiBtn onClick={() => setAiInput("Enhance sensory imagery and setting.")} label="Vivid Setting" />
                <PresetAiBtn onClick={() => setAiInput("Predict the next plot development.")} label="Narrative Flow" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </div>
  );
}

function PresetAiBtn({ label, onClick }: { label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="text-[10px] uppercase tracking-wider font-bold text-gray-400 border border-gray-100 px-2 py-1 rounded-lg hover:border-gray-300 hover:text-black transition-all"
    >
      {label}
    </button>
  );
}
