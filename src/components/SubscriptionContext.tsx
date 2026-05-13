import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { UserProfile, SubscriptionTier } from '../types';

interface SubscriptionContextType {
  profile: UserProfile | null;
  loading: boolean;
  isPro: boolean;
  upgradeToPro: () => Promise<void>;
  tier: SubscriptionTier;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const profileRef = doc(db, 'profiles', user.uid);
        const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            // Initialize with Starter tier
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              tier: 'Starter',
              updatedAt: serverTimestamp()
            };
            setDoc(profileRef, newProfile).catch(err => {
               console.error("Failed to initialize profile:", err);
            });
            setProfile(newProfile);
          }
          setLoading(false);
        }, (error) => {
           console.error("Profile subscription error:", error);
           setLoading(false); // Ensure app doesn't hang
        });
        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const upgradeToPro = async () => {
    if (!auth.currentUser) return;
    const profileRef = doc(db, 'profiles', auth.currentUser.uid);
    await setDoc(profileRef, {
      tier: 'Pro',
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const tier = profile?.tier || 'Starter';
  const isPro = tier === 'Pro';

  return (
    <SubscriptionContext.Provider value={{ profile, loading, isPro, upgradeToPro, tier }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
