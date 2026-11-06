import React from 'react';
import { ShieldCheck, ShieldWarning } from '@phosphor-icons/react';

export default function GSTINInspector({ gstin, status }) {
  if (!gstin || gstin.length < 2) return null;

  const stateCode = gstin.slice(0, 2);
  const pan = gstin.length >= 12 ? gstin.slice(2, 12) : gstin.slice(2);
  const entity = gstin.length >= 13 ? gstin[12] : '';
  const constantZ = gstin.length >= 14 ? gstin[13] : '';
  const checksum = gstin.length >= 15 ? gstin[14] : '';

  const isValid = status?.valid;

  return (
    <div className="p-3 bg-[#F9F9F6] border border-[#E5E3DA] space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="font-medium text-[#111111] flex items-center gap-1.5">
          {isValid ? (
            <ShieldCheck weight="bold" className="w-3.5 h-3.5 text-[#1E4332]" />
          ) : (
            <ShieldWarning weight="bold" className="w-3.5 h-3.5 text-[#555550]" />
          )}
          <span>Modulo-36 Dissection</span>
        </span>

        {status && (
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border ${
            isValid 
              ? 'bg-[#EAF2EC] text-[#1E4332] border-[#1E4332]/40' 
              : 'bg-[#FAECE7] text-[#963614] border-[#963614]/40'
          }`}>
            {isValid ? 'Modulo-36 Valid ✓' : 'Checksum Mismatch ✕'}
          </span>
        )}
      </div>

      {/* Segmented character boxes */}
      <div className="flex items-center gap-1 font-mono text-xs overflow-x-auto py-0.5">
        
        {/* State Code */}
        <div className="flex flex-col items-center">
          <div className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E5E3DA] text-[#111111] font-bold">
            {stateCode}
          </div>
          <span className="text-[9px] text-[#555550] mt-0.5">State</span>
        </div>

        {/* PAN */}
        {pan && (
          <div className="flex flex-col items-center">
            <div className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E5E3DA] text-[#111111] font-bold tracking-wider">
              {pan}
            </div>
            <span className="text-[9px] text-[#555550] mt-0.5">PAN</span>
          </div>
        )}

        {/* Entity Number */}
        {entity && (
          <div className="flex flex-col items-center">
            <div className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E5E3DA] text-[#111111] font-bold">
              {entity}
            </div>
            <span className="text-[9px] text-[#555550] mt-0.5">Entity</span>
          </div>
        )}

        {/* Constant Z */}
        {constantZ && (
          <div className="flex flex-col items-center">
            <div className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E5E3DA] text-[#111111] font-bold">
              {constantZ}
            </div>
            <span className="text-[9px] text-[#555550] mt-0.5">Const</span>
          </div>
        )}

        {/* Checksum Digit */}
        {checksum && (
          <div className="flex flex-col items-center">
            <div className={`px-2 py-0.5 border font-bold ${
              isValid 
                ? 'bg-[#EAF2EC] border-[#1E4332]/40 text-[#1E4332]' 
                : 'bg-[#FFFFFF] border-[#E5E3DA] text-[#111111]'
            }`}>
              {checksum}
            </div>
            <span className="text-[9px] text-[#555550] mt-0.5">Mod-36</span>
          </div>
        )}

      </div>

      {status?.message && (
        <div className={`text-[10px] font-mono ${isValid ? 'text-[#1E4332]' : 'text-[#963614]'}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}
