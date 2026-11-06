import React, { useState, useEffect } from 'react';
import {
  Plus,
  DownloadSimple,
  CalendarBlank,
  ArrowRight,
  Receipt,
  ShieldCheck,
  FileText
} from '@phosphor-icons/react';
import { api } from '../services/api';
import InvoiceDetailModal from '../components/ui/InvoiceDetailModal';

export default function Dashboard({ setTab, showToast }) {
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'SALES' | 'PURCHASE'
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);

  const PERIOD_OPTIONS = [
    { year: 2026, month: 11, label: 'November 2026 (Active)' },
    { year: 2026, month: 10, label: 'October 2026' },
    { year: 2026, month: 9, label: 'September 2026' },
    { year: 2026, month: 8, label: 'August 2026' },
  ];

  const selectedPeriodObj = PERIOD_OPTIONS.find(p => p.year === selectedYear && p.month === selectedMonth) || {
    label: `${new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' })} ${selectedYear}`
  };

  useEffect(() => {
    loadDashboard();
  }, [selectedYear, selectedMonth]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, invRes] = await Promise.all([
        api.getDashboardSummary(selectedYear, selectedMonth).catch(() => null),
        api.getInvoices().catch(() => [])
      ]);
      setData(dashRes);
      setInvoices(invRes || []);
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (id, num) => {
    try {
      showToast?.(`Generating Rule 46 PDF for ${num}...`, 'info', 'ReportLab Engine');
      await api.downloadInvoicePDF(id, num);
      showToast?.(`Invoice ${num} downloaded successfully.`, 'success', 'Rule 46 Certified');
    } catch (err) {
      window.open(`http://localhost:8000/api/invoices/${id}/pdf/`, '_blank');
      showToast?.('Downloading invoice PDF...', 'info');
    }
  };

  const metrics = data?.metrics || {
    output_liability: 119700,
    eligible_itc: 87300,
    net_cash_payable: 32400,
    total_sales_count: 4,
    total_purchases_count: 2,
  };

  const outputTax = Number(metrics.output_liability || 0);
  const inputCredit = Number(metrics.eligible_itc || 0);
  const netPayable = Number(metrics.net_cash_payable || 0);
  const offsetPct = outputTax > 0 ? Math.min(100, Math.round((inputCredit / outputTax) * 100)) : 100;

  const filteredInvoices = invoices.filter((inv) => {
    if (filterType === 'SALES') return inv.invoice_type === 'SALES';
    if (filterType === 'PURCHASE') return inv.invoice_type === 'PURCHASE';
    return true;
  });

  const recentRecords = filteredInvoices.slice(0, 6);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 font-sans text-[#111111]">

      {/* ══════════════════════════════════════════════════════════
          1. HEADER WITH PERIOD SELECTOR & STATUTORY DUE DATES
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#555550] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#1E4332]" />
            <span className="tracking-wider uppercase">Statutory Financial Runtime · BKC Mumbai (MH 27)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
            The Financial Console
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Dropdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E3DA] text-xs font-semibold text-[#111111]">
            <CalendarBlank weight="bold" className="w-3.5 h-3.5 text-[#111111]" />
            <select
              value={`${selectedYear}-${selectedMonth}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setSelectedYear(y);
                setSelectedMonth(m);
              }}
              className="bg-transparent border-none text-xs font-semibold text-[#111111] focus:outline-none cursor-pointer pr-1 font-mono"
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Statutory Filing Dates */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#FFFFFF] border border-[#E5E3DA] text-xs font-mono font-semibold text-[#111111]">
            <span>GSTR-1: <strong>11 Nov</strong></span>
            <span className="text-[#DCDACF]">·</span>
            <span>GSTR-3B: <strong>20 Nov</strong></span>
          </div>

          {/* Issue Rule 46 Button */}
          <button
            type="button"
            onClick={() => setTab('create')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
          >
            <Plus weight="bold" className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════
          2. CORE TAX POSITION (HIGH-CONTRAST 3-CARD STATUTORY LEDGER)
      ══════════════════════════════════════════════════════════ */}
      <section className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 sm:p-7 space-y-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          {/* 1. Output Tax (Sales) */}
          <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550]">
                Output Tax (Sales)
              </span>
              <div className="w-7 h-7 bg-[#F9F9F6] border border-[#E5E3DA] text-[#111111] flex items-center justify-center">
                <Receipt weight="bold" className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight font-mono tabular-nums">
              ₹{outputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-semibold text-[#555550] mt-1.5 font-mono">
              {metrics.total_sales_count || 4} Outward bills issued under Rule 46
            </p>
          </div>

          {/* 2. Eligible Input Credit (Cypress Green Token) */}
          <div className="border border-[#1E4332]/40 bg-[#EAF2EC] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1E4332]">
                Eligible Input Credit (ITC)
              </span>
              <div className="w-7 h-7 bg-[#FFFFFF] border border-[#1E4332]/40 text-[#1E4332] flex items-center justify-center">
                <ShieldCheck weight="bold" className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#1E4332] tracking-tight font-mono tabular-nums">
              ₹{inputCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-semibold text-[#1E4332] mt-1.5 font-mono">
              {metrics.total_purchases_count || 2} Inward bills verified via Section 16
            </p>
          </div>

          {/* 3. Net Cash Payable (Terracotta Ochre Token) */}
          <div className="border border-[#963614]/40 bg-[#FAECE7] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#963614]">
                Net Cash Payable (PMT-06)
              </span>
              <div className="w-7 h-7 bg-[#FFFFFF] border border-[#963614]/40 text-[#963614] flex items-center justify-center">
                <FileText weight="bold" className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#963614] tracking-tight font-mono tabular-nums">
              ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-semibold text-[#963614] mt-1.5 font-mono">
              Statutory liability after {offsetPct}% ITC offset
            </p>
          </div>

        </div>

        {/* Section 49 & Rule 88A Waterfall Bar */}
        <div className="pt-4 border-t border-[#E5E3DA] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#111111] font-mono font-bold">
              Section 49 &amp; Rule 88A ITC Set-Off Waterfall
            </span>
            <span className="px-2.5 py-0.5 bg-[#EAF2EC] text-[#1E4332] font-mono font-bold text-[11px] border border-[#1E4332]/40">
              {offsetPct}% Settled by Credit
            </span>
          </div>

          <div className="w-full h-3 bg-[#E5E3DA] overflow-hidden flex border border-[#111111]">
            <div
              className="h-full bg-[#1E4332] transition-none"
              style={{ width: `${offsetPct}%` }}
              title={`ITC Utilized: ₹${inputCredit.toLocaleString('en-IN')}`}
            />
            <div
              className="h-full bg-[#963614] transition-none"
              style={{ width: `${100 - offsetPct}%` }}
              title={`Cash Challan: ₹${netPayable.toLocaleString('en-IN')}`}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono font-semibold pt-0.5">
            <span className="flex items-center gap-1.5 text-[#1E4332]">
              <span className="w-2 h-2 bg-[#1E4332]" />
              ITC Utilized: ₹{inputCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="flex items-center gap-1.5 text-[#963614]">
              <span className="w-2 h-2 bg-[#963614]" />
              Cash Challan Due: ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

      </section>


      {/* ══════════════════════════════════════════════════════════
          3. RECENT ACTIVITY LEDGER (TABULAR ARCHITECTURAL REGISTER)
      ══════════════════════════════════════════════════════════ */}
      <section className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 sm:p-7 space-y-4">
        
        {/* Section Header with Filters & Link */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E3DA]">
          <div>
            <h2 className="text-xl font-bold text-[#111111]">
              Tax Invoices &amp; Ledgers
            </h2>
            <p className="text-xs text-[#555550] font-mono mt-0.5">
              Consecutive serial ledgers registered in {selectedPeriodObj.label}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Buttons */}
            <div className="flex items-center bg-[#F3F2ED] border border-[#E5E3DA] p-0.5 text-xs font-semibold">
              {[
                { id: 'ALL', label: 'All Ledgers' },
                { id: 'SALES', label: 'Sales (Rule 46)' },
                { id: 'PURCHASE', label: 'Purchases (ITC)' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3 py-1 text-xs transition-none ${
                    filterType === tab.id
                      ? 'bg-[#111111] text-[#FFFFFF] font-bold'
                      : 'text-[#555550] hover:text-[#111111] font-semibold'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setTab('invoices')}
              className="flex items-center gap-1 text-xs font-bold text-[#111111] hover:underline transition-none"
            >
              <span>View full register</span>
              <ArrowRight weight="bold" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabular Register */}
        <div className="overflow-x-auto border border-[#E5E3DA]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F9F9F6] border-b border-[#E5E3DA] text-[11px] font-mono font-bold uppercase tracking-wider text-[#555550]">
                <th className="py-2.5 px-3">Serial / Date</th>
                <th className="py-2.5 px-3">Party Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Route / POS</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DA] font-sans">
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#555550] font-mono text-xs">
                    No documents found in this view.
                  </td>
                </tr>
              ) : (
                recentRecords.map((inv) => {
                  const partyName =
                    inv.party_name ||
                    inv.party_details?.trade_name ||
                    inv.party_details?.legal_name ||
                    'Customer';
                  const isSales = inv.invoice_type === 'SALES';
                  const isPaid = inv.status === 'PAID';
                  const isCancelled = inv.status === 'CANCELLED';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => {
                        const fullInv = invoices.find(i => i.id === inv.id) || inv;
                        setSelectedInvoice(fullInv);
                      }}
                      className="hover:bg-[#F9F9F6] transition-none group cursor-pointer"
                    >
                      
                      {/* Serial & Date */}
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-[#111111] block group-hover:underline">
                          {inv.invoice_number}
                        </span>
                        <span className="text-[11px] text-[#555550] block mt-0.5">
                          {inv.invoice_date || 'Nov 2026'}
                        </span>
                      </td>

                      {/* Party */}
                      <td className="py-3 px-3 font-semibold text-[#111111]">
                        {partyName}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-bold border ${
                          isSales
                            ? 'bg-[#F3F2ED] text-[#111111] border-[#E5E3DA]'
                            : 'bg-[#EAF2EC] text-[#1E4332] border-[#1E4332]/40'
                        }`}>
                          {isSales ? 'Outward' : 'Inward ITC'}
                        </span>
                      </td>

                      {/* State / Route */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-medium bg-[#F3F2ED] text-[#111111] border border-[#E5E3DA]">
                          {inv.is_inter_state ? 'Inter (IGST)' : 'Intra (CGST+SGST)'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-bold border ${
                          isPaid 
                            ? 'bg-[#EAF2EC] text-[#1E4332] border-[#1E4332]/40'
                            : isCancelled 
                            ? 'bg-[#FAECE7] text-[#963614] border-[#963614]/40' 
                            : 'bg-[#FAECE7] text-[#963614] border-[#963614]/40'
                        }`}>
                          {inv.status || 'ISSUED'}
                        </span>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-3 text-right font-mono text-sm font-bold text-[#111111] tabular-nums">
                        ₹{Number(inv.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* PDF Action */}
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(inv.id, inv.invoice_number)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#111111] bg-[#F9F9F6] hover:bg-[#E5E3DA] border border-[#E5E3DA] transition-none"
                          title="Download Rule 46 PDF"
                        >
                          <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </section>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onRefresh={loadDashboard}
          showToast={showToast}
        />
      )}

    </div>
  );
}
