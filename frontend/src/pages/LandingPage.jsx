import React, { useState } from 'react';
import {
  ArrowRight,
  DownloadSimple,
  ShieldCheck,
  Receipt,
  FilePdf
} from '@phosphor-icons/react';
import { api } from '../services/api';
import GSTINInspectorWidget from '../components/ui/GSTINInspectorWidget';

// Indian Commerce Imagery
import traderLedgerImg from '../assets/generated/indian_trader_ledger.jpg';
import vintageInvoiceImg from '../assets/generated/vintage_invoice_still_life.jpg';

export default function LandingPage({ setTab, showToast }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadSample = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      showToast?.('Generating Rule 46 certified Tax Invoice PDF...', 'info', 'ReportLab Engine');
      const invoices = await api.getInvoices('SALES');
      if (invoices && invoices.length > 0) {
        await api.downloadInvoicePDF(invoices[0].id, invoices[0].invoice_number);
        showToast?.(`Downloaded ${invoices[0].invoice_number} successfully.`, 'success', 'PDF Ready');
      } else {
        window.open('http://localhost:8000/api/invoices/1a45ecac-144f-4150-92ec-21e19ca966dd/pdf/', '_blank');
        showToast?.('Sample invoice downloaded.', 'success');
      }
    } catch (e) {
      window.open('http://localhost:8000/api/invoices/1a45ecac-144f-4150-92ec-21e19ca966dd/pdf/', '_blank');
      showToast?.('Downloading sample Rule 46 PDF...', 'info');
    } finally {
      setDownloading(false);
    }
  };

  const statutes = [
    {
      num: '01',
      code: 'CGST Rule 46',
      title: '16 Mandatory Fields Certified',
      description: 'Enforces consecutive FY serialization, bilingual currency conversion, recipient state routing, and server-side signature validation in Python ReportLab.',
      tag: 'Section 31 Compliance',
    },
    {
      num: '02',
      code: 'CGST Act Sec 49 & Rule 88A',
      title: 'Statutory ITC Waterfall Cascade',
      description: 'Exhausts IGST credit 100% against liabilities before touching CGST/SGST. Cross-utilization between CGST and SGST is mathematically and legally blocked.',
      tag: 'Zero Penal Interest',
    },
    {
      num: '03',
      code: 'Statutory 15-Char Spec',
      title: 'Luhn Modulo-36 Checksum',
      description: 'Pre-validates 2-digit Census state codes (01–38), 10-digit entity PAN, and alphanumeric 15th checksum character before submission to prevent GSTN portal rejections.',
      tag: 'Schema Validated',
    },
    {
      num: '04',
      code: 'CGST Act Sec 170',
      title: 'Bank-Grade Whole Rupee Rounding',
      description: 'Applies statutory ROUND_HALF_UP with a 50-paise boundary to taxable values, tax components, and invoice totals with exact decimal parity.',
      tag: 'GSTN Portal Parity',
    }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto font-sans pb-24 text-[#111111] space-y-12">

      {/* ══════════════════════════════════════════════════════════════
          1. HERO SHOWCASE: "BAHI KHATA" ARCHITECTURAL LEDGER
      ══════════════════════════════════════════════════════════════ */}
      <section className="w-full">
        <div className="relative w-full border border-[#111111] bg-[#111111] min-h-[460px] sm:min-h-[520px] flex flex-col justify-between p-6 sm:p-10">
          
          {/* Background Image: Indian Merchant at Bahi Khata Desk */}
          <div className="absolute inset-0 z-0">
            <img
              src={traderLedgerImg}
              alt="Bahi Khata Indian Commerce"
              className="w-full h-full object-cover object-center filter brightness-[0.65] contrast-[1.10]"
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>

          {/* Top Info Bar */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#111111] text-[#FFFFFF] text-xs font-mono border border-white/20">
              <span className="w-2 h-2 bg-[#1E4332]" />
              <span>Heritage Ledger of Bharat · 1890 to 2026</span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-white/80 font-mono text-xs">
              <span>Rule 46</span>
              <span>·</span>
              <span>Sec 49 Waterfall</span>
            </div>
          </div>

          {/* Center Title */}
          <div className="relative z-10 text-center my-auto py-8 sm:py-12 px-4 space-y-2">
            <h1 className="font-serif italic font-normal text-6xl sm:text-8xl md:text-9xl text-white tracking-[-0.02em] select-none">
              Bahi Khata
            </h1>
            <p className="font-mono text-xs sm:text-sm uppercase tracking-widest text-amber-200 font-bold">
              The Timeless Language of Indian Commerce
            </p>
          </div>

          {/* Bottom Bar: Action Strip */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 w-full pt-4 border-t border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#111111] border border-white/40 flex items-center justify-center font-mono text-xs text-white font-bold">
                GF
              </div>
              <div className="text-left">
                <p className="text-white text-xs sm:text-sm font-bold tracking-wide">
                  CGST Rule 46 Certified
                </p>
                <p className="text-white/70 text-[11px] font-mono">
                  16 Statutory Invoicing Requirements Enforced
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadSample}
                className="flex items-center gap-1.5 px-4 py-2 bg-transparent hover:bg-white/10 text-white border border-white/40 text-xs font-bold transition-none"
              >
                <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
                <span>Sample PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('dashboard')}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#FFFFFF] hover:bg-[#F3F2ED] text-[#111111] text-xs font-bold transition-none"
              >
                <span>Launch Console</span>
                <ArrowRight weight="bold" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          2. STATUTORY STATEMENT & 3 PROMINENT METRIC CARDS
      ══════════════════════════════════════════════════════════════ */}
      <section className="w-full">
        <div className="w-full border border-[#E5E3DA] bg-[#FFFFFF] p-8 sm:p-12 space-y-8">
          
          {/* Header Tag */}
          <div className="flex items-center gap-2 text-[#555550] text-xs font-mono font-bold uppercase tracking-widest">
            <span className="w-2 h-2 bg-[#1E4332]" />
            <span>Constitutional Mandate · 101st Amendment Act</span>
          </div>

          {/* Grand Typographic Statement */}
          <div className="space-y-4 max-w-4xl">
            <h2 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal text-[#111111] tracking-tight leading-[1.08]">
              One Nation. One Tax. <br />
              <span className="italic font-normal text-[#111111]">One Source of Truth.</span>
            </h2>

            <p className="text-[#555550] text-base sm:text-lg font-medium leading-relaxed max-w-2xl">
              Replacing 17 cascading central and state levies with an uncompromising, automated double-entry verification core.
            </p>
          </div>

          {/* 3 Prominent Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-[#E5E3DA]">
            
            {/* Metric 1 */}
            <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 space-y-2">
              <p className="text-4xl sm:text-5xl font-extrabold text-[#111111] font-mono tracking-tight tabular-nums">
                16 / 16
              </p>
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111]">
                Rule 46 Strict Mandate
              </h3>
              <p className="text-[#555550] text-xs sm:text-sm font-medium leading-relaxed">
                Every tax invoice verified server-side with consecutive FY series, recipient state routing, and server-side signature validation in Python ReportLab.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="border border-[#1E4332]/40 bg-[#EAF2EC] p-6 space-y-2">
              <p className="text-4xl sm:text-5xl font-extrabold text-[#1E4332] font-mono tracking-tight tabular-nums">
                100%
              </p>
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#1E4332]">
                Section 49 Priority Exhaust
              </h3>
              <p className="text-[#1E4332] text-xs sm:text-sm font-medium leading-relaxed">
                IGST input credits zeroed completely against outward liabilities before CGST or SGST can be touched. Rule 88A set-off cascade strictly locked.
              </p>
            </div>

            {/* Metric 3 */}
            <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 space-y-2">
              <p className="text-4xl sm:text-5xl font-extrabold text-[#111111] font-mono tracking-tight tabular-nums">
                38 States
              </p>
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111]">
                Luhn Modulo-36 Integrity
              </h3>
              <p className="text-[#555550] text-xs sm:text-sm font-medium leading-relaxed">
                Deterministic validation of Census state codes 01 to 38 and 10-digit entity PAN prevents GSTN offline JSON filing rejections.
              </p>
            </div>

          </div>

        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          3. THE FOUR STATUTES (SHARP ARCHITECTURAL CARDS)
      ══════════════════════════════════════════════════════════════ */}
      <section className="w-full">
        <div className="w-full border border-[#E5E3DA] bg-[#FFFFFF] p-8 sm:p-12 space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E3DA]">
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#555550]">
                Statutory Architecture
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl text-[#111111] font-normal mt-1">
                The Four Statutes of GST Flow
              </h2>
            </div>
            <p className="text-[#555550] text-xs sm:text-sm font-mono max-w-xs">
              Every invoice, ledger, and return complies strictly with the Central Goods and Services Tax Act, 2017.
            </p>
          </div>

          {/* 4 Statutes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {statutes.map((s) => (
              <div
                key={s.num}
                className="p-6 border border-[#E5E3DA] bg-[#F9F9F6] space-y-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-3xl font-extrabold text-[#111111]">
                    {s.num}
                  </span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#FFFFFF] border border-[#E5E3DA] text-[#111111]">
                    {s.tag}
                  </span>
                </div>

                <p className="text-xs font-mono font-bold text-[#555550] uppercase tracking-wider">
                  {s.code}
                </p>
                <h3 className="text-lg font-bold text-[#111111]">
                  {s.title}
                </h3>
                <p className="text-[#555550] text-xs sm:text-sm font-medium leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          4. CORE FUNCTIONAL WORKFLOW SHOWCASES
      ══════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        
        {/* Showcase A: GSTR-2B Telemetry */}
        <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-7 sm:p-9 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-[#EAF2EC] border border-[#1E4332]/40 text-[#1E4332] flex items-center justify-center font-bold">
              <ShieldCheck weight="bold" className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold text-[#1E4332] uppercase tracking-wider block">
              Section 16(2)(aa) Telemetry
            </span>
            <h3 className="text-2xl font-bold text-[#111111] tracking-tight">
              Automated GSTR-2B Inward Matching
            </h3>
            <p className="text-[#555550] text-xs sm:text-sm font-medium leading-relaxed">
              Ingest GST portal JSON files to cross-match vendor invoices against internal ledgers. Isolate at-risk input tax credit and send WhatsApp reminders to vendors with a single click.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTab('compliance')}
            className="self-start inline-flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
          >
            <span>Open GSTR-2B Reconciler</span>
            <ArrowRight weight="bold" className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Showcase B: Section 49 Settlement & Invoicing */}
        <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-7 sm:p-9 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-[#F9F9F6] border border-[#E5E3DA] text-[#111111] flex items-center justify-center font-bold">
              <Receipt weight="bold" className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold text-[#555550] uppercase tracking-wider block">
              Rule 88A &amp; Section 49 Waterfall
            </span>
            <h3 className="text-2xl font-bold text-[#111111] tracking-tight">
              Rule 46 Invoicing &amp; Cash Settlements
            </h3>
            <p className="text-[#555550] text-xs sm:text-sm font-medium leading-relaxed">
              Issue compliant tax invoices with automatic inter-state vs intra-state Place of Supply determination. View real-time net cash liabilities and print official Form GSTR-3B return summaries.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTab('create')}
            className="self-start inline-flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
          >
            <span>Issue Rule 46 Invoice</span>
            <ArrowRight weight="bold" className="w-3.5 h-3.5" />
          </button>
        </div>

      </section>


      {/* ══════════════════════════════════════════════════════════════
          5. INTERACTIVE STATUTORY SANDBOX (MODULO-36 INSPECTOR)
      ══════════════════════════════════════════════════════════ */}
      <section className="w-full">
        <GSTINInspectorWidget />
      </section>


      {/* ══════════════════════════════════════════════════════════════
          6. PRODUCTION READY BANNER & REPORTLAB DOWNLOAD
      ══════════════════════════════════════════════════════════════ */}
      <section className="w-full">
        <div className="w-full border border-[#111111] bg-[#111111] text-white p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Still Life Photography */}
            <div className="lg:col-span-5 h-[260px] sm:h-[300px] border border-white/20 relative">
              <img
                src={vintageInvoiceImg}
                alt="Vintage Indian Rubber Stamp and Invoices"
                className="w-full h-full object-cover filter brightness-[0.80] contrast-[1.10]"
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white/90 text-xs font-mono px-3 py-1.5 bg-black/80 border border-white/20">
                <span>Rule 46 Certified Tax Invoice</span>
                <span>Section 31</span>
              </div>
            </div>

            {/* Right Column: Statement & Direct Actions */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-200">
                  Ready for Production Commercial Deployment
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Generate statutory invoices <br />
                  <span className="font-serif italic font-normal text-amber-200">in under thirty seconds.</span>
                </h2>
                <p className="text-white/70 text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
                  Download an audit-ready Rule 46 PDF generated with Python ReportLab, or issue your next tax invoice directly into your Section 49 waterfall cascade.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FFFFFF] hover:bg-[#F3F2ED] text-[#111111] text-xs font-bold transition-none"
                >
                  <DownloadSimple weight="bold" className="w-4 h-4" />
                  <span>Download Sample Rule 46 PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTab('create')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-transparent hover:bg-white/10 text-white border border-white/40 text-xs font-bold transition-none"
                >
                  <Receipt weight="bold" className="w-4 h-4" />
                  <span>Issue New Tax Invoice</span>
                </button>
              </div>

              {/* Metadata strip */}
              <div className="flex items-center gap-4 pt-2 text-xs font-mono text-white/60 font-medium">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="w-1.5 h-1.5 bg-[#1E4332]" />
                  Offline GSTR-1 JSON
                </span>
                <span>·</span>
                <span>Rule 88A Order</span>
                <span>·</span>
                <span>Section 170 Rounding</span>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          7. CLEAN EDITORIAL FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer className="w-full pt-8 border-t border-[#E5E3DA] text-xs text-[#555550]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#111111] text-[#FFFFFF] font-mono text-xs font-bold flex items-center justify-center">
              GF
            </div>
            <div>
              <p className="font-bold text-[#111111] text-xs">GST Flow Platform</p>
              <p className="text-[11px] text-[#555550] font-mono">
                Platina Tech Park, BKC Mumbai 400051 · MH 27
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-[#111111]">
            <button
              type="button"
              onClick={() => setTab('dashboard')}
              className="hover:underline transition-none"
            >
              Console
            </button>
            <button
              type="button"
              onClick={() => setTab('invoices')}
              className="hover:underline transition-none"
            >
              Invoices
            </button>
            <button
              type="button"
              onClick={() => setTab('compliance')}
              className="hover:underline transition-none"
            >
              Returns
            </button>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="hover:underline transition-none flex items-center gap-1"
            >
              <span>Sample PDF</span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E5E3DA] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#555550] font-mono">
          <p>© 2026 GST Flow. Built in strict compliance with the Central Goods and Services Tax Act, 2017.</p>
          <p>Rule 46 · Section 49 · Section 170 · Modulo-36</p>
        </div>
      </footer>

    </div>
  );
}
