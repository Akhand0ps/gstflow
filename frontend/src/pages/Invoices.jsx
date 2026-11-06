import React, { useState, useEffect } from 'react';
import {
  Plus,
  MagnifyingGlass,
  DownloadSimple,
  Receipt,
  ShieldCheck,
  FileText
} from '@phosphor-icons/react';
import { api } from '../services/api';
import InvoiceDetailModal from '../components/ui/InvoiceDetailModal';

export default function Invoices({ setTab, showToast }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'SALES' | 'PURCHASE'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.getInvoices();
      setInvoices(res || []);
    } catch (err) {
      console.warn('Failed to load invoices:', err);
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

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      !searchQuery ||
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.party_details?.legal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.party_details?.trade_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.party_details?.gstin?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      filterType === 'ALL' || inv.invoice_type === filterType;

    return matchesSearch && matchesType;
  });

  const salesInvoices = invoices.filter((i) => i.invoice_type === 'SALES');
  const purchaseBills = invoices.filter((i) => i.invoice_type === 'PURCHASE');

  const totalSalesValue = salesInvoices.reduce((sum, i) => sum + parseFloat(i.grand_total || 0), 0);
  const totalPurchaseValue = purchaseBills.reduce((sum, i) => sum + parseFloat(i.grand_total || 0), 0);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 font-sans text-[#111111]">

      {/* ══════════════════════════════════════════════════════════
          1. HEADER WITH ACTIONS
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#555550] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#1E4332]" />
            <span className="tracking-wider uppercase">Statutory Document Register · CGST Rule 46</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
            Tax Invoices &amp; Ledgers
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTab?.('create')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
          >
            <Plus weight="bold" className="w-3.5 h-3.5" />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════
          2. SUMMARY STRIP (HIGH CONTRAST METRICS)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Outward Sales */}
        <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550]">
              Outward Invoices (Rule 46)
            </span>
            <div className="w-7 h-7 bg-[#F9F9F6] border border-[#E5E3DA] text-[#111111] flex items-center justify-center">
              <Receipt weight="bold" className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight font-mono tabular-nums">
            ₹{totalSalesValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs font-semibold text-[#555550] mt-1.5 font-mono">
            {salesInvoices.length} Sequential series registered
          </p>
        </div>

        {/* Inward Purchases (ITC - Cypress Green Token) */}
        <div className="border border-[#1E4332]/40 bg-[#EAF2EC] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1E4332]">
              Inward Purchase Bills (ITC)
            </span>
            <div className="w-7 h-7 bg-[#FFFFFF] border border-[#1E4332]/40 text-[#1E4332] flex items-center justify-center">
              <ShieldCheck weight="bold" className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-[#1E4332] tracking-tight font-mono tabular-nums">
            ₹{totalPurchaseValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs font-semibold text-[#1E4332] mt-1.5 font-mono">
            {purchaseBills.length} GSTR-2B reconciled bills
          </p>
        </div>

        {/* Total Count */}
        <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550]">
              Total Recorded Volume
            </span>
            <div className="w-7 h-7 bg-[#F9F9F6] border border-[#E5E3DA] text-[#111111] flex items-center justify-center">
              <FileText weight="bold" className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight font-mono tabular-nums">
            {invoices.length} Invoices
          </p>
          <p className="text-xs font-semibold text-[#555550] mt-1.5 font-mono">
            Active audit trail preserved
          </p>
        </div>

      </div>


      {/* ══════════════════════════════════════════════════════════
          3. STATUTORY LEDGER WORKSPACE TABLE
      ══════════════════════════════════════════════════════════ */}
      <section className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 sm:p-7 space-y-4">
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E3DA]">
          
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
                className={`px-3.5 py-1.5 text-xs transition-none ${
                  filterType === tab.id
                    ? 'bg-[#111111] text-[#FFFFFF] font-bold'
                    : 'text-[#555550] hover:text-[#111111] font-semibold'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlass className="w-3.5 h-3.5 text-[#555550] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search serial, party or GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#F9F9F6] border border-[#E5E3DA] text-xs text-[#111111] placeholder-[#555550]/60 focus:outline-none focus:border-[#111111] w-56 sm:w-72 font-mono font-medium"
            />
          </div>
        </div>

        {/* Tabular Ledger */}
        <div className="overflow-x-auto border border-[#E5E3DA]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F9F9F6] border-b border-[#E5E3DA] text-[11px] font-mono font-bold uppercase tracking-wider text-[#555550]">
                <th className="py-2.5 px-3">Serial / Date</th>
                <th className="py-2.5 px-3">Recipient / Supplier</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Place of Supply</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
                <th className="py-2.5 px-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DA] font-sans">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#555550] font-mono text-xs">
                    No sequential invoices match your active filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSales = inv.invoice_type === 'SALES';
                  const isPaid = inv.status === 'PAID';
                  const isCancelled = inv.status === 'CANCELLED';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className="hover:bg-[#F9F9F6] transition-none cursor-pointer group"
                    >
                      
                      {/* Serial & Date */}
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-[#111111] block group-hover:underline">
                          {inv.invoice_number}
                        </span>
                        <span className="text-[11px] text-[#555550] block mt-0.5">
                          {inv.invoice_date}
                        </span>
                      </td>

                      {/* Party Details */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#111111] block">
                          {inv.party_details?.trade_name || inv.party_details?.legal_name}
                        </span>
                        <span className="text-xs font-mono text-[#555550] block mt-0.5">
                          {inv.party_details?.gstin || 'Unregistered B2C'} · {inv.party_details?.state_name}
                        </span>
                      </td>

                      {/* Invoice Type */}
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 text-[11px] font-mono font-bold border ${
                          isSales 
                            ? 'bg-[#F3F2ED] text-[#111111] border-[#E5E3DA]' 
                            : 'bg-[#EAF2EC] text-[#1E4332] border-[#1E4332]/40'
                        }`}>
                          {isSales ? 'Outward' : 'Inward ITC'}
                        </span>
                      </td>

                      {/* Place of Supply */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#111111] block text-xs">
                          {inv.place_of_supply_state_name} ({inv.place_of_supply_state_code})
                        </span>
                        <span className="inline-block px-1.5 py-0.2 text-[10px] font-mono font-medium mt-0.5 bg-[#F3F2ED] text-[#111111] border border-[#E5E3DA]">
                          {inv.is_inter_state ? '18% IGST' : '9% CGST + 9% SGST'}
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

                      {/* Taxable Value */}
                      <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-[#555550] tabular-nums">
                        ₹{Number(inv.total_taxable_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#111111] text-sm tabular-nums">
                        ₹{Number(inv.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* PDF Export Action */}
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
          onRefresh={loadInvoices}
          showToast={showToast}
        />
      )}

    </div>
  );
}
