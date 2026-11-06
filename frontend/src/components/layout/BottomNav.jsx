import React from 'react';
import { Sparkle, SquaresFour, Plus, Receipt, Scales } from '@phosphor-icons/react';

export default function BottomNav({ currentTab, setTab }) {
  const tabs = [
    { id: 'landing', label: 'Overview', icon: Sparkle },
    { id: 'dashboard', label: 'Dashboard', icon: SquaresFour },
    { id: 'create', label: 'New Bill', icon: Plus, isAction: true },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'compliance', label: 'Returns', icon: Scales },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#F9F9F6] border-t border-[#E5E3DA] px-3 py-1 font-sans">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className="-mt-5 flex flex-col items-center focus:outline-none"
              >
                <div className="w-11 h-11 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] flex items-center justify-center border-2 border-[#F9F9F6] transition-none">
                  <Icon weight="bold" className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-[#111111] mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex flex-col items-center py-1 px-3 transition-none focus:outline-none ${
                isActive 
                  ? 'text-[#111111] font-bold' 
                  : 'text-[#666660] hover:text-[#111111] font-medium'
              }`}
            >
              <Icon weight={isActive ? "fill" : "regular"} className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
