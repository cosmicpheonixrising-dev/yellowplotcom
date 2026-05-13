/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './services/firebase';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import StoryPlanner from './pages/StoryPlanner';
import Navbar from './components/layout/Navbar';
import LandingPage from './pages/LandingPage';

import { SubscriptionProvider } from './components/SubscriptionContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-pulse text-amber-600 font-sans font-bold tracking-widest text-sm uppercase">Scribing your world...</div>
      </div>
    );
  }

  return (
    <SubscriptionProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          {user && <Navbar user={user} />}
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
              <Route path="/story/:storyId" element={user ? <Editor /> : <Navigate to="/" />} />
              <Route path="/story/:storyId/planner" element={user ? <StoryPlanner /> : <Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </SubscriptionProvider>
  );
}
