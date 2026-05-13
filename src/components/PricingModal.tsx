import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Star, Zap, Crown, Sparkles } from 'lucide-react';
import { useSubscription } from './SubscriptionContext';
import { cn } from '../lib/utils';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { tier, upgradeToPro } = useSubscription();

  const plans = [
    {
      name: 'Starter',
      price: '$0',
      description: 'Perfect for casual storytellers.',
      icon: <Star className="text-slate-400" size={24} />,
      features: [
        'Up to 2 Active Projects',
        'Basic Character Profiles',
        'Standard Plot Board',
        'Community Codex Access'
      ],
      notIncluded: [
        'Advanced AI Lore Generation',
        'Professional Markdown Export',
        'Real-time Collaboration',
        'Character Relationship Maps'
      ],
      current: tier === 'Starter',
      action: 'Current Plan',
      color: 'slate'
    },
    {
      name: 'Pro',
      price: '$9.99',
      period: '/mo',
      description: 'For full-time world builders.',
      icon: <Crown className="text-amber-500" size={24} />,
      features: [
        'Unlimited Masterpieces',
        'Advanced AI Story Architech',
        'Full Relationship Modeling',
        'Every Export Format (MD, JSON, TXT)',
        'Real-time Collaborative Writing',
        'Early Lab Feature Access'
      ],
      current: tier === 'Pro',
      action: 'Upgrade Now',
      color: 'amber'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl shadow-slate-900/20 overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Side: Summary */}
              <div className="p-12 bg-slate-50">
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="text-amber-500" size={20} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Premium Access</span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-4">
                    Unlock Your Full <br /> Creative Potential.
                  </h2>
                  <p className="text-slate-500 leading-relaxed font-medium">
                    Move beyond the basics. Give your universe the professional architecting it deserves with AI-powered expansion and unlimited scope.
                  </p>
                </div>

                <div className="space-y-6">
                  {plans[0].features.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                        <Check size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-600">{f}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 text-amber-600">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm">
                      <Zap size={16} />
                    </div>
                    <span className="text-sm font-bold italic">+ Pro AI & Collaboration</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Pro Card */}
              <div className="p-12 flex flex-col">
                <div className="bg-amber-50 self-start px-4 py-2 rounded-2xl mb-8">
                   <div className="flex items-center gap-2">
                      <Crown size={14} className="text-amber-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Most Popular</span>
                   </div>
                </div>

                <div className="mb-10">
                  <h3 className="text-2xl font-black text-slate-800 mb-1">{plans[1].name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black tracking-tighter text-slate-900">{plans[1].price}</span>
                    <span className="text-slate-400 font-bold tracking-widest uppercase text-xs">{plans[1].period}</span>
                  </div>
                  <p className="text-slate-500 mt-2 font-medium">{plans[1].description}</p>
                </div>

                <div className="space-y-4 mb-12 flex-grow">
                  {plans[1].features.map((f, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-sm font-bold text-slate-700">{f}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => {
                    if (tier === 'Starter') {
                      upgradeToPro();
                      onClose();
                    }
                  }}
                  disabled={tier === 'Pro'}
                  className={cn(
                    "w-full py-5 rounded-[24px] text-sm font-black uppercase tracking-widest transition-all shadow-xl",
                    tier === 'Pro' 
                      ? "bg-slate-100 text-slate-400 cursor-default" 
                      : "bg-slate-900 text-white hover:bg-black shadow-slate-200"
                  )}
                >
                  {tier === 'Pro' ? 'Current Active Plan' : 'Unleash Your Imagination'}
                </button>
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
                  Cancel anytime. 14-day money back guarantee.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
