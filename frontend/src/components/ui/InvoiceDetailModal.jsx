import React, { useState } from 'react';
import {
  X,
  DownloadSimple
} from '@phosphor-icons/react';
import { api } from '../../services/api';

export default function InvoiceDetailModal({ invoice, onClose, onRefresh, showToast }) {
  const [updating, setUpdating] = useState(false);

  if (!invoice) return null;

  const handleDownloadPDF = async () => {
    try {
      showToast?.(`Downloading PDF for ${invoice.invoice_number}...`, 'info');
      await api.downloadInvoicePDF(invoice.id, invoice.invoice_number);
    } catch (err) {
      window.open(`http://localhost:8000/api/invoices/${invoice.id}/pdf/`, '_blank');
    }
  };

  const handleMarkPaid = async () => {
    try {
      setUpdating(true);
      await api.markInvoicePaid(invoice.id);
      showToast?.(`Invoice ${invoice.invoice_number} marked as Paid`, 'success');
      onRefresh?.();
      onClose?.();
    } catch (err) {
      showToast?.('Error updating status: ' + err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!window.confirm(`Are you sure you want to cancel invoice ${invoice.invoice_number}? Under Rule 46, this action cannot be undone.`)) {
      return;
    }
    try {
      setUpdating(true);
      await api.cancelInvoice(invoice.id);
      showToast?.(`Invoice ${invoice.invoice_number} cancelled`, 'info', 'Rule 46 Audit Preserved');
      onRefresh?.();
      onClose?.();
    } catch (err) {
      showToast?.('Error cancelling invoice: ' + err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const party = invoice.party_details || {};
  const isCancelled = invoice.status === 'CANCELLED';
  const isPaid = invoice.status === 'PAID';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 font-sans">
      <div className="bg-[#FFFFFF] border border-[#111111] max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-[#111111]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E5E3DA] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#111111] bg-[#F3F2ED] border border-[#E5E3DA] px-2 py-0.5">
                {invoice.invoice_type === 'SALES' ? 'Outward Tax Invoice' : 'Inward Purchase Bill'}
              </span>
              <span className={`px-2 py-0.5 text-xs font-mono font-bold border ${
                isPaid 
                  ? 'bg-[#EAF2EC] text-[#1E4332] border-[#1E4332]/40' 
                  : isCancelled 
                  ? 'bg-[#FAECE7] text-[#963614] border-[#963614]/40' 
                  : 'bg-[#FAECE7] text-[#963614] border-[#963614]/40'
              }`}>
                {invoice.status}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight font-mono">
              {invoice.invoice_number}
            </h2>
            <p className="text-xs text-[#555550] font-mono">
              Issued on <strong>{invoice.invoice_date}</strong> · Rule 46 Certified
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#555550] hover:text-[#111111] hover:bg-[#F3F2ED] transition-none"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        {/* Counterparty & Routing Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F9F9F6] border border-[#E5E3DA] text-xs">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#555550] block mb-1">
              Billed To / Counterparty
            </span>
            <p className="font-bold text-[#111111] text-sm">
              {party.legal_name || 'Customer'}
            </p>
            {party.trade_name && (
              <p className="text-[#555550] font-mono text-xs">Trade: {party.trade_name}</p>
            )}
            <p className="text-[#111111] font-mono text-xs mt-1">
              GSTIN: <strong className="text-[#111111]">{party.gstin || 'Unregistered B2C'}</strong>
            </p>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#555550] block mb-1">
              Place of Supply &amp; Routing
            </span>
            <p className="font-bold text-[#111111] text-sm">
              {invoice.place_of_supply_state_name} ({invoice.place_of_supply_state_code})
            </p>
            <p className="text-[#555550] font-medium text-xs mt-0.5">
              Tax Regime: <span className="font-semibold text-[#111111]">{invoice.is_inter_state ? 'Inter-State (100% IGST)' : 'Intra-State (50/50 CGST+SGST)'}</span>
            </p>
            <p className="text-[#555550] font-mono text-xs">
              Reverse Charge: {invoice.is_reverse_charge ? 'Yes (RCM Sec 9)' : 'No'}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550] block">
            Statutory Line Items
          </span>

          <div className="overflow-x-auto border border-[#E5E3DA]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F6] border-b border-[#E5E3DA] text-[11px] font-mono font-bold uppercase tracking-wider text-[#555550]">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-2">HSN/SAC</th>
                  <th className="py-2.5 px-2 text-right">Qty</th>
                  <th className="py-2.5 px-2 text-right">Rate</th>
                  <th className="py-2.5 px-2 text-center">GST</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DA] font-mono">
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#F9F9F6] transition-none">
                    <td className="py-2.5 px-3 font-sans font-semibold text-[#111111]">
                      {item.item_description}
                    </td>
                    <td className="py-2.5 px-2 text-[#111111] font-bold text-xs">
                      {item.hsn_sac_code}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#555550]">
                      {item.quantity} {item.uqc_unit}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#111111] font-medium tabular-nums">
                      ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-center text-[#111111] font-bold">
                      {item.gst_rate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#111111] tabular-nums">
                      ₹{Number(item.total_item_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tax Breakdown & Totals */}
        <div className="p-4 bg-[#F9F9F6] border border-[#E5E3DA] space-y-2 text-xs font-mono">
          <div className="flex justify-between text-[#555550] font-medium">
            <span>Total Taxable Value</span>
            <span className="font-bold text-[#111111] tabular-nums">₹{Number(invoice.total_taxable_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          {invoice.is_inter_state ? (
            <div className="flex justify-between text-[#111111] font-semibold">
              <span>Integrated Tax (IGST)</span>
              <span className="tabular-nums">₹{Number(invoice.total_igst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-[#111111] font-semibold">
                <span>Central Tax (CGST)</span>
                <span className="tabular-nums">₹{Number(invoice.total_cgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[#111111] font-semibold">
                <span>State Tax (SGST)</span>
                <span className="tabular-nums">₹{Number(invoice.total_sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}

          {Number(invoice.round_off_amount) !== 0 && (
            <div className="flex justify-between text-[#555550] text-xs">
              <span>Section 170 Rounding</span>
              <span className="tabular-nums">{Number(invoice.round_off_amount) > 0 ? `+₹${invoice.round_off_amount}` : `-₹${Math.abs(Number(invoice.round_off_amount))}`}</span>
            </div>
          )}

          <div className="flex justify-between pt-2.5 border-t border-[#E5E3DA] font-sans items-center">
            <span className="font-extrabold text-[#111111] text-base">Grand Total</span>
            <span className="font-mono text-2xl font-black text-[#111111] tabular-nums">
              ₹{Number(invoice.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {invoice.grand_total_words && (
            <div className="text-xs text-[#555550] font-mono italic pt-1 border-t border-[#E5E3DA]">
              {invoice.grand_total_words}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5E3DA]">
          <div className="flex items-center gap-2">
            {!isPaid && !isCancelled && (
              <button
                type="button"
                disabled={updating}
                onClick={handleMarkPaid}
                className="px-4 py-2 bg-[#1E4332] hover:bg-[#153023] text-[#FFFFFF] text-xs font-bold transition-none disabled:opacity-50"
              >
                Mark as Paid
              </button>
            )}

            {!isCancelled && (
              <button
                type="button"
                disabled={updating}
                onClick={handleCancelInvoice}
                className="px-4 py-2 bg-[#FAECE7] hover:bg-[#F3D7CD] text-[#963614] border border-[#963614]/40 text-xs font-bold transition-none disabled:opacity-50"
              >
                Cancel Invoice
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
            >
              <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
              <span>Download Rule 46 PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
