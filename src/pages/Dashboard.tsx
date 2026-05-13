import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../services/firebase';
import { Story } from '../types';
import { Plus, Book, Clock, ChevronRight, Wand2, Crown, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useSubscription } from '../components/SubscriptionContext';
import PricingModal from '../components/PricingModal';
import TemplateSelector from '../components/TemplateSelector';
import { PlotTemplate } from '../constants/templates';

export default function Dashboard() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const { isPro, tier } = useSubscription();

  const FREE_LIMIT = 2;
  const isAtLimit = !isPro && stories.length >= FREE_LIMIT;

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'stories'),
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Story[];
      setStories(storyData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stories');
    });

    return () => unsubscribe();
  }, []);

  const createStory = async (type: string = 'Novel', template: PlotTemplate | null = null) => {
    if (!auth.currentUser) return;
    if (isAtLimit) {
      setShowPricing(true);
      return;
    }
    setIsCreating(true);
    setShowTemplates(false);
    try {
      const storyData = {
        title: template ? `${template.name}: Untitled` : 'Untitled ' + type,
        description: template ? template.description : 'Began writing on ' + new Date().toLocaleDateString(),
        type,
        status: 'draft',
        content: '',
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'stories'), storyData);
      
      if (template && template.beats.length > 0) {
        const batch = writeBatch(db);
        template.beats.forEach((beat) => {
          const plotRef = doc(collection(db, 'plots'));
          batch.set(plotRef, {
            ...beat,
            storyId: docRef.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
      }

      console.log("Document written with ID: ", docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'stories');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-sans text-4xl font-black tracking-tighter text-slate-800 underline decoration-amber-500 decoration-4 underline-offset-8">Projects</h1>
            {!isPro && (
              <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-1.5 ml-4">
                 <Sparkles size={12} /> {stories.length}/{FREE_LIMIT} Slots
              </div>
            )}
          </div>
          <p className="text-slate-500 font-medium">Weave Your World. Master Your Plot.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowTemplates(true)}
            disabled={isCreating}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-2xl disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]",
              isAtLimit 
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none" 
                : "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-100"
            )}
            id="new-novel-button"
          >
            {isAtLimit ? <Crown size={18} className="text-amber-500" /> : <Plus size={20} />}
            {isAtLimit ? 'Upgrade to Unlock Slots' : 'New Manuscript'}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isAtLimit && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-12 p-6 bg-amber-50 border border-amber-100 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Storyteller Limit Reached</h4>
                <p className="text-xs text-slate-500 font-medium mt-1">Upgrade to Pro for unlimited projects, advanced AI, and real-time collaboration.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPricing(true)}
              className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
            >
              Unlock Unlimited Scope
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />)}
        </div>
      ) : stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[40px] border border-slate-200 shadow-sm">
          <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 rotate-3">
            <Book className="text-slate-200 w-12 h-12" />
          </div>
          <h3 className="font-sans text-2xl font-bold text-slate-800 mb-3 tracking-tight">The desk is clear</h3>
          <p className="text-slate-400 font-medium mb-10 max-w-sm">
            Ready to begin your next masterpiece? Start with a blank manuscript or use the AI Neural assistant.
          </p>
          <button onClick={() => createStory('Novel')} className="text-amber-600 font-bold uppercase tracking-widest text-xs hover:underline">Start writing now</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <Link to={`/story/${story.id}`}>
                <div className="group h-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:shadow-amber-100/50 hover:border-amber-200 hover:-translate-y-2 transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <span className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-widest",
                      story.type === 'Novel' ? "bg-amber-50 text-amber-600" : 
                      story.type === 'Script' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                    )}>
                      {story.type}
                    </span>
                    <Clock size={16} className="text-slate-200 group-hover:text-amber-300 transition-colors" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-slate-800 mb-3 group-hover:text-amber-600 transition-colors line-clamp-1 h-8">
                    {story.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-8 line-clamp-2 leading-relaxed font-medium">
                    {story.description || 'Drafting in progress...'}
                  </p>
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-black tracking-widest text-slate-300 mb-0.5">Last Edit</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">
                        {story.updatedAt?.seconds 
                          ? new Date(story.updatedAt.seconds * 1000).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) 
                          : 'Recent'}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-amber-600 group-hover:text-white transition-all transform group-hover:scale-110">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
      <TemplateSelector 
        isOpen={showTemplates} 
        onClose={() => setShowTemplates(false)} 
        onSelect={(template) => createStory('Novel', template)} 
      />
    </div>
  );
}
