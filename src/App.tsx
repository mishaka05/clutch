/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Navbar';
import { firebaseService } from './services/firebase';
import { UserProfile, Task } from './types';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'logs'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Synchronize Auth and Active task summaries
  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChanged((profile) => {
      setUser(profile);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchTasks = async () => {
        const allTasks = await firebaseService.getTasks();
        setTasks(allTasks);
      };
      fetchTasks();
      
      // Keep navbar indicator counts updated every 4 seconds
      const interval = setInterval(fetchTasks, 4000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLoginSuccess = async () => {
    const profile = firebaseService.getCurrentUser();
    setUser(profile);
    if (profile) {
      const allTasks = await firebaseService.getTasks();
      setTasks(allTasks);
    }
  };

  const handleLogout = async () => {
    await firebaseService.logout();
    setUser(null);
    setTasks([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex flex-col items-center justify-center font-mono text-xs text-[#00D4FF] gap-3">
        <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
        <span className="tracking-widest uppercase">Initializing Decision Core...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-slate-100 flex flex-col font-sans select-none antialiased">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <Landing onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        ) : (
          <motion.div
            key="cockpit-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full flex flex-col min-h-screen"
          >
            <Navbar
              user={user}
              tasks={tasks}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogout={handleLogout}
            />
            <Dashboard
              user={user}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
