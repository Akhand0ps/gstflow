import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import InvoiceBuilder from './pages/InvoiceBuilder';
import Parties from './pages/Parties';
import Compliance from './pages/Compliance';
import Toast from './components/ui/Toast';
import { api } from './services/api';

export default function App() {
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    if (['landing', 'dashboard', 'invoices', 'create', 'parties', 'compliance'].includes(hash)) {
      return hash;
    }
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (['landing', 'dashboard', 'invoices', 'create', 'parties', 'compliance'].includes(tabParam)) {
      return tabParam;
    }
    return 'landing';
  };

  const [currentTab, setCurrentTab] = useState(getInitialTab);
  const [business, setBusiness] = useState(null);
  const [toast, setToast] = useState(null);

  const setTab = (tab) => {
    setCurrentTab(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['landing', 'dashboard', 'invoices', 'create', 'parties', 'compliance'].includes(hash)) {
        setCurrentTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    try {
      const res = await api.getBusinessProfile();
      setBusiness(res);
    } catch (err) {
      console.warn('Backend not responding yet or business not initialized:', err);
    }
  };

  const showToast = (message, type = 'info', title = '') => {
    setToast({ message, type, title });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] } },
    exit: { opacity: 0, y: -4, transition: { duration: 0.12, ease: [0.2, 0.8, 0.2, 1] } }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F6] text-[#111111] flex flex-col font-sans selection:bg-[#111111] selection:text-[#F9F9F6]">
      {/* Toast Notification Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top Header */}
      <Header business={business} currentTab={currentTab} setTab={setTab} />

      {/* Main View Area with Smooth Screen Transitions */}
      <main className="flex-1 px-4 sm:px-6 pt-5 pb-20 md:pb-12 max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {currentTab === 'landing' && (
            <motion.div key="landing" {...pageVariants}>
              <LandingPage setTab={setTab} showToast={showToast} />
            </motion.div>
          )}
          {currentTab === 'dashboard' && (
            <motion.div key="dashboard" {...pageVariants}>
              <Dashboard setTab={setTab} showToast={showToast} />
            </motion.div>
          )}
          {currentTab === 'invoices' && (
            <motion.div key="invoices" {...pageVariants}>
              <Invoices setTab={setTab} showToast={showToast} />
            </motion.div>
          )}
          {currentTab === 'create' && (
            <motion.div key="create" {...pageVariants}>
              <InvoiceBuilder setTab={setTab} business={business} showToast={showToast} />
            </motion.div>
          )}
          {currentTab === 'parties' && (
            <motion.div key="parties" {...pageVariants}>
              <Parties showToast={showToast} />
            </motion.div>
          )}
          {currentTab === 'compliance' && (
            <motion.div key="compliance" {...pageVariants}>
              <Compliance showToast={showToast} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile-First PWA Bottom Navigation Bar */}
      <BottomNav currentTab={currentTab} setTab={setTab} />
    </div>
  );
}
