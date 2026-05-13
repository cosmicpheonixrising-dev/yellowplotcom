import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { UserCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface PresenceIndicatorProps {
  storyId: string;
}

interface PresenceData {
  uid: string;
  email: string;
  name: string;
  lastActive: any;
}

export default function PresenceIndicator({ storyId }: PresenceIndicatorProps) {
  const [activeUsers, setActiveUsers] = useState<PresenceData[]>([]);

  useEffect(() => {
    if (!auth.currentUser || !storyId) return;

    const user = auth.currentUser;
    const presenceRef = doc(db, 'presence', `${storyId}_${user.uid}`);

    // Set presence
    const setPresence = async () => {
      await setDoc(presenceRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        storyId,
        lastActive: serverTimestamp()
      });
    };

    setPresence();
    const interval = setInterval(setPresence, 30000); // Heartbeat every 30s

    // Listen for others (active in last 2 minutes)
    const q = query(
      collection(db, 'presence'), 
      where('storyId', '==', storyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(d => d.data() as PresenceData)
        .filter(u => u.uid !== user.uid); // Filter self
      setActiveUsers(users);
    });

    // Cleanup on unmount or tab close
    const cleanup = async () => {
      clearInterval(interval);
      try {
        await deleteDoc(presenceRef);
      } catch (e) {
        console.error("Presence cleanup failed:", e);
      }
    };

    window.addEventListener('beforeunload', cleanup);

    return () => {
      cleanup();
      window.removeEventListener('beforeunload', cleanup);
      unsubscribe();
    };
  }, [storyId]);

  return (
    <div className="flex -space-x-2">
      <AnimatePresence>
        {activeUsers.map((u, i) => (
          <motion.div
            key={u.uid}
            initial={{ opacity: 0, scale: 0.5, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: 10 }}
            title={`${u.name} is also editing`}
            className={cn(
              "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm font-bold text-[10px] relative group",
              i % 3 === 0 ? "bg-indigo-500" : i % 3 === 1 ? "bg-emerald-500" : "bg-purple-500"
            )}
          >
            {u.name.charAt(0).toUpperCase()}
            <div className="absolute bottom-full mb-2 left-1/2 -track-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white px-2 py-1 rounded text-[8px] whitespace-nowrap z-50">
               {u.name}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
