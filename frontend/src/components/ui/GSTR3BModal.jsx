import React from 'react';
import {
  X,
  Printer,
  DownloadSimple,
  ShieldCheck
} from '@phosphor-icons/react';

export default function GSTR3BModal({ isOpen, onClose, data, periodLabel, businessProfile }) {
  if (!isOpen || !data) return null;

  const t31 = data.table_3_1_output_liability || {};
  const t4 = data.table_4_eligible_itc || {};
  const itcUtil = data.itc_utilized || {};
  const cashPayable = data.net_cash_payable || {};
  const carriedForward = data.itc_carried_forward || {};

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GSTR3B_${businessProfile?.gstin || 'RETURN'}_${periodLabel.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export GSTR-3B JSON:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="w-full max-w-4xl bg-[#FFFFFF] border border-[#111111] overflow-hidden print:border-none">
        
        {/* Sticky Action Header (hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E3DA] bg-[#F9F9F6] print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#1E4332]" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#555550] font-bold">
              FORM GSTR-3B · Statutory Return
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E3DA] bg-[#FFFFFF] hover:bg-[#F3F2ED] text-[#111111] text-xs font-semibold transition-none"
            >
              <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
            >
              <Printer weight="bold" className="w-3.5 h-3.5" />
              <span>Print Form GSTR-3B</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-[#E5E3DA] text-[#555550] hover:text-[#111111] transition-none ml-2"
            >
              <X weight="bold" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Statutory Form Body */}
        <div className="p-6 sm:p-10 space-y-8 font-sans text-[#111111] print:p-4">
          
          {/* Statutory Title Block */}
          <div className="text-center space-y-1 pb-6 border-b border-[#E5E3DA]">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#555550] block font-bold">
              Central Board of Indirect Taxes and Customs (CBIC) · Government of India
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              FORM GSTR-3B
            </h2>
            <p className="text-xs text-[#555550] font-mono italic max-w-xl mx-auto">
              [See rule 61(5)] · Monthly Return of Outward Supplies, Inward Supplies &amp; Input Tax Credit
            </p>
          </div>

          {/* Taxpayer Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F9F9F6] border border-[#E5E3DA] font-mono text-xs">
            <div>
              <span className="text-[10px] uppercase text-[#555550] block tracking-wider font-bold">1. Tax Period</span>
              <span className="font-semibold text-[#111111]">{periodLabel || 'November 2026'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#555550] block tracking-wider font-bold">2. Legal GSTIN</span>
              <span className="font-semibold text-[#111111]">{businessProfile?.gstin || '27AAACT2727Q1ZW'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#555550] block tracking-wider font-bold">3. Legal Business Name</span>
              <span className="font-semibold text-[#111111] truncate block">
                {businessProfile?.legal_name || 'Apex Tech Solutions Pvt Ltd'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#555550] block tracking-wider font-bold">4. Jurisdiction State</span>
              <span className="font-semibold text-[#111111]">
                {businessProfile?.state_name || 'Maharashtra'} ({businessProfile?.state_code || '27'})
              </span>
            </div>
          </div>

          {/* Table 3.1: Details of Outward Supplies */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#111111]">
                3.1 Details of Outward Supplies &amp; Inward Supplies Liable to Reverse Charge
              </h3>
              <span className="text-[11px] font-mono text-[#555550]">CGST Act Sec 37 &amp; 39</span>
            </div>

            <div className="overflow-x-auto border border-[#E5E3DA]">
              <table className="w-full text-xs text-left font-mono">
                <thead>
                  <tr className="bg-[#F9F9F6] border-b border-[#E5E3DA] text-[10px] uppercase tracking-wider text-[#555550]">
                    <th className="py-2.5 px-3">Nature of Supplies</th>
                    <th className="py-2.5 px-3 text-right">Total Taxable Value</th>
                    <th className="py-2.5 px-3 text-right">Integrated Tax (IGST)</th>
                    <th className="py-2.5 px-3 text-right">Central Tax (CGST)</th>
                    <th className="py-2.5 px-3 text-right">State / UT Tax (SGST)</th>
                    <th className="py-2.5 px-3 text-right">Cess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DA]">
                  <tr className="hover:bg-[#F9F9F6]">
                    <td className="py-3 px-3 font-sans font-medium text-[#111111]">
                      (a) Outward taxable supplies (other than zero rated, nil &amp; exempted)
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-[#111111] tabular-nums">
                      {formatCurrency(t31.taxable_value)}
                    </td>
                    <td className="py-3 px-3 text-right text-[#111111] tabular-nums">{formatCurrency(t31.igst)}</td>
                    <td className="py-3 px-3 text-right text-[#111111] tabular-nums">{formatCurrency(t31.cgst)}</td>
                    <td className="py-3 px-3 text-right text-[#111111] tabular-nums">{formatCurrency(t31.sgst)}</td>
                    <td className="py-3 px-3 text-right text-[#555550]">₹0.00</td>
                  </tr>
                  <tr className="bg-[#F9F9F6] font-bold">
                    <td className="py-2.5 px-3 font-sans text-[#111111]">Total Outward Tax Liability</td>
                    <td className="py-2.5 px-3 text-right text-[#111111] tabular-nums">{formatCurrency(t31.taxable_value)}</td>
                    <td className="py-2.5 px-3 text-right text-[#111111] tabular-nums">{formatCurrency(t31.igst)}</td>
                    <td className="py-2.5 px-3 text-right text-[#111111] tabular-nums">{formatCurrency(t31.cgst)}</td>
                    <td className="py-2.5 px-3 text-right text-[#111111] tabular-nums">{formatCurrency(t31.sgst)}</td>
                    <td className="py-2.5 px-3 text-right text-[#555550]">₹0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 4: Eligible Input Tax Credit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#111111]">
                4. Eligible Input Tax Credit (ITC)
              </h3>
              <span className="text-[11px] font-mono text-[#555550]">CGST Act Sec 16 &amp; Rule 36</span>
            </div>

            <div className="overflow-x-auto border border-[#E5E3DA]">
              <table className="w-full text-xs text-left font-mono">
                <thead>
                  <tr className="bg-[#F9F9F6] border-b border-[#E5E3DA] text-[10px] uppercase tracking-wider text-[#555550]">
                    <th className="py-2.5 px-3">Details</th>
                    <th className="py-2.5 px-3 text-right">Integrated Tax (IGST)</th>
                    <th className="py-2.5 px-3 text-right">Central Tax (CGST)</th>
                    <th className="py-2.5 px-3 text-right">State / UT Tax (SGST)</th>
                    <th className="py-2.5 px-3 text-right">Cess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DA]">
                  <tr className="hover:bg-[#F9F9F6]">
                    <td className="py-3 px-3 font-sans font-medium text-[#111111]">
                      (A) (5) All other ITC (Inward supplies from registered suppliers)
                    </td>
                    <td className="py-3 px-3 text-right text-[#1E4332] font-bold tabular-nums">{formatCurrency(t4.igst)}</td>
                    <td className="py-3 px-3 text-right text-[#1E4332] font-bold tabular-nums">{formatCurrency(t4.cgst)}</td>
                    <td className="py-3 px-3 text-right text-[#1E4332] font-bold tabular-nums">{formatCurrency(t4.sgst)}</td>
                    <td className="py-3 px-3 text-right text-[#555550]">₹0.00</td>
                  </tr>
                  <tr className="bg-[#EAF2EC] font-bold">
                    <td className="py-2.5 px-3 font-sans text-[#1E4332]">(C) Net ITC Available (A) - (B)</td>
                    <td className="py-2.5 px-3 text-right text-[#1E4332] tabular-nums">{formatCurrency(t4.igst)}</td>
                    <td className="py-2.5 px-3 text-right text-[#1E4332] tabular-nums">{formatCurrency(t4.cgst)}</td>
                    <td className="py-2.5 px-3 text-right text-[#1E4332] tabular-nums">{formatCurrency(t4.sgst)}</td>
                    <td className="py-2.5 px-3 text-right text-[#555550]">₹0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 6.1: Payment of Tax (Section 49 & Rule 88A) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#111111]">
                6.1 Payment of Tax (Statutory Set-Off Waterfall under Section 49, 49A, 49B)
              </h3>
              <span className="text-[11px] font-mono text-[#1E4332] font-bold">Rule 88A Enforced</span>
            </div>

            <div className="overflow-x-auto border border-[#E5E3DA]">
              <table className="w-full text-xs text-left font-mono">
                <thead>
                  <tr className="bg-[#F9F9F6] border-b border-[#E5E3DA] text-[10px] uppercase tracking-wider text-[#555550]">
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Tax Payable</th>
                    <th className="py-2.5 px-3 text-right">Paid Through ITC</th>
                    <th className="py-2.5 px-3 text-right">Tax Paid in Cash (PMT-06)</th>
                    <th className="py-2.5 px-3 text-right">Credit Carried Fwd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DA]">
                  <tr className="hover:bg-[#F9F9F6]">
                    <td className="py-3 px-3 font-semibold text-[#111111]">Integrated Tax (IGST)</td>
                    <td className="py-3 px-3 text-right text-[#111111] tabular-nums">{formatCurrency(t31.igst)}</td>
                    <td className="py-3 px-3 text-right text-[#1E4332] font-bold tabular-nums">{formatCurrency(itcUtil.igst_used)}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#963614] tabular-nums">{formatCurrency(cashPayable.igst)}</td>
                    <td className="py-3 px-3 text-right text-[#555550] tabular-nums">{formatCurrency(carriedForward.igst)}</td>
                  </tr>
                  <tr className="hover:bg-[#F9F9F6]">
                    <td className="py-3 px-3 font-semibold text-[#111111]">Central Tax (CGST)</td>
                    <td className="py-3 px-3 text-right text-[#111111] tabular-nums">{formatCurrency(t31.cgst)}</td>
                    <td className="py-3 px-3 text-right text-[#1E4332] font-bold tabular-nums">{formatCurrency(itcUtil.cgst_used)}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#963614] tabular-nums">{formatCurrency(cashPayable.cgst)}</td>
                    <td className="py-3 px-3 text-right text-[#555550] tabular-nums">{formatCurrency(carriedForward.cgst)}</td>
                  </tr>
                  <tr className="hover:bg-[#F9F9F6]">
                    <td className="py-3 px-3 font-semibold text-[#111111]">State / UT Tax (SGST)</td>
                    <td className="py-3 px-3 text-right text-[#111111] tabular-nums">{formatCurrency(t31.sgst)}</td>
                    <td className="py-3 px-3 text-right text-[#1E4332] font-bold tabular-nums">{formatCurrency(itcUtil.sgst_used)}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#963614] tabular-nums">{formatCurrency(cashPayable.sgst)}</td>
                    <td className="py-3 px-3 text-right text-[#555550] tabular-nums">{formatCurrency(carriedForward.sgst)}</td>
                  </tr>
                  <tr className="bg-[#111111] text-[#FFFFFF] font-bold">
                    <td className="py-3 px-3">Total Statutory Net Liability</td>
                    <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(t31.total_tax)}</td>
                    <td className="py-3 px-3 text-right text-[#A3E5BA] tabular-nums">
                      {formatCurrency((itcUtil.igst_used || 0) + (itcUtil.cgst_used || 0) + (itcUtil.sgst_used || 0))}
                    </td>
                    <td className="py-3 px-3 text-right text-[#FFC4B0] tabular-nums">
                      {formatCurrency(cashPayable.total_cash_payable)}
                    </td>
                    <td className="py-3 px-3 text-right text-[#DCDACF] tabular-nums">
                      {formatCurrency((carriedForward.igst || 0) + (carriedForward.cgst || 0) + (carriedForward.sgst || 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification Declaration */}
          <div className="pt-6 border-t border-[#E5E3DA] text-xs text-[#555550] space-y-2">
            <div className="flex items-center gap-1.5 text-[#111111] font-semibold font-mono">
              <ShieldCheck weight="fill" className="w-4 h-4 text-[#1E4332]" />
              <span>Statutory Declaration under Rule 61(5)</span>
            </div>
            <p className="font-mono text-xs italic leading-relaxed text-[#555550]">
              I hereby solemnly affirm and declare that the information given herein above is true and correct to the best of my knowledge and belief and nothing has been concealed therefrom.
            </p>
            <div className="flex justify-between items-end pt-4 font-mono text-[11px] text-[#555550]">
              <span>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span className="border-t border-[#111111] pt-1 px-8 text-[#111111] font-bold">Authorized Signatory</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
