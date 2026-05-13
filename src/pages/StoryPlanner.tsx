import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../services/firebase';
import { Character, PlotPoint, TimelineEvent, Relationship } from '../types';
import { UserCircle, Map, Clock, Plus, Trash2, ChevronLeft, Layout, Sparkles, BookOpen, Maximize2, Minimize2, Wand2, Loader2, UserPlus, Share2, Heart, GripVertical, Users, Compass, Download, MessagesSquare, Send, Activity, History, Database, Zap, AlertTriangle, X } from 'lucide-react';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { cn } from '../lib/utils';
import { aiService } from '../services/aiService';
import { exportService } from '../services/exportService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';
import RelationshipGraph from '../components/RelationshipGraph';
import VisualTimeline from '../components/VisualTimeline';
import CharacterArcVisual from '../components/CharacterArcVisual';
import PresenceIndicator from '../components/PresenceIndicator';

import { useSubscription } from '../components/SubscriptionContext';
import PricingModal from '../components/PricingModal';
import { Crown } from 'lucide-react';

type Tab = 'Plot' | 'Characters' | 'Relations' | 'Timeline' | 'Arcs' | 'Lore' | 'Mirror';

export default function StoryPlanner() {
  const { storyId } = useParams();
  const { isPro } = useSubscription();
  const [showPricing, setShowPricing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Plot');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [plots, setPlots] = useState<PlotPoint[]>([]);
  const [timelines, setTimelines] = useState<TimelineEvent[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [lores, setLores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [aiPremise, setAiPremise] = useState('');
  const [aiGenre, setAiGenre] = useState('');
  const [aiTone, setAiTone] = useState('');
  const [showLoreAi, setShowLoreAi] = useState(false);
  const [loreAiPrompt, setLoreAiPrompt] = useState('');
  const [showCharacterAi, setShowCharacterAi] = useState(false);
  const [characterAiPrompt, setCharacterAiPrompt] = useState('');
  const [story, setStory] = useState<any>(null);
  const [timelineFilterId, setTimelineFilterId] = useState<string | null>(null);

  const [showTwistAi, setShowTwistAi] = useState(false);
  const [twists, setTwists] = useState<{ twist: string, setup: string, consequence: string }[]>([]);
  const [generatingTwist, setGeneratingTwist] = useState(false);

  useEffect(() => {
    if (!storyId || !auth.currentUser) return;

    const unsubStory = onSnapshot(doc(db, 'stories', storyId), (d) => {
      setStory(d.data());
    });

    // Fetch Characters
    const qChar = query(collection(db, 'characters'), where('storyId', '==', storyId));
    const unsubChar = onSnapshot(qChar, (s) => {
      setCharacters(s.docs.map(d => ({ id: d.id, ...d.data() })) as Character[]);
    });

    // Fetch Plots
    const qPlot = query(collection(db, 'plots'), where('storyId', '==', storyId));
    const unsubPlot = onSnapshot(qPlot, (s) => {
      setPlots(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a as any).order - (b as any).order) as PlotPoint[]);
    });

    // Fetch Timelines
    const qTime = query(collection(db, 'timelines'), where('storyId', '==', storyId));
    const unsubTime = onSnapshot(qTime, (s) => {
      setTimelines(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a as any).order - (b as any).order) as TimelineEvent[]);
    });

    // Fetch Relationships
    const qRel = query(collection(db, 'relationships'), where('storyId', '==', storyId));
    const unsubRel = onSnapshot(qRel, (s) => {
      setRelationships(s.docs.map(d => ({ id: d.id, ...d.data() })) as Relationship[]);
    });

    // Fetch Lore
    const qLore = query(collection(db, 'lores'), where('storyId', '==', storyId));
    const unsubLore = onSnapshot(qLore, (s) => {
      setLores(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    setLoading(false);
    return () => { unsubChar(); unsubPlot(); unsubTime(); unsubRel(); unsubLore(); };
  }, [storyId]);

  const addCharacter = async () => {
    if (!storyId || !auth.currentUser) return;
    const path = 'characters';
    try {
      await addDoc(collection(db, path), {
        name: 'New Character',
        role: 'Protagonist',
        age: '',
        backstory: '',
        personalityTraits: '',
        physicalDescription: '',
        relationships: '',
        description: 'Brief profile summary...',
        traits: [],
        arc: '',
        storyId,
        ownerId: auth.currentUser.uid
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const addPlotPoint = async () => {
    if (!storyId || !auth.currentUser) return;
    const path = 'plots';
    try {
      await addDoc(collection(db, path), {
        title: 'New Plot Point',
        description: 'What happens in this beat?',
        setting: '',
        charactersInvolved: '',
        characterIds: [],
        keyOutcomes: '',
        order: plots.length,
        storyId,
        ownerId: auth.currentUser.uid
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const handleGenerateTwists = async () => {
    if (!storyId || !auth.currentUser) return;
    setGeneratingTwist(true);
    setTwists([]);
    try {
      const context = `Title: ${story?.title || ''}. Premise: ${story?.premise || ''}`;
      const result = await aiService.generatePlotTwist(context, plots, characters);
      if (result) setTwists(result);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingTwist(false);
    }
  };

  const generateAiPlot = async () => {
    if (!storyId || !auth.currentUser || !aiPremise) return;
    setGenerating(true);
    try {
      const outline = await aiService.generatePlotOutline(aiPremise, aiGenre, aiTone);
      if (outline && Array.isArray(outline)) {
        for (const [index, beat] of outline.entries()) {
          await addDoc(collection(db, 'plots'), {
            title: beat.title,
            description: beat.description,
            setting: '',
            charactersInvolved: '',
            characterIds: [],
            keyOutcomes: '',
            order: plots.length + index,
            storyId,
            ownerId: auth.currentUser.uid
          });
        }
        setShowAiModal(false);
        setAiPremise('');
        setAiGenre('');
        setAiTone('');
      }
    } catch (e) {
      console.error("AI Plot Gen Error:", e);
    } finally {
      setGenerating(false);
    }
  };

  const addTimelineEvent = async () => {
    if (!storyId || !auth.currentUser) return;
    const path = 'timelines';
    try {
      await addDoc(collection(db, path), {
        event: 'Key historical event or milestone...',
        date: 'New Era',
        characterIds: [],
        order: timelines.length,
        storyId,
        ownerId: auth.currentUser.uid
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const addRelationship = async () => {
    if (!storyId || !auth.currentUser || characters.length < 2) return;
    const path = 'relationships';
    try {
      await addDoc(collection(db, path), {
        sourceId: characters[0].id,
        targetId: characters[1].id,
        type: 'Friend',
        strength: 3,
        notes: '',
        storyId,
        ownerId: auth.currentUser.uid
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const addLore = async () => {
    if (!storyId || !auth.currentUser) return;
    const path = 'lores';
    try {
      await addDoc(collection(db, path), {
        title: 'New Lore Entry',
        content: 'Record myths, locations, or artifacts here...',
        type: 'Setting',
        storyId,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const deleteItem = async (col: string, id: string) => {
    try {
      await deleteDoc(doc(db, col, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${col}/${id}`);
    }
  };

  const updateItem = async (col: string, id: string, data: any) => {
    try {
      await updateDoc(doc(db, col, id), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${col}/${id}`);
    }
  };

  const handleReorder = async (newOrder: PlotPoint[]) => {
    setPlots(newOrder);
    // Persist order to Firestore
    newOrder.forEach(async (p, i) => {
      if (p.order !== i) {
        await updateDoc(doc(db, 'plots', p.id), { order: i });
      }
    });
  };

  const handleTimelineReorder = async (newOrder: TimelineEvent[]) => {
    setTimelines(newOrder);
    newOrder.forEach(async (t, i) => {
      if (t.order !== i) {
        await updateDoc(doc(db, 'timelines', t.id), { order: i });
      }
    });
  };

  const exportCodex = () => {
    let content = "# Story Codex\n\n";
    lores.forEach(l => {
      content += `## ${l.title} (${l.type})\n${l.content}\n\n`;
    });
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, "story_codex.md");
  };

  const handleLoreAiGenerate = async () => {
    if (!storyId || !loreAiPrompt.trim()) return;
    setGenerating(true);
    try {
      const context = `Title: ${story?.title || ''}. Premise: ${story?.premise || ''}`;
      const entry = await aiService.generateLore(context, loreAiPrompt);
      if (entry) {
        await addDoc(collection(db, 'lores'), {
          ...entry,
          storyId,
          ownerId: auth.currentUser?.uid,
          createdAt: serverTimestamp()
        });
        setShowLoreAi(false);
        setLoreAiPrompt('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleCharacterAiGenerate = async () => {
    if (!storyId || !characterAiPrompt.trim()) return;
    setGenerating(true);
    try {
      const context = `Title: ${story?.title || ''}. Premise: ${story?.premise || ''}. Genre: ${story?.genre || ''}`;
      const profile = await aiService.generateCharacterProfile(context, characterAiPrompt);
      if (profile) {
        await addDoc(collection(db, 'characters'), {
          ...profile,
          storyId,
          ownerId: auth.currentUser?.uid,
          createdAt: serverTimestamp()
        });
        setShowCharacterAi(false);
        setCharacterAiPrompt('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = (format: 'md' | 'json' | 'txt') => {
    if (!story) return;
    if (!isPro && (format === 'md' || format === 'json')) {
      setShowPricing(true);
      return;
    }
    const storyObj = { ...story, id: storyId };
    switch (format) {
      case 'md': exportService.exportAsMarkdown(storyObj as any, characters, lores); break;
      case 'json': exportService.exportAsJSON(storyObj as any, characters, plots, timelines, lores); break;
      case 'txt': exportService.exportAsPlain(storyObj as any, characters, plots); break;
    }
    setShowExport(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 bg-white min-h-[calc(100vh-4rem)] rounded-[40px] shadow-sm border border-slate-100 my-8">
      <header className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <div className="flex items-center gap-6">
          <Link to={`/story/${storyId}`} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md text-slate-400 hover:text-amber-600 transition-all group">
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="font-sans text-3xl font-black tracking-tighter text-slate-800">Architect</h1>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em]">Weave Your World. Master Your Plot.</p>
          </div>
        </div>

        <div className="flex p-1.5 bg-slate-100/50 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
          <TabBtn active={activeTab === 'Plot'} onClick={() => setActiveTab('Plot')} icon={<Layout size={18} />} label="Outline" />
          <TabBtn active={activeTab === 'Characters'} onClick={() => setActiveTab('Characters')} icon={<UserCircle size={18} />} label="Cast" />
          <TabBtn active={activeTab === 'Arcs'} onClick={() => setActiveTab('Arcs')} icon={<BookOpen size={18} />} label="Arcs" />
          <TabBtn active={activeTab === 'Relations'} onClick={() => setActiveTab('Relations')} icon={<Share2 size={18} />} label="Relations" />
          <TabBtn active={activeTab === 'Timeline'} onClick={() => setActiveTab('Timeline')} icon={<Clock size={18} />} label="Timeline" />
          <TabBtn active={activeTab === 'Lore'} onClick={() => setActiveTab('Lore')} icon={<Compass size={18} />} label="Codex" />
          <TabBtn active={activeTab === 'Mirror'} onClick={() => setActiveTab('Mirror')} icon={<MessagesSquare size={18} />} label="Mirror" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          {isPro && <PresenceIndicator storyId={storyId!} />}
          <div className="relative">
            <button 
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-100 px-6 py-4 rounded-3xl hover:bg-slate-50 transition-all font-bold"
            >
              <Download size={18} /> Export Project
            </button>
            <AnimatePresence>
              {showExport && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-slate-50 p-2 z-50 overflow-hidden"
                >
                  <button onClick={() => handleExport('md')} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl text-left transition-all group relative">
                    <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                      <BookOpen size={16} className="text-amber-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-800">Manuscript</div>
                        {!isPro && <Crown size={10} className="text-amber-500 fill-amber-500" />}
                      </div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Markdown Format</div>
                    </div>
                  </button>
                  <button onClick={() => handleExport('txt')} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl text-left transition-all group">
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <Layout size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-800">Plot Summary</div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Plain Text File</div>
                    </div>
                  </button>
                  <button onClick={() => handleExport('json')} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl text-left transition-all group relative">
                    <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                      <Database size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-800">World Bible</div>
                        {!isPro && <Crown size={10} className="text-amber-500 fill-amber-500" />}
                      </div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">JSON Raw Data</div>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link to={`/story/${storyId}/editor`} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 px-10 py-5 rounded-3xl hover:bg-black transition-all shadow-xl shadow-slate-100 font-bold">
            <BookOpen size={20} /> Write Manuscript
          </Link>
        </div>
      </header>

      <main className="px-2">
        <AnimatePresence mode="wait">
          {activeTab === 'Mirror' && (
            <motion.div key="mirror" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="mb-12 text-center max-w-2xl mx-auto">
                <h2 className="font-sans text-3xl font-black text-slate-800 tracking-tight mb-4">The Soul Mirror</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Step into the minds of your creations. Interview them to discover their secrets, test their dialogue, or find their hidden motivations.
                </p>
              </div>
              <CharacterMirror characters={characters} />
            </motion.div>
          )}

          {activeTab === 'Lore' && (
            <motion.div key="lore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="font-sans text-xl font-bold text-slate-800 border-l-4 border-amber-600 pl-4 uppercase tracking-widest text-sm">The Story Codex</h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-5 mt-1">Archive of Myths & Locations</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={exportCodex}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-100 px-6 py-3 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Download size={16} /> Export
                  </button>
                  <button 
                    onClick={() => {
                      if (!isPro) setShowPricing(true);
                      else setShowLoreAi(true);
                    }}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-white border border-amber-100 px-6 py-3 rounded-xl hover:bg-amber-50 transition-all shadow-sm"
                  >
                    {!isPro && <Crown size={14} className="fill-amber-500" />}
                    <Wand2 size={16} /> AI Scribe
                  </button>
                  <button onClick={addLore} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-amber-600 px-6 py-3 rounded-xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-100">
                    <Plus size={16} /> New Entry
                  </button>
                </div>
              </div>

              {showLoreAi && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[40px] shadow-2xl p-10 max-w-lg w-full border border-amber-50 overflow-hidden relative"
                  >
                    {generating && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                        <Loader2 size={40} className="text-amber-600 animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consulting the Grimoire...</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-amber-600 rounded-2xl text-white">
                        <BookOpen size={24} />
                      </div>
                      <h3 className="font-sans text-2xl font-bold text-slate-800 tracking-tight">The AI Grimoire</h3>
                    </div>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                      What facet of your world shall we manifest? Describe a myth, a lost ritual, a holy site, or a legendary artifact.
                    </p>
                    <textarea 
                      value={loreAiPrompt}
                      onChange={(e) => setLoreAiPrompt(e.target.value)}
                      placeholder="e.g., A floating citadel made of glass and sorrow..."
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl text-sm font-medium focus:outline-none focus:border-amber-200 focus:bg-white transition-all h-32 resize-none mb-6"
                    />
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowLoreAi(false)}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                      >
                        Nevermind
                      </button>
                      <button 
                        onClick={handleLoreAiGenerate}
                        disabled={!loreAiPrompt.trim()}
                        className="flex-1 py-4 px-6 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-700 transition-all flex items-center justify-center gap-2"
                      >
                         Manifest Lore
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {lores.length === 0 ? <div className="col-span-full"><EmptyState icon={<Compass size={40} />} text="The archives are incomplete." /></div> : (
                  lores.map(lore => (
                    <LoreCard 
                      key={lore.id} 
                      lore={lore} 
                      onUpdate={(d) => updateItem('lores', lore.id, d)} 
                      onDelete={() => deleteItem('lores', lore.id)} 
                      story={story}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'Plot' && (
            <motion.div key="plot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-sans text-xl font-bold text-slate-800 border-l-4 border-amber-600 pl-4 uppercase tracking-widest text-sm">Manuscript Beats</h2>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      if (!isPro) setShowPricing(true);
                      else setShowAiModal(true);
                    }}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-white border border-amber-100 px-6 py-3 rounded-xl hover:bg-amber-50 transition-all shadow-sm"
                  >
                    {!isPro && <Crown size={14} className="fill-amber-500" />}
                    <Wand2 size={16} /> AI Generate
                  </button>
                  <button 
                    onClick={() => {
                      if (!isPro) setShowPricing(true);
                      else {
                        setShowTwistAi(true);
                        handleGenerateTwists();
                      }
                    }}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-white border border-indigo-100 px-6 py-3 rounded-xl hover:bg-indigo-50 transition-all shadow-sm"
                  >
                    {!isPro && <Crown size={14} className="fill-amber-500" />}
                    <Zap size={16} /> Plot Twist
                  </button>
                  <button onClick={addPlotPoint} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-amber-600 px-6 py-3 rounded-xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-100">
                    <Plus size={16} /> Add Beat
                  </button>
                </div>
              </div>

              {showTwistAi && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[40px] shadow-2xl p-10 max-w-2xl w-full border border-indigo-50 overflow-hidden relative"
                  >
                    {generatingTwist && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                        <Loader2 size={40} className="text-indigo-600 animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consulting the Chaos Theory...</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                          <Zap size={24} />
                        </div>
                        <div>
                          <h3 className="font-sans text-2xl font-bold text-slate-800 tracking-tight">The Twist Generator</h3>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Subverting the Narrative Arc</p>
                        </div>
                      </div>
                      <button onClick={() => setShowTwistAi(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-all">
                        <Trash2 size={24} className="rotate-45" />
                      </button>
                    </div>

                    {twists.length > 0 ? (
                      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide">
                        {twists.map((twist, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0, transition: { delay: i * 0.1 } }}
                            className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 group hover:border-indigo-200 transition-all"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle size={14} className="text-amber-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Possibility #{i+1}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-800 mb-4 tracking-tight leading-tight">{twist.twist}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">The Setup</h5>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">{twist.setup}</p>
                              </div>
                              <div>
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">The Fallout</h5>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">{twist.consequence}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : !generatingTwist && (
                      <div className="text-center py-10">
                        <p className="text-slate-400 text-sm">Failed to generate twists. Try adding more plot points first!</p>
                      </div>
                    )}

                    <div className="mt-10 flex gap-4">
                      <button 
                        onClick={handleGenerateTwists}
                        disabled={generatingTwist}
                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Wand2 size={16} /> Regenerate Chaos
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {showAiModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[40px] shadow-2xl p-10 max-w-lg w-full border border-amber-50"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-amber-600 rounded-2xl text-white">
                        <Wand2 size={24} />
                      </div>
                      <h3 className="font-sans text-2xl font-bold text-slate-800 tracking-tight">AI Plot Architect</h3>
                    </div>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                      Describe your story's core premise or conflict, and our AI will architect a 5-point dramatic arc for you.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Genre</label>
                        <input 
                          value={aiGenre}
                          onChange={(e) => setAiGenre(e.target.value)}
                          placeholder="e.g., Noir Thriller"
                          className="w-full text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Tone</label>
                        <input 
                          value={aiTone}
                          onChange={(e) => setAiTone(e.target.value)}
                          placeholder="e.g., Gritty, Cynical"
                          className="w-full text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 outline-none"
                        />
                      </div>
                    </div>

                    <div className="mb-8">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Premise</label>
                      <textarea 
                        value={aiPremise}
                        onChange={(e) => setAiPremise(e.target.value)}
                        placeholder="e.g., A disgraced detective discovers a conspiracy involving the city's mayor and a secret society."
                        className="w-full text-sm font-medium text-slate-600 focus:outline-none bg-slate-50 p-6 rounded-[24px] border border-transparent focus:border-amber-100 transition-all resize-none"
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowAiModal(false)}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={generateAiPlot}
                        disabled={generating || !aiPremise}
                        className="flex-2 py-4 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-100 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {generating ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> Architecting...
                          </>
                        ) : 'Generate Outline'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              <Reorder.Group axis="y" values={plots} onReorder={handleReorder} className="grid gap-6">
                {plots.length === 0 ? <EmptyState icon={<Layout size={40} />} text="Your plot is a blank canvas." /> : (
                  plots.map((plot) => (
                    <Reorder.Item 
                      key={plot.id} 
                      value={plot}
                    >
                      <PlotItem 
                        plot={plot} 
                        onUpdate={(d) => updateItem('plots', plot.id, d)} 
                        onDelete={() => deleteItem('plots', plot.id)}
                        allCharacters={characters}
                      />
                    </Reorder.Item>
                  ))
                )}
              </Reorder.Group>
            </motion.div>
          )}

          {activeTab === 'Characters' && (
            <motion.div key="chars" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="font-sans text-3xl font-black text-slate-800 tracking-tight mb-2">The Ensemble</h2>
                  <p className="text-slate-500 text-sm font-medium">Breathe life into the souls that populate your world.</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      if (!isPro) setShowPricing(true);
                      else setShowCharacterAi(true);
                    }}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-white border border-amber-100 px-6 py-4 rounded-2xl hover:bg-amber-50 transition-all shadow-sm"
                  >
                    {!isPro && <Crown size={14} className="fill-amber-500" />}
                    <Wand2 size={18} /> AI Scribe
                  </button>
                  <button onClick={addCharacter} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-amber-600 px-8 py-4 rounded-2xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-100">
                    <Plus size={18} /> New Profile
                  </button>
                </div>
              </div>

              {showCharacterAi && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[40px] shadow-2xl p-10 max-w-lg w-full border border-amber-50 overflow-hidden relative"
                  >
                    {generating && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                        <Loader2 size={40} className="text-amber-600 animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Summoning a Soul...</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-amber-600 rounded-2xl text-white">
                        <UserPlus size={24} />
                      </div>
                      <h3 className="font-sans text-2xl font-bold text-slate-800 tracking-tight">AI Character Forge</h3>
                    </div>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                      Give us a spark of a concept. A forgotten knight, a street urchin with a secret, or a celestial being lost in a mortal city.
                    </p>
                    <textarea 
                      value={characterAiPrompt}
                      onChange={(e) => setCharacterAiPrompt(e.target.value)}
                      placeholder="e.g., A cynical bounty hunter who secretly loves poetry..."
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl text-sm font-medium focus:outline-none focus:border-amber-200 focus:bg-white transition-all h-32 resize-none mb-6"
                    />
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowCharacterAi(false)}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleCharacterAiGenerate}
                        disabled={!characterAiPrompt.trim()}
                        className="flex-1 py-4 px-6 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-700 transition-all flex items-center justify-center gap-2"
                      >
                         Forge Soul
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {characters.length === 0 ? <div className="col-span-full"><EmptyState icon={<UserCircle size={40} />} text="A story needs a soul." /></div> : (
                  characters.map(char => (
                    <CharacterCard key={char.id} char={char} onUpdate={(d) => updateItem('characters', char.id, d)} onDelete={() => deleteItem('characters', char.id)} />
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'Relations' && (
            <motion.div key="rels" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="font-sans text-3xl font-black text-slate-800 tracking-tight mb-2">The Fate Weaver</h2>
                  <p className="text-slate-500 text-sm font-medium">Map the invisible threads connecting your characters' souls.</p>
                </div>
                <button 
                  onClick={addRelationship} 
                  disabled={characters.length < 2}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-amber-600 px-8 py-4 rounded-2xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-100 disabled:opacity-50"
                >
                  <Plus size={18} /> New Thread
                </button>
              </div>
              
              {characters.length < 2 ? (
                <div className="bg-amber-50 border border-amber-100 p-8 rounded-[40px] flex items-center gap-6 text-amber-700">
                  <div className="p-4 bg-white rounded-2xl shadow-sm">
                    <Users size={32} />
                  </div>
                  <p className="text-sm font-bold">You need at least two souls in your cast to begin weaving fate.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2">
                    <RelationshipGraph characters={characters} relationships={relationships} />
                    
                    <div className="mt-8 flex gap-6">
                      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex-1">
                        <div className="flex items-center gap-2 mb-4">
                          <Activity size={14} className="text-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cast Density</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800">{characters.length} <span className="text-xs text-slate-300 uppercase tracking-widest ml-1">Souls</span></div>
                      </div>
                      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex-1">
                        <div className="flex items-center gap-2 mb-4">
                          <Share2 size={14} className="text-indigo-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thread Count</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800">{relationships.length} <span className="text-xs text-slate-300 uppercase tracking-widest ml-1">Links</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1 space-y-6 max-h-[800px] overflow-y-auto pr-4 scrollbar-hide border-l border-slate-50 pl-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 sticky top-0 bg-white py-2 z-10">Thread Registry</h3>
                    {relationships.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                        <Share2 size={40} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No threads woven yet.</p>
                      </div>
                    ) : (
                      relationships.map(rel => (
                        <RelationshipCard 
                          key={rel.id} 
                          rel={rel} 
                          characters={characters} 
                          onUpdate={(d) => updateItem('relationships', rel.id, d)} 
                          onDelete={() => deleteItem('relationships', rel.id)} 
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'Timeline' && (
            <motion.div key="time" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="font-sans text-3xl font-black text-slate-800 tracking-tight mb-2">Echoes of Eternity</h2>
                  <p className="text-slate-500 text-sm font-medium">The chronological heartbeat of your universe.</p>
                </div>
                <div className="flex gap-4">
                  {timelineFilterId && (
                    <button 
                      onClick={() => setTimelineFilterId(null)}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white border border-slate-100 px-6 py-4 rounded-2xl hover:bg-slate-50 transition-all font-bold"
                    >
                      Clear Filter
                    </button>
                  )}
                  <button onClick={addTimelineEvent} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-amber-600 px-8 py-4 rounded-2xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-100 font-bold">
                    <Plus size={18} /> New Milestone
                  </button>
                </div>
              </div>

              {/* Visual Timeline Component */}
              <VisualTimeline events={timelines} characters={characters} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                  <Reorder.Group 
                    axis="y" 
                    values={timelines} 
                    onReorder={timelineFilterId ? () => {} : handleTimelineReorder} 
                    className="space-y-6 border-l border-slate-100 ml-6 pl-10 relative"
                  >
                    {timelines.filter(t => !timelineFilterId || t.characterIds?.includes(timelineFilterId)).length === 0 ? (
                      <EmptyState icon={<Clock size={40} />} text={timelineFilterId ? "This character has no records in history." : "The annals of history are empty."} />
                    ) : (
                      timelines
                        .filter(t => !timelineFilterId || t.characterIds?.includes(timelineFilterId))
                        .map(time => (
                          <Reorder.Item 
                            key={time.id} 
                            value={time}
                            drag={!timelineFilterId}
                          >
                            <TimelineItem 
                              time={time} 
                              onUpdate={(d) => updateItem('timelines', time.id, d)} 
                              onDelete={() => deleteItem('timelines', time.id)} 
                              allCharacters={characters}
                            />
                          </Reorder.Item>
                        ))
                    )}
                  </Reorder.Group>
                </div>

                <div className="lg:col-span-1 space-y-8">
                  <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-6 flex items-center gap-2">
                      <History size={16} /> World Pulse
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Epoch Count</span>
                        <div className="text-2xl font-black">{timelines.length}</div>
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Active Souls</span>
                        <div className="text-2xl font-black">{characters.length}</div>
                      </div>
                      <div className="pt-6 border-t border-slate-800">
                        <p className="text-[10px] text-slate-400 leading-relaxed italic">
                          "History is a set of lies agreed upon. Scribble your truths wisely."
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Character Path Tracking */}
                  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                      <UserCircle size={16} /> Soul Navigation
                    </h3>
                    <div className="space-y-4">
                      {characters.map(char => {
                        const participationCount = timelines.filter(t => t.characterIds?.includes(char.id)).length;
                        const isActiveFilter = timelineFilterId === char.id;
                        return (
                          <button 
                            key={char.id} 
                            onClick={() => setTimelineFilterId(isActiveFilter ? null : char.id)}
                            className={cn(
                              "w-full flex items-center justify-between group p-2 rounded-xl transition-all",
                              isActiveFilter ? "bg-amber-50" : "hover:bg-slate-50"
                            )}
                          >
                            <span className={cn(
                              "text-xs font-bold transition-colors",
                              isActiveFilter ? "text-amber-600" : "text-slate-600 group-hover:text-amber-600"
                            )}>
                              {char.name}
                            </span>
                            <div className="flex items-center gap-2 text-right">
                              <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all", isActiveFilter ? "bg-amber-600" : "bg-amber-400")}
                                  style={{ width: `${(participationCount / Math.max(timelines.length, 1)) * 100}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-black text-slate-400 w-4">{participationCount}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Arcs' && (
            <motion.div key="arcs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="mb-12">
                <h2 className="font-sans text-3xl font-black text-slate-800 tracking-tight mb-2">The Arc of Soul</h2>
                <p className="text-slate-500 text-sm font-medium">Visualize how each character evolves through the plot beats they participate in.</p>
              </div>

              {/* Graphical Overview */}
              <div className="mb-12 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" /> Cast Presence Chart
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={plots.map((p, i) => ({
                      name: p.title,
                      index: i + 1,
                      ...characters.reduce((acc, char) => ({
                        ...acc,
                        [char.name]: p.characterIds?.includes(char.id) ? (p.impact || 3) : 0
                      }), {})
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="index" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        cursor={{ stroke: '#f59e0b', strokeWidth: 2 }}
                      />
                      {characters.map((char, i) => (
                        <Area 
                          key={char.id} 
                          type="monotone" 
                          dataKey={char.name} 
                          stackId="1"
                          stroke={['#f59e0b', '#10b981', '#6366f1', '#f43f5e', '#8b5cf6'][i % 5]} 
                          fill={['#fde68a', '#6ee7b7', '#a5b4fc', '#fda4af', '#c4b5fd'][i % 5]} 
                          fillOpacity={0.4}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-12">
                {characters.length === 0 ? (
                  <EmptyState icon={<UserCircle size={40} />} text="No souls to track." />
                ) : (
                  characters.map(char => (
                    <CharacterArcVisual 
                      key={char.id} 
                      character={char} 
                      plots={plots} 
                      timelines={timelines}
                      allCharacters={characters}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[32px] text-slate-300">
      <div className="mb-4">{icon}</div>
      <p className="font-sans text-xs font-bold uppercase tracking-widest">{text}</p>
    </div>
  );
}

function CharacterMirror({ characters }: { characters: Character[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string, text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedChar = characters.find(c => c.id === selectedId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !selectedChar || isTyping) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await aiService.chatWithCharacter(selectedChar, input, messages);
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[600px]">
      {/* Sidebar: Character Selector */}
      <div className="lg:col-span-1 space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-4">Select Soul</h3>
        {characters.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">No characters yet.</div>
        ) : (
          characters.map(char => (
            <button 
              key={char.id}
              onClick={() => {
                setSelectedId(char.id);
                setMessages([]);
              }}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                selectedId === char.id 
                  ? "bg-amber-600 border-amber-600 text-white shadow-xl shadow-amber-100" 
                  : "bg-white border-slate-100 text-slate-600 hover:border-amber-200"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", selectedId === char.id ? "bg-amber-500" : "bg-slate-50")}>
                <UserCircle size={20} />
              </div>
              <div>
                <div className="text-xs font-black truncate">{char.name}</div>
                <div className={cn("text-[8px] font-bold uppercase tracking-widest", selectedId === char.id ? "text-amber-200" : "text-amber-500")}>{char.role}</div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Main: Chat Interface */}
      <div className="lg:col-span-3 bg-slate-50 rounded-[40px] border border-slate-100 overflow-hidden flex flex-col shadow-inner">
        {!selectedChar ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12">
            <MessagesSquare size={48} className="mb-6 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center">Choose a character to begin the interview</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white">
                  <UserCircle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">{selectedChar.name}</h4>
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Interview Mode</p>
                </div>
              </div>
              <button 
                onClick={() => setMessages([])}
                className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-all"
              >
                Clear History
              </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              {messages.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-xs italic text-slate-400">Silence fills the room. Ask a question to break the ice.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex group",
                    m.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[80%] p-5 rounded-2xl text-sm leading-relaxed",
                    m.role === 'user' 
                      ? "bg-slate-900 text-white rounded-tr-none shadow-xl" 
                      : "bg-white text-slate-700 rounded-tl-none border border-slate-200 shadow-sm"
                  )}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-200 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-100">
              <div className="relative">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Question ${selectedChar.name}...`}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-6 pr-14 text-sm font-medium focus:outline-none focus:border-amber-200 focus:bg-white transition-all shadow-inner"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 p-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center mt-4">
                The mirror reflects the character based on your profile details.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={cn(
      "flex items-center gap-3 px-8 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-widest",
      active ? "bg-white shadow-xl shadow-slate-200/50 text-amber-600 transform scale-105" : "text-slate-400 hover:text-slate-600"
    )}>
      {icon} {label}
    </button>
  );
}

function RelationshipCard({ rel, characters, onUpdate, onDelete }: { rel: Relationship, characters: Character[], onUpdate: (d: any) => void, onDelete: () => void }) {
  const source = characters.find(c => c.id === rel.sourceId);
  const target = characters.find(c => c.id === rel.targetId);

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm group hover:shadow-2xl hover:shadow-amber-100 hover:border-amber-200 transition-all duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col items-center gap-1 group/char">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover/char:bg-amber-100 group-hover/char:text-amber-600 transition-all">
              <UserCircle size={24} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">{source?.name || 'Deleted Char'}</span>
          </div>
          
          <div className="flex-1 flex flex-col items-center gap-4">
            <div className="h-1.5 w-full bg-slate-100 rounded-full relative overflow-hidden">
              <div 
                className="absolute inset-0 bg-amber-400 transition-all duration-500" 
                style={{ width: `${(rel.strength / 5) * 100}%` }}
              />
            </div>
            
            <div className="w-full space-y-2">
              <input 
                value={rel.type}
                onChange={(e) => onUpdate({ type: e.target.value })}
                className="text-[10px] font-black uppercase tracking-widest text-center text-amber-600 focus:outline-none bg-transparent w-full"
                placeholder="Bond Type..."
              />
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest text-slate-300">
                  <span>Weak</span>
                  <span>Unbreakable</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={rel.strength}
                  onChange={(e) => onUpdate({ strength: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 group/char">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover/char:bg-amber-100 group-hover/char:text-amber-600 transition-all">
              <UserCircle size={24} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">{target?.name || 'Deleted Char'}</span>
          </div>
        </div>
        <button onClick={onDelete} className="ml-6 p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Source Character</label>
          <select 
            value={rel.sourceId}
            onChange={(e) => onUpdate({ sourceId: e.target.value })}
            className="w-full text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 outline-none appearance-none"
          >
            {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Target Character</label>
          <select 
            value={rel.targetId}
            onChange={(e) => onUpdate({ targetId: e.target.value })}
            className="w-full text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 outline-none appearance-none"
          >
            {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Dynamic Notes</label>
        <textarea 
          value={rel.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          className="w-full text-xs font-medium text-slate-500 bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 outline-none resize-none leading-relaxed"
          rows={2}
          placeholder="How does this relationship evolve?"
        />
      </div>
    </div>
  );
}

function PlotItem({ plot, onUpdate, onDelete, allCharacters }: { plot: PlotPoint, onUpdate: (d: any) => void, onDelete: () => void, allCharacters: Character[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAIExpanding, setIsAIExpanding] = useState(false);

  const toggleCharacter = (charId: string) => {
    const currentIds = plot.characterIds || [];
    if (currentIds.includes(charId)) {
      onUpdate({ characterIds: currentIds.filter(id => id !== charId) });
    } else {
      onUpdate({ characterIds: [...currentIds, charId] });
    }
  };

  const handleExpand = async () => {
    setIsAIExpanding(true);
    try {
      const expansion = await aiService.expandPlotPoint(
        plot.title, 
        plot.description, 
        plot.keyOutcomes || ''
      );
      if (expansion) {
        onUpdate({
          description: expansion.expandedDescription,
          keyOutcomes: expansion.expandedOutcomes
        });
      }
    } catch (e) {
      console.error("Failed to expand plot point:", e);
    } finally {
      setIsAIExpanding(false);
    }
  };

  return (
    <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:bg-white hover:border-amber-100 transition-all group flex gap-4">
      <div className="mt-1.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-amber-400 p-1">
        <GripVertical size={20} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <input 
            value={plot.title} 
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="font-sans text-xl font-bold tracking-tight text-slate-800 focus:outline-none bg-transparent w-full"
            placeholder="Plot Beat Title"
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExpand}
            disabled={isAIExpanding}
            className={cn(
              "p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
              isAIExpanding && "opacity-50 animate-pulse"
            )}
            title="Expand with AI"
          >
            {isAIExpanding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={18} />}
            <span className="hidden group-hover:inline">Expand</span>
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button onClick={onDelete} className="p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 rounded-lg">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 py-3 border-y border-slate-50">
          <div className="w-full flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Users size={12} /> Key Participants
              </span>
              <select 
                className="text-[9px] font-bold text-amber-600 bg-amber-50 border-none outline-none rounded-lg px-2 py-1 cursor-pointer"
                onChange={(e) => {
                  if (e.target.value) {
                    toggleCharacter(e.target.value);
                    e.target.value = '';
                  }
                }}
                value=""
              >
                <option value="" disabled>+ Add...</option>
                {allCharacters.filter(c => !plot.characterIds?.includes(c.id)).map(char => (
                  <option key={char.id} value={char.id}>{char.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Beat Type</label>
                      <select 
                        value={plot.momentType || 'Shift'}
                        onChange={(e) => onUpdate({ momentType: e.target.value })}
                        className="text-[9px] font-bold text-amber-600 bg-amber-50 border-none outline-none rounded-lg px-2 py-1"
                      >
                        <option value="Conflict">Conflict</option>
                        <option value="Decision">Decision</option>
                        <option value="Shift">Shift</option>
                        <option value="Climax">Climax</option>
                        <option value="Resolution">Resolution</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Impact</label>
                       <input 
                         type="range"
                         min="1"
                         max="5"
                         step="1"
                         value={plot.impact || 3}
                         onChange={(e) => onUpdate({ impact: parseInt(e.target.value) })}
                         className="w-16 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                       />
                       <span className="text-[8px] font-bold text-amber-600">{plot.impact || 3}</span>
                    </div>
                  </div>
          </div>
          <div className="flex flex-wrap gap-2">
          {allCharacters.filter(c => plot.characterIds?.includes(c.id)).map(char => {
            return (
              <div 
                key={char.id}
                className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-1 bg-amber-50 border-amber-200 text-amber-700 shadow-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {char.name}
                <button 
                  onClick={() => toggleCharacter(char.id)}
                  className="ml-1 text-amber-400 hover:text-amber-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Core Description</label>
          <textarea 
            value={plot.description} 
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
            className="w-full text-sm font-medium text-slate-500 focus:outline-none bg-transparent resize-none leading-relaxed"
            placeholder="Detailed beat description..."
          />
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100 mt-4">
            <div className="lg:col-span-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Setting</label>
              <textarea 
                value={plot.setting || ''} 
                onChange={(e) => onUpdate({ setting: e.target.value })}
                rows={2}
                className="w-full text-xs font-medium text-slate-600 focus:outline-none bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 transition-all resize-none"
                placeholder="Where does this take place?"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Narrative Role Breakdown</label>
              <textarea 
                value={plot.charactersInvolved || ''} 
                onChange={(e) => onUpdate({ charactersInvolved: e.target.value })}
                rows={3}
                className="w-full text-xs font-medium text-slate-600 focus:outline-none bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 transition-all resize-none"
                placeholder="Specific character actions or development for this beat..."
              />
            </div>
            <div className="lg:col-span-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Outcomes & Consequences</label>
              <textarea 
                value={plot.keyOutcomes || ''} 
                onChange={(e) => onUpdate({ keyOutcomes: e.target.value })}
                rows={2}
                className="w-full text-xs font-medium text-slate-600 focus:outline-none bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 transition-all resize-none"
                placeholder="What ripples does this beat create?"
              />
            </div>
          </div>
        )}
      </div>

      {!isExpanded && (
        <div className="mt-6 flex justify-between items-center">
          <button 
            onClick={() => setIsExpanded(true)}
            className="text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-700 transition-colors flex items-center gap-1"
          >
            View Details <Maximize2 size={12} />
          </button>
          
          {plot.characterIds && plot.characterIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center justify-end max-w-[50%]">
              {plot.characterIds.map(id => {
                const char = allCharacters.find(c => c.id === id);
                if (!char) return null;
                return (
                  <div key={id} className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg" title={char.name}>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[8px] font-black uppercase tracking-tight text-amber-700">{char.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function CharacterCard({ char, onUpdate, onDelete }: { char: Character, onUpdate: (d: any) => void, onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn(
      "bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col group hover:shadow-2xl hover:shadow-amber-100 hover:border-amber-200 transition-all duration-300",
      isExpanded ? "md:col-span-2 lg:col-span-3" : ""
    )}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 group-hover:bg-amber-600 group-hover:text-white transition-all transform group-hover:rotate-6">
            <UserCircle size={40} />
          </div>
          <div>
            <input 
              value={char.name} 
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="font-sans text-2xl font-bold tracking-tight text-slate-800 focus:outline-none bg-transparent w-full"
              placeholder="Full Name"
            />
            <input 
              value={char.role} 
              onChange={(e) => onUpdate({ role: e.target.value })}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 focus:outline-none bg-transparent w-full"
              placeholder="Story Role"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
            title={isExpanded ? "Collapse" : "Expand Profile"}
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button onClick={onDelete} className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className={cn("grid gap-6 transition-all", isExpanded ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Age</label>
            <input 
              value={char.age || ''} 
              onChange={(e) => onUpdate({ age: e.target.value })}
              className="w-full text-sm font-medium text-slate-600 focus:outline-none bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 transition-all"
              placeholder="N/A"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Character Arc</label>
            <textarea 
              value={char.arc || ''} 
              onChange={(e) => onUpdate({ arc: e.target.value })}
              className="w-full text-sm font-medium text-slate-600 focus:outline-none bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 transition-all resize-none"
              rows={2}
              placeholder="How do they grow?"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Brief Description</label>
            <textarea 
              value={char.description} 
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="w-full text-sm font-medium text-slate-600 focus:outline-none bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 transition-all resize-none"
              rows={2}
              placeholder="Core personality/hook..."
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Defining Traits</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {char.traits?.map((trait, i) => (
                <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-lg flex items-center gap-1 group/trait">
                  {trait}
                  <button onClick={() => onUpdate({ traits: char.traits.filter((_, idx) => idx !== i) })} className="hover:text-amber-900">×</button>
                </span>
              ))}
            </div>
            <input 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    onUpdate({ traits: [...(char.traits || []), val] });
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              placeholder="Add trait + Enter"
              className="w-full text-[10px] font-bold text-slate-400 bg-slate-50 p-2 rounded-lg border border-transparent focus:border-amber-100 outline-none"
            />
          </div>
        </div>

        {isExpanded && (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Personality Traits</label>
                <textarea 
                  value={char.personalityTraits || ''} 
                  onChange={(e) => onUpdate({ personalityTraits: e.target.value })}
                  className="w-full text-sm font-medium text-slate-600 focus:outline-none bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 transition-all resize-none"
                  rows={5}
                  placeholder="Introverted, Brave, Compassionate..."
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Physical Description</label>
                <textarea 
                  value={char.physicalDescription || ''} 
                  onChange={(e) => onUpdate({ physicalDescription: e.target.value })}
                  className="w-full text-sm font-medium text-slate-600 focus:outline-none bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 transition-all resize-none"
                  rows={5}
                  placeholder="Tall, silver hair, striking eyes..."
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Backstory</label>
                <textarea 
                  value={char.backstory || ''} 
                  onChange={(e) => onUpdate({ backstory: e.target.value })}
                  className="w-full text-sm font-medium text-slate-600 focus:outline-none bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 transition-all resize-none"
                  rows={5}
                  placeholder="Born in the Outer Rim..."
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Relationships</label>
                <textarea 
                  value={char.relationships || ''} 
                  onChange={(e) => onUpdate({ relationships: e.target.value })}
                  className="w-full text-sm font-medium text-slate-600 focus:outline-none bg-slate-50 p-3 rounded-xl border border-transparent focus:border-amber-100 transition-all resize-none"
                  rows={5}
                  placeholder="Daughter of Kaelen, rival to Silas..."
                />
              </div>
            </div>
          </>
        )}
      </div>

      {!isExpanded && (
        <button 
          onClick={() => setIsExpanded(true)}
          className="mt-6 text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-700 transition-colors flex items-center gap-1 self-start"
        >
          View Full Profile <Maximize2 size={12} />
        </button>
      )}
    </div>
  );
}

function TimelineItem({ time, onUpdate, onDelete, allCharacters }: { time: TimelineEvent, onUpdate: (d: any) => void, onDelete: () => void, allCharacters: Character[] }) {
  const [isAddingSoul, setIsAddingSoul] = useState(false);
  const toggleCharacter = (charId: string) => {
    const currentIds = time.characterIds || [];
    if (currentIds.includes(charId)) {
      onUpdate({ characterIds: currentIds.filter(id => id !== charId) });
    } else {
      onUpdate({ characterIds: [...currentIds, charId] });
    }
  };

  return (
    <div className="relative group flex gap-6">
      <div className="absolute -left-[45px] top-6 w-3 h-3 bg-white border-2 border-amber-600 rounded-full z-10 shadow-lg group-hover:scale-125 transition-transform" />
      <div className="flex-1 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mb-6 hover:shadow-2xl hover:shadow-amber-100/50 hover:border-amber-200 transition-all group/card">
        <div className="flex justify-between gap-6 mb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="p-2 text-slate-300 cursor-grab active:cursor-grabbing hover:text-amber-400">
              <GripVertical size={18} />
            </div>
            <input 
              value={time.date} 
              onChange={(e) => onUpdate({ date: e.target.value })}
              className="font-sans text-xs font-black uppercase tracking-[0.2em] text-amber-600 focus:outline-none bg-amber-50 px-4 py-2 rounded-xl shrink-0 border border-amber-100 focus:border-amber-300 transition-all"
              placeholder="e.g., Year 124 of the Sun"
            />
          </div>
          <div className="flex items-center gap-2">
            {time.characterIds && time.characterIds.length > 0 && (
              <div className="flex -space-x-2 mr-4">
                {time.characterIds.map(id => {
                  const char = allCharacters.find(c => c.id === id);
                  return (
                    <div key={id} className="w-8 h-8 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-amber-600 shadow-sm" title={char?.name}>
                      <UserCircle size={16} />
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={onDelete} className="p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover/card:opacity-100 transition-all hover:bg-rose-50 rounded-lg">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        <textarea 
          value={time.event} 
          onChange={(e) => onUpdate({ event: e.target.value })}
          className="w-full text-lg font-serif font-medium text-slate-700 focus:outline-none bg-transparent resize-none leading-relaxed mb-6"
          rows={2}
          placeholder="What shifted in the world during this time?"
        />

        <div className="pt-6 border-t border-slate-50">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setIsAddingSoul(!isAddingSoul)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 hover:text-amber-600 transition-colors"
            >
              <UserPlus size={14} /> {isAddingSoul ? 'Close Selector' : 'Manage Participants'}
            </button>
            <div className="flex items-center gap-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Moment Type</label>
              <select 
                value={(time as any).momentType || 'Resolution'}
                onChange={(e) => onUpdate({ momentType: e.target.value })}
                className="text-[9px] font-bold text-amber-600 bg-amber-50 border-none outline-none rounded-lg px-2 py-1"
              >
                <option value="Conflict">Conflict</option>
                <option value="Decision">Decision</option>
                <option value="Shift">Shift</option>
                <option value="Climax">Climax</option>
                <option value="Resolution">Resolution</option>
              </select>
            </div>
          </div>

          <AnimatePresence>
            {isAddingSoul && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 py-2">
                  {allCharacters.map(char => {
                    const isSelected = time.characterIds?.includes(char.id);
                    return (
                      <button 
                        key={char.id}
                        onClick={() => toggleCharacter(char.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-1.5",
                          isSelected 
                            ? "bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-100" 
                            : "bg-white border-slate-100 text-slate-400 hover:border-amber-200 hover:text-amber-500"
                        )}
                      >
                        <div className={cn("w-1.2 h-1.2 rounded-full", isSelected ? "bg-white" : "bg-slate-200")} />
                        {char.name}
                      </button>
                    );
                  })}
                  {allCharacters.length === 0 && (
                    <p className="text-[10px] text-slate-300 italic">No souls created yet.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function LoreCard({ lore, onUpdate, onDelete, story }: { lore: any, onUpdate: (d: any) => void, onDelete: () => void, story?: any }) {
  const [inspiring, setInspiring] = useState(false);

  const handleInspire = async () => {
    setInspiring(true);
    try {
      const context = `Title: ${story?.title || ''}. Premise: ${story?.premise || ''}`;
      const response = await aiService.expandLore(lore, context);
      if (response) {
        onUpdate({ content: response });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInspiring(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-amber-100 hover:border-amber-200 transition-all duration-300 flex flex-col group">
      <div className="flex justify-between items-start mb-6">
        <select 
          value={lore.type}
          onChange={(e) => onUpdate({ type: e.target.value })}
          className="text-[10px] font-black uppercase tracking-widest text-amber-600 focus:outline-none bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100"
        >
          <option value="Setting">Setting</option>
          <option value="Artifact">Artifact</option>
          <option value="Mythos">Mythos</option>
          <option value="Culture">Culture</option>
          <option value="Species">Species</option>
        </select>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInspire}
            disabled={inspiring}
            className={cn(
              "p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all",
              inspiring && "animate-spin cursor-not-allowed"
            )}
            title="Expand with AI"
          >
            <Sparkles size={18} />
          </button>
          <button onClick={onDelete} className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <input 
        value={lore.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        className="font-sans text-xl font-bold tracking-tight text-slate-800 focus:outline-none bg-transparent w-full mb-4"
        placeholder="Entry Title"
      />
      <textarea 
        value={lore.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        className="w-full text-sm font-medium text-slate-500 focus:outline-none bg-slate-50 p-4 rounded-2xl border border-transparent focus:border-amber-100 transition-all resize-none flex-1"
        rows={6}
        placeholder="Whispers of legend..."
      />
    </div>
  );
}

