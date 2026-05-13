import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Feather, Compass, BookOpen, Wand2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function LandingPage() {
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    // Force account selection to avoid auto-close issues in some browsers
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError("The login window was closed before completion. Please try again.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Login popup was blocked. Please enable popups for this site.");
      } else {
        setError("Login failed. Please check your connection and try again.");
      }
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-slate-900 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-4xl"
      >
        <div className="flex justify-center mb-10">
          <div className="w-20 h-20 bg-amber-400 rounded-2xl flex items-center justify-center shadow-xl rotate-3">
            <Feather className="text-black w-10 h-10" />
          </div>
        </div>
        <h1 className="font-sans text-6xl md:text-8xl font-bold mb-8 tracking-tighter text-slate-800">
          Yellow Plot<span className="text-amber-500">.</span>
        </h1>
        <p className="font-sans text-xl md:text-2xl text-slate-500 mb-14 max-w-2xl mx-auto leading-relaxed italic">
          "Weave Your World. Master Your Plot."
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 text-left">
          <FeatureCard 
            icon={<Compass className="w-5 h-5" />}
            title="Project Strategy"
            description="Professional architectural tools to map every beat of your manuscript."
          />
          <FeatureCard 
            icon={<BookOpen className="w-5 h-5" />}
            title="Focus Mode"
            description="A minimalist, distraction-free interface engineered for peak flow state."
          />
          <FeatureCard 
            icon={<Wand2 className="w-5 h-5" />}
            title="Neural Assistant"
            description="Integrated AI muse to bypass writer's block and expand your world-building."
          />
        </div>

        <div className="space-y-6">
          {error && (
            <motion.p 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-rose-500 text-sm font-bold bg-rose-50 px-6 py-3 rounded-xl border border-rose-100 shadow-sm inline-block"
            >
              {error}
            </motion.p>
          )}
          
          <div>
            <button
              onClick={handleLogin}
              className="bg-slate-900 text-white px-12 py-5 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-slate-200 shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
              id="login-button"
            >
              Begin Writing <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 border border-slate-200 rounded-2xl bg-white shadow-sm transition-all hover:shadow-lg hover:border-amber-100 group">
      <div className="text-amber-600 mb-4 bg-amber-50 w-10 h-10 rounded-lg flex items-center justify-center transition-colors group-hover:bg-amber-600 group-hover:text-white">{icon}</div>
      <h3 className="font-sans text-lg font-bold mb-3 text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed font-medium">{description}</p>
    </div>
  );
}
