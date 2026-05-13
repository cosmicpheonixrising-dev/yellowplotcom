import { Link, useNavigate } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { Feather, LayoutDashboard, Wand2, LogOut, Crown, Sparkles } from 'lucide-react';
import { useState } from 'react';
import AIPromptModal from '../ai/AIPromptModal';
import { useSubscription } from '../SubscriptionContext';
import PricingModal from '../PricingModal';
import { cn } from '../../lib/utils';

export default function Navbar({ user }: { user: User }) {
  const navigate = useNavigate();
  const [showAI, setShowAI] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const { isPro, tier } = useSubscription();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center transition-all group-hover:shadow-lg group-hover:rotate-6">
              <Feather className="text-black w-5 h-5" />
            </div>
            <span className="font-sans text-xl font-black tracking-tighter text-slate-800">Yellow Plot</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Link to="/dashboard" className="flex items-center gap-2 hover:text-amber-600 transition-colors">
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowPricing(true)}
            className={cn(
              "hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              isPro 
                ? "bg-amber-50 text-amber-600 border border-amber-100" 
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100"
            )}
          >
            {isPro ? <Crown size={14} /> : <Sparkles size={14} />}
            {tier} Plan
          </button>

          <button 
            onClick={() => setShowAI(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-slate-200 shadow-xl"
            id="ai-button"
          >
            <Wand2 size={16} className="text-amber-400" />
            Neural AI
          </button>

          <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=4f46e5&color=fff`} 
              alt="Avatar" 
              className="w-9 h-9 rounded-full border-2 border-white shadow-sm"
            />
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
              title="Logout"
              id="logout-button"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {showAI && <AIPromptModal onClose={() => setShowAI(false)} />}
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </nav>
  );
}
