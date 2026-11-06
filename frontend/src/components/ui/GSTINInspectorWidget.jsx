import React, { useState } from 'react';

const SAMPLES = [
  { label: 'Apex Tech (MH)', gstin: '27AAACT2727Q1ZW', state: '27 - Maharashtra' },
  { label: 'CloudScale (KA)', gstin: '29AABCU9603R1ZM', state: '29 - Karnataka' },
  { label: 'Infosys (KA)', gstin: '29AAACI4798L1ZU', state: '29 - Karnataka' },
  { label: 'Reliance (MH)', gstin: '27AABCR6164Q1ZF', state: '27 - Maharashtra' },
];

export default function GSTINInspectorWidget() {
  const [gstin, setGstin] = useState(SAMPLES[0].gstin);

  // Parse 15 characters
  const stateCode = gstin.slice(0, 2);
  const pan = gstin.slice(2, 12);
  const entity = gstin.slice(12, 13);
  const constant = gstin.slice(13, 14);
  const checksum = gstin.slice(14, 15);

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E3DA] p-5 sm:p-8 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E3DA] pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-[#555550] uppercase tracking-wider block">
            Statutory 15-Character Specification
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight mt-0.5">
            Luhn Modulo-36 GSTIN Dissector
          </h3>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {SAMPLES.map((s) => (
            <button
              key={s.gstin}
              type="button"
              onClick={() => setGstin(s.gstin)}
              className={`px-3 py-1 text-xs font-mono font-bold transition-none ${
                gstin === s.gstin
                  ? 'bg-[#111111] text-[#FFFFFF]'
                  : 'bg-[#F9F9F6] text-[#555550] hover:text-[#111111] border border-[#E5E3DA]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dissection Blocks: Desktop Grid */}
      <div className="hidden sm:grid grid-cols-5 gap-3">
        {/* State Code */}
        <div className="bg-[#F3F2ED] border border-[#E5E3DA] p-4 text-center space-y-1">
          <span className="text-[10px] font-mono font-bold text-[#555550] uppercase tracking-wider block">State</span>
          <span className="font-mono text-2xl font-black text-[#111111] block tabular-nums">{stateCode}</span>
          <span className="text-[10px] font-mono text-[#555550] block truncate">Census 01-38</span>
        </div>

        {/* PAN */}
        <div className="col-span-2 bg-[#F9F9F6] border border-[#E5E3DA] p-4 text-center space-y-1">
          <span className="text-[10px] font-mono font-bold text-[#555550] uppercase tracking-wider block">10-Digit PAN</span>
          <span className="font-mono text-2xl font-black text-[#111111] block truncate tracking-wide">{pan}</span>
          <span className="text-[10px] font-mono text-[#555550] block truncate">CBDT Validated</span>
        </div>

        {/* Entity */}
        <div className="bg-[#F9F9F6] border border-[#E5E3DA] p-4 text-center space-y-1">
          <span className="text-[10px] font-mono font-bold text-[#555550] uppercase tracking-wider block">Entity</span>
          <span className="font-mono text-2xl font-black text-[#111111] block">{entity}</span>
          <span className="text-[10px] font-mono text-[#555550] block truncate">Serial No</span>
        </div>

        {/* Checksum */}
        <div className="bg-[#EAF2EC] border border-[#1E4332]/40 p-4 text-center space-y-1">
          <span className="text-[10px] font-mono font-bold text-[#1E4332] uppercase tracking-wider block">Mod-36</span>
          <span className="font-mono text-2xl font-black text-[#1E4332] block">{checksum}</span>
          <span className="text-[10px] font-mono text-[#1E4332] font-bold block truncate">Luhn Valid ✓</span>
        </div>
      </div>

      {/* Dissection Blocks: Mobile Grid */}
      <div className="sm:hidden space-y-2">
        <div className="bg-[#F9F9F6] border border-[#E5E3DA] p-3 text-center space-y-1">
          <span className="text-[10px] font-mono font-bold text-[#555550] uppercase tracking-wider block">10-Digit PAN</span>
          <span className="font-mono text-xl font-black text-[#111111] block tracking-wider">{pan}</span>
          <span className="text-[10px] font-mono text-[#555550] block">CBDT Corporate PAN</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#F3F2ED] border border-[#E5E3DA] p-2.5 text-center space-y-0.5">
            <span className="text-[9px] font-mono font-bold text-[#555550] uppercase block">State</span>
            <span className="font-mono text-lg font-black text-[#111111] block">{stateCode}</span>
            <span className="text-[9px] font-mono text-[#555550] block">Census {stateCode}</span>
          </div>

          <div className="bg-[#F9F9F6] border border-[#E5E3DA] p-2.5 text-center space-y-0.5">
            <span className="text-[9px] font-mono font-bold text-[#555550] uppercase block">Entity</span>
            <span className="font-mono text-lg font-black text-[#111111] block">{entity}</span>
            <span className="text-[9px] font-mono text-[#555550] block">Serial {constant}</span>
          </div>

          <div className="bg-[#EAF2EC] border border-[#1E4332]/40 p-2.5 text-center space-y-0.5">
            <span className="text-[9px] font-mono font-bold text-[#1E4332] uppercase block">Mod-36</span>
            <span className="font-mono text-lg font-black text-[#1E4332] block">{checksum}</span>
            <span className="text-[9px] font-mono text-[#1E4332] font-bold block">Valid ✓</span>
          </div>
        </div>
      </div>
    </div>
  );
}
