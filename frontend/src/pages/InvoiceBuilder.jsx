import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash,
  DownloadSimple,
  CheckCircle,
  CaretDown,
  Receipt
} from '@phosphor-icons/react';
import { api } from '../services/api';

export default function InvoiceBuilder({ setTab, business, showToast }) {
  const [invoiceType, setInvoiceType] = useState('SALES');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [parties, setParties] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [notes, setNotes] = useState('Payment terms: Net 30 days via NEFT/RTGS.');
  const [saving, setSaving] = useState(false);

  const partyRef = useRef(null);

  // Line items
  const [items, setItems] = useState([
    {
      productId: '',
      itemDescription: 'Enterprise Cloud Virtual Machine Cluster',
      hsnSacCode: '998314',
      uqcUnit: 'OTH',
      quantity: 1,
      unitPrice: 50000,
      discountAmount: 0,
      gstRate: 18.0
    }
  ]);

  useEffect(() => {
    loadPrerequisites();
  }, [invoiceType]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (partyRef.current && !partyRef.current.contains(event.target)) {
        setPartyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPrerequisites = async () => {
    try {
      const [nextNumRes, partiesRes, catalogRes] = await Promise.all([
        api.getNextInvoiceNumber(invoiceType),
        api.getParties(invoiceType === 'SALES' ? 'CUSTOMER' : 'VENDOR'),
        api.getCatalog()
      ]);
      setInvoiceNumber(nextNumRes.next_invoice_number);
      setParties(partiesRes || []);
      setCatalog(catalogRes || []);
      if (partiesRes && partiesRes.length > 0) {
        setSelectedPartyId(partiesRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load prerequisites:', err);
    }
  };

  const selectedParty = parties.find(p => p.id === selectedPartyId);
  const supplierState = business?.state_code || '27';
  const supplierStateName = business?.state_name || 'Maharashtra';
  const recipientState = selectedParty?.state_code || supplierState;
  const recipientStateName = selectedParty?.state_name || supplierStateName;
  const isInterState = recipientState !== supplierState;

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleProductSelect = (index, productId) => {
    const prod = catalog.find(p => p.id === productId);
    if (prod) {
      const updated = [...items];
      updated[index].productId = prod.id;
      updated[index].itemDescription = prod.name;
      updated[index].hsnSacCode = prod.hsn_sac_code;
      updated[index].uqcUnit = prod.uqc_unit;
      updated[index].unitPrice = parseFloat(prod.unit_price);
      updated[index].gstRate = parseFloat(prod.gst_rate);
      setItems(updated);
    }
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        productId: '',
        itemDescription: '',
        hsnSacCode: '998314',
        uqcUnit: 'OTH',
        quantity: 1,
        unitPrice: 10000,
        discountAmount: 0,
        gstRate: 18.0
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Live Calculations
  let subtotalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  items.forEach(itm => {
    const lineGross = (parseFloat(itm.quantity) || 0) * (parseFloat(itm.unitPrice) || 0);
    const lineTaxable = Math.max(0, lineGross - (parseFloat(itm.discountAmount) || 0));
    subtotalTaxable += lineTaxable;

    const rate = parseFloat(itm.gstRate) || 0;
    if (isInterState) {
      totalIGST += lineTaxable * (rate / 100);
    } else {
      const halfRate = rate / 2;
      totalCGST += lineTaxable * (halfRate / 100);
      totalSGST += lineTaxable * (halfRate / 100);
    }
  });

  const rawGrandTotal = subtotalTaxable + totalCGST + totalSGST + totalIGST;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = roundedGrandTotal - rawGrandTotal;

  const handleSaveInvoice = async () => {
    if (!selectedPartyId) {
      showToast?.('Please select a recipient party.', 'error');
      return;
    }
    if (items.some(i => !i.itemDescription)) {
      showToast?.('Please enter description for all line items.', 'error');
      return;
    }

    try {
      setSaving(true);
      showToast?.('Computing statutory taxes & generating Rule 46 PDF...', 'info', 'ReportLab Engine');
      const payload = {
        invoice_type: invoiceType,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        party: selectedPartyId,
        place_of_supply_state_code: recipientState,
        is_reverse_charge: false,
        notes: notes,
        items: items.map(i => ({
          product: i.productId || null,
          item_description: i.itemDescription,
          hsn_sac_code: i.hsnSacCode || '998314',
          uqc_unit: i.uqcUnit || 'OTH',
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unitPrice) || 0,
          discount_amount: parseFloat(i.discountAmount || 0),
          gst_rate: parseFloat(i.gstRate) || 18
        }))
      };

      const created = await api.createInvoice(payload);
      showToast?.(`Invoice ${created.invoice_number} issued successfully!`, 'success', 'Rule 46 Certified');
      await api.downloadInvoicePDF(created.id, created.invoice_number);
      setTab('invoices');
    } catch (err) {
      showToast?.('Error creating invoice: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20 font-sans text-[#111111]">

      {/* ══════════════════════════════════════════════════════════
          1. TOP NAVIGATION & INVOICE TYPE TOGGLE
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTab('invoices')}
            className="w-8 h-8 bg-[#FFFFFF] border border-[#E5E3DA] hover:bg-[#F3F2ED] flex items-center justify-center text-[#111111] transition-none"
            title="Back to Invoices"
          >
            <ArrowLeft weight="bold" className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#555550] mb-0.5">
              <span className="w-2 h-2 rounded-full bg-[#1E4332]" />
              <span>Section 31 &amp; Rule 46 Statutory Specification</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              Create Tax Invoice
            </h1>
          </div>
        </div>

        {/* Invoice Type Pill Toggle */}
        <div className="flex items-center bg-[#F3F2ED] border border-[#E5E3DA] p-0.5 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setInvoiceType('SALES')}
            className={`px-4 py-1.5 transition-none ${
              invoiceType === 'SALES'
                ? 'bg-[#111111] text-[#FFFFFF] font-bold'
                : 'text-[#555550] hover:text-[#111111] font-medium'
            }`}
          >
            Sales (Outward)
          </button>
          <button
            type="button"
            onClick={() => setInvoiceType('PURCHASE')}
            className={`px-4 py-1.5 transition-none ${
              invoiceType === 'PURCHASE'
                ? 'bg-[#111111] text-[#FFFFFF] font-bold'
                : 'text-[#555550] hover:text-[#111111] font-medium'
            }`}
          >
            Purchase (ITC)
          </button>
        </div>

      </div>


      {/* ══════════════════════════════════════════════════════════
          2. UNIFIED INVOICE SHEET
      ══════════════════════════════════════════════════════════ */}
      <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 sm:p-8 space-y-7">
        
        {/* Document Header Metadata Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-[#E5E3DA]">
          
          {/* Invoice Serial */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550] block mb-1.5">
              Invoice Serial (Rule 46)
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs font-mono font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
            />
          </div>

          {/* Invoice Date */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550] block mb-1.5">
              Invoice Date
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs font-mono font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
            />
          </div>

          {/* Place of Supply Tag */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550] block mb-1.5">
              Place of Supply &amp; Route
            </label>
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#F9F9F6] border border-[#E5E3DA] text-xs font-mono">
              <span className="font-semibold text-[#111111]">
                {recipientStateName} ({recipientState})
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-bold border ${
                isInterState
                  ? 'bg-[#F3F2ED] text-[#111111] border-[#111111]'
                  : 'bg-[#EAF2EC] text-[#1E4332] border-[#1E4332]/40'
              }`}>
                {isInterState ? '100% IGST' : '9% CGST + 9% SGST'}
              </span>
            </div>
          </div>

        </div>


        {/* Custom Recipient / Party Selector */}
        <div ref={partyRef} className="relative space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550]">
              {invoiceType === 'SALES' ? 'Recipient / Customer Party' : 'Supplier / Vendor Party'}
            </label>
            <span className="text-xs font-mono font-bold text-[#111111]">
              {selectedParty?.gstin ? `GSTIN: ${selectedParty.gstin}` : 'Unregistered B2C'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPartyDropdownOpen(!partyDropdownOpen)}
            className="w-full flex items-center justify-between bg-[#F9F9F6] hover:bg-[#F3F2ED] border border-[#E5E3DA] px-4 py-3 text-left transition-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#111111] text-[#FFFFFF] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                {selectedParty?.trade_name?.slice(0, 2).toUpperCase() || selectedParty?.legal_name?.slice(0, 2).toUpperCase() || 'PA'}
              </div>
              <div>
                <p className="text-xs font-bold text-[#111111]">
                  {selectedParty?.trade_name || selectedParty?.legal_name || 'Select a registered party...'}
                </p>
                <p className="text-[11px] font-mono text-[#555550] font-medium">
                  {selectedParty?.billing_address || 'Registered Address'} · {selectedParty?.state_name} ({selectedParty?.state_code})
                </p>
              </div>
            </div>

            <CaretDown weight="bold" className={`w-4 h-4 text-[#555550] transition-transform ${partyDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Custom Dropdown List */}
          {partyDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#FFFFFF] border border-[#111111] overflow-hidden py-1 divide-y divide-[#E5E3DA] max-h-60 overflow-y-auto">
              {parties.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPartyId(p.id);
                    setPartyDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-[#F3F2ED] transition-none ${
                    selectedPartyId === p.id ? 'bg-[#F3F2ED] font-bold' : ''
                  }`}
                >
                  <div>
                    <span className="font-semibold text-[#111111]">{p.trade_name || p.legal_name}</span>
                    <span className="text-[11px] font-mono text-[#555550] block">
                      {p.gstin || 'B2C'} · {p.state_name} ({p.state_code})
                    </span>
                  </div>
                  {selectedPartyId === p.id && (
                    <CheckCircle weight="fill" className="w-4 h-4 text-[#1E4332]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>


        {/* ══════════════════════════════════════════════════════════
            3. LINE ITEMS SPREADSHEET TABLE
        ══════════════════════════════════════════════════════════ */}
        <div className="space-y-3 pt-2">
          
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E3DA]">
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550]">
                Line Items (Rule 46 Certified)
              </h2>
              <p className="text-xs text-[#555550]">
                HSN/SAC tagged items with statutory rate calculations
              </p>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center gap-1 px-3 py-1 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
            >
              <Plus weight="bold" className="w-3 h-3" />
              <span>Add Row</span>
            </button>
          </div>

          {/* Grid Headers */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[11px] font-mono font-bold text-[#555550] uppercase tracking-wider px-1">
            <span className="col-span-3">Catalog Item</span>
            <span className="col-span-3">Description</span>
            <span className="col-span-1">HSN/SAC</span>
            <span className="col-span-1 text-center">Qty</span>
            <span className="col-span-2 text-right">Unit Price (₹)</span>
            <span className="col-span-1 text-center">GST Slab</span>
            <span className="col-span-1 text-right">Total (₹)</span>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {items.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-3 bg-[#F9F9F6] border border-[#E5E3DA]"
              >
                {/* Catalog Select */}
                <div className="sm:col-span-3">
                  <select
                    value={row.productId}
                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E5E3DA] px-2.5 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  >
                    <option value="">-- Custom Item --</option>
                    {catalog.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Item description..."
                    value={row.itemDescription}
                    onChange={(e) => handleItemChange(idx, 'itemDescription', e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E5E3DA] px-2.5 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>

                {/* HSN/SAC */}
                <div className="sm:col-span-1">
                  <input
                    type="text"
                    placeholder="998314"
                    value={row.hsnSacCode}
                    onChange={(e) => handleItemChange(idx, 'hsnSacCode', e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E5E3DA] px-2 py-1.5 text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>

                {/* Quantity */}
                <div className="sm:col-span-1">
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E5E3DA] px-2 py-1.5 text-xs font-mono text-center text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>

                {/* Unit Price */}
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    step="100"
                    value={row.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E5E3DA] px-2.5 py-1.5 text-xs font-mono font-bold text-[#111111] text-right focus:outline-none focus:border-[#111111]"
                  />
                </div>

                {/* GST Rate Selector */}
                <div className="sm:col-span-1 text-center">
                  <select
                    value={row.gstRate}
                    onChange={(e) => handleItemChange(idx, 'gstRate', parseFloat(e.target.value))}
                    className="bg-[#FFFFFF] border border-[#E5E3DA] px-1.5 py-1.5 text-xs font-mono font-bold text-[#111111] focus:outline-none text-center"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                {/* Total & Trash */}
                <div className="sm:col-span-1 flex items-center justify-end gap-1.5">
                  <span className="font-mono text-xs font-bold text-[#111111] tabular-nums">
                    ₹{Math.round(((row.quantity * row.unitPrice) - row.discountAmount) * (1 + row.gstRate/100)).toLocaleString('en-IN')}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1 text-[#555550] hover:text-[#963614] transition-none"
                      title="Remove Row"
                    >
                      <Trash weight="bold" className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>

        </div>


        {/* ══════════════════════════════════════════════════════════
            4. NOTES & STATUTORY SUMMARY
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-6 border-t border-[#E5E3DA] items-start">
          
          {/* Notes */}
          <div className="md:col-span-6 space-y-2">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550] block">
              Invoice Terms &amp; Payment Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#F9F9F6] border border-[#E5E3DA] p-3 text-xs text-[#111111] placeholder-[#555550]/60 focus:outline-none focus:border-[#111111] resize-none font-sans font-medium"
              placeholder="Payment terms, bank details, reverse charge notes..."
            />
            <p className="text-xs font-mono font-semibold text-[#555550]">
              Section 31 &amp; Rule 46 server-certified serialization
            </p>
          </div>

          {/* Tax Calculation Totals */}
          <div className="md:col-span-6 space-y-3">
            <div className="p-5 bg-[#F9F9F6] border border-[#E5E3DA] space-y-2 text-xs font-mono">
              
              <div className="flex items-center justify-between text-[#555550] font-medium">
                <span>Taxable Subtotal:</span>
                <span className="font-bold text-[#111111] tabular-nums">
                  ₹{subtotalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {isInterState ? (
                <div className="flex items-center justify-between text-[#111111] font-semibold">
                  <span>Integrated GST (IGST 18%):</span>
                  <span className="font-bold tabular-nums">
                    ₹{totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[#111111] font-semibold">
                    <span>Central GST (CGST 9%):</span>
                    <span className="font-bold tabular-nums">
                      ₹{totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#111111] font-semibold">
                    <span>State GST (SGST 9%):</span>
                    <span className="font-bold tabular-nums">
                      ₹{totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between text-[#555550] text-xs">
                <span>Section 170 Round-off:</span>
                <span className="tabular-nums">₹{roundOff.toFixed(2)}</span>
              </div>

              <div className="pt-2.5 border-t border-[#E5E3DA] flex items-center justify-between font-sans">
                <span className="text-xs uppercase font-extrabold text-[#111111]">Grand Total:</span>
                <span className="font-mono text-2xl font-black text-[#111111] tabular-nums">
                  ₹{roundedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

            </div>

            {/* Direct Issue Action Button */}
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveInvoice}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none disabled:opacity-50"
            >
              <DownloadSimple weight="bold" className="w-4 h-4" />
              <span>{saving ? 'Issuing Certified PDF...' : 'Issue & Download Rule 46 PDF'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
