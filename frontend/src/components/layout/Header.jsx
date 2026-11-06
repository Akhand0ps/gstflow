import React from 'react';
import { Plus } from '@phosphor-icons/react';

export default function Header({ business, currentTab, setTab }) {
  const navItems = [
    { id: 'landing', label: 'Overview' },
    { id: 'dashboard', label: 'Console' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'parties', label: 'Parties & Catalog' },
    { id: 'compliance', label: 'Returns & 3B' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full py-2.5 bg-[#F9F9F6] border-b border-[#E5E3DA] transition-none font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
        
        {/* Left: Brand Monogram & State Code */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab?.('landing')}
            className="flex items-center gap-2.5 text-left py-1 hover:opacity-85 transition-opacity"
            title="GST Flow Platform"
          >
            <div className="w-8 h-8 rounded-none bg-[#111111] text-[#F9F9F6] font-mono text-xs font-bold flex items-center justify-center border border-[#111111]">
              GF
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-[#111111] tracking-tight">
                  GST Flow
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-none bg-[#EAF2EC] text-[10px] font-mono font-bold text-[#1E4332] border border-[#1E4332]/40">
                  <span className="w-1.5 h-1.5 bg-[#1E4332]" />
                  {business?.state_code ? `MH ${business.state_code}` : 'MH 27'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#555550] hidden sm:inline">
                Rule 46 &amp; Section 49 Statutory Ledger
              </span>
            </div>
          </button>
        </div>

        {/* Center: Strict Architectural Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-[#EFEFEA] border border-[#DCDACF] p-0.5 text-xs font-semibold">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab?.(item.id)}
                className={`px-3.5 py-1 text-xs transition-none ${
                  isActive
                    ? 'bg-[#111111] text-[#FFFFFF] font-bold'
                    : 'text-[#555550] hover:text-[#111111] hover:bg-[#E5E3DA] font-semibold'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Primary Action (Obsidian Black) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab?.('create')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 border border-[#111111] transition-none ${
              currentTab === 'create'
                ? 'bg-[#F9F9F6] text-[#111111]'
                : 'bg-[#111111] hover:bg-[#252525] text-[#FFFFFF]'
            }`}
          >
            <Plus weight="bold" className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </div>

      </div>
    </header>
  );
}
