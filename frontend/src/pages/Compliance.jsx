import React, { useState, useEffect, useRef } from 'react';
import { 
  DownloadSimple, 
  UploadSimple,
  WhatsappLogo,
  CheckCircle,
  CalendarBlank,
  FileText,
  ShieldCheck,
  Receipt,
  Buildings,
  ArrowsLeftRight,
  Printer
} from '@phosphor-icons/react';
import { api } from '../services/api';
import GSTR3BModal from '../components/ui/GSTR3BModal';

export default function Compliance({ showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('gstr1');
  const [gstr1Data, setGstr1Data] = useState(null);
  const [gstr3bData, setGstr3bData] = useState(null);
  const [reconcileData, setReconcileData] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Period Selector State
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);

  // GSTR-3B Modal State
  const [is3BModalOpen, setIs3BModalOpen] = useState(false);

  // GSTR-2B Upload State
  const [isUploading2B, setIsUploading2B] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef(null);

  const PERIOD_OPTIONS = [
    { year: 2026, month: 11, label: 'November 2026 (Active)' },
    { year: 2026, month: 10, label: 'October 2026' },
    { year: 2026, month: 9, label: 'September 2026' },
    { year: 2026, month: 8, label: 'August 2026' },
    { year: 2026, month: 7, label: 'July 2026' }
  ];

  const selectedPeriodObj = PERIOD_OPTIONS.find(p => p.year === selectedYear && p.month === selectedMonth) || {
    label: `${new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' })} ${selectedYear}`
  };

  useEffect(() => {
    loadBusiness();
  }, []);

  useEffect(() => {
    loadComplianceData();
  }, [activeSubTab, selectedYear, selectedMonth]);

  const loadBusiness = async () => {
    try {
      const b = await api.getBusinessProfile();
      setBusinessProfile(b);
    } catch (err) {
      console.warn('Could not load business profile:', err);
    }
  };

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      if (activeSubTab === 'gstr1') {
        const res = await api.getGSTR1Report(selectedYear, selectedMonth);
        setGstr1Data(res);
      } else if (activeSubTab === 'gstr3b') {
        const res = await api.getGSTR3BReport(selectedYear, selectedMonth);
        setGstr3bData(res);
      } else if (activeSubTab === 'reconcile') {
        const res = await api.getGSTR2BReconciliation(selectedYear, selectedMonth);
        setReconcileData(res);
        setUploadedFileName('');
      }
    } catch (err) {
      console.error('Failed to load compliance report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportGSTR1JSON = () => {
    if (!gstr1Data) return;
    try {
      const jsonStr = JSON.stringify(gstr1Data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GSTR1_${gstr1Data.gstin}_${gstr1Data.fp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast?.(`GSTR1_${gstr1Data.fp}.json downloaded. Ready for offline tool upload.`, 'success', 'GSTR-1 JSON Exported');
    } catch (err) {
      showToast?.('Failed to export GSTR-1 JSON', 'error');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading2B(true);
      showToast?.(`Ingesting ${file.name}...`, 'info', 'GSTR-2B Reconciler');

      const text = await file.text();
      const parsedJson = JSON.parse(text);

      const res = await api.uploadGSTR2B(parsedJson);
      setReconcileData(res);
      setUploadedFileName(file.name);

      const summary = res.summary || {};
      showToast?.(
        `Reconciliation complete: ${summary.matched_count || 0} matched, ${summary.missing_in_portal_count || 0} at risk, ${summary.missing_in_books_count || 0} unclaimed.`,
        'success',
        'Section 16(2)(aa) Telemetry'
      );
    } catch (err) {
      console.error('Upload failed:', err);
      showToast?.('Failed to parse or reconcile GSTR-2B file: ' + err.message, 'error');
    } finally {
      setIsUploading2B(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadSampleGSTR2B = () => {
    try {
      const sample = {
        gstin: businessProfile?.gstin || "27AAACT2727Q1ZW",
        fp: `${String(selectedMonth).padStart(2, '0')}${selectedYear}`,
        data: {
          docdata: {
            b2b: [
              {
                ctin: "29AABCD9912K1ZQ",
                cname: "Dell International Services India Pvt Ltd",
                inv: [
                  {
                    inum: "PUR/2026-27/0002",
                    dt: "05-11-2026",
                    val: 118000.0,
                    pos: "27",
                    items: [
                      {
                        itm_det: {
                          txval: 100000.0,
                          rt: 18.0,
                          iamt: 18000.0,
                          camt: 0.0,
                          samt: 0.0
                        }
                      }
                    ]
                  }
                ]
              },
              {
                ctin: "27AACW8891P1ZX",
                cname: "Cloud Matrix Technologies LLP",
                inv: [
                  {
                    inum: "PUR/2026-27/0001",
                    dt: "01-11-2026",
                    val: 472000.0,
                    pos: "27",
                    items: [
                      {
                        itm_det: {
                          txval: 400000.0,
                          rt: 18.0,
                          iamt: 0.0,
                          camt: 36000.0,
                          samt: 36000.0
                        }
                      }
                    ]
                  }
                ]
              },
              {
                ctin: "29AAACI4798L1ZU",
                cname: "Infosys Cloud Services KA",
                inv: [
                  {
                    inum: "INFY/BLR/2026/8841",
                    dt: "10-11-2026",
                    val: 29500.0,
                    pos: "27",
                    items: [
                      {
                        itm_det: {
                          txval: 25000.0,
                          rt: 18.0,
                          iamt: 4500.0,
                          camt: 0.0,
                          samt: 0.0
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      };

      const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GSTR2B_SAMPLE_${sample.fp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast?.('Sample GSTR-2B portal JSON downloaded.', 'info', 'Sample Generated');
    } catch (err) {
      showToast?.('Failed to generate sample file', 'error');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 font-sans text-[#111111]">
      
      {/* ══════════════════════════════════════════════════════════
          1. HEADER WITH PERIOD SELECTOR & ACTIONS
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#555550] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#1E4332]" />
            <span className="tracking-wider uppercase">Statutory Compliance Engine · CGST Act 2017</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
            GST Returns &amp; Filings
          </h1>
        </div>

        {/* Action Controls & Tax Period Selector */}
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

          {activeSubTab === 'gstr1' && (
            <button
              type="button"
              onClick={handleExportGSTR1JSON}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
            >
              <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
              <span>Export GSTR-1 JSON</span>
            </button>
          )}

          {activeSubTab === 'gstr3b' && (
            <button
              type="button"
              onClick={() => setIs3BModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
            >
              <Printer weight="bold" className="w-3.5 h-3.5" />
              <span>Official Form GSTR-3B</span>
            </button>
          )}

          {activeSubTab === 'reconcile' && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleDownloadSampleGSTR2B}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E3DA] bg-[#FFFFFF] hover:bg-[#F3F2ED] text-[#111111] text-xs font-semibold transition-none"
                title="Download sample portal GSTR-2B JSON to test matching"
              >
                <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
                <span>Sample 2B</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading2B}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none disabled:opacity-50"
              >
                <UploadSimple weight="bold" className="w-3.5 h-3.5" />
                <span>{isUploading2B ? 'Reconciling...' : 'Upload GSTR-2B'}</span>
              </button>
            </div>
          )}
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════
          2. CLEAN ARCHITECTURAL SUB-TAB SELECTOR
      ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center bg-[#F3F2ED] border border-[#E5E3DA] p-0.5 text-xs font-semibold max-w-fit">
        {[
          { id: 'gstr1', label: 'GSTR-1 Outward' },
          { id: 'gstr3b', label: 'GSTR-3B Settlement' },
          { id: 'reconcile', label: 'GSTR-2B Reconciler' }
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-1.5 text-xs transition-none ${
                isActive
                  ? 'bg-[#111111] text-[#FFFFFF] font-bold'
                  : 'text-[#555550] hover:text-[#111111] font-semibold'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>


      {loading ? (
        <div className="p-16 text-center text-xs font-mono font-medium text-[#555550] bg-[#FFFFFF] border border-[#E5E3DA]">
          Computing statutory returns for {selectedPeriodObj.label}...
        </div>
      ) : activeSubTab === 'gstr1' ? (
        
        /* ══════════════════════════════════════════════════════════
            GSTR-1 OUTWARD SALES (HIGH CONTRAST TABULAR CARDS)
        ══════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Summary Metric Strip: 4 Sharp Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Turnover */}
            <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#555550]">
                  Taxable Turnover
                </span>
                <div className="w-7 h-7 bg-[#F9F9F6] border border-[#E5E3DA] text-[#111111] flex items-center justify-center">
                  <Receipt weight="bold" className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight font-mono tabular-nums">
                {formatCurrency(gstr1Data?.summary?.total_taxable_value)}
              </div>
              <p className="text-xs font-mono text-[#555550] mt-1.5">Total Outward Supplies</p>
            </div>

            {/* Card 2: CGST */}
            <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#555550]">
                  CGST Collected
                </span>
                <div className="w-7 h-7 bg-[#F9F9F6] border border-[#E5E3DA] text-[#111111] flex items-center justify-center">
                  <Buildings weight="bold" className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight font-mono tabular-nums">
                {formatCurrency(gstr1Data?.summary?.total_cgst)}
              </div>
              <p className="text-xs font-mono text-[#555550] mt-1.5">Central Pool (50% Intra)</p>
            </div>

            {/* Card 3: SGST */}
            <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#555550]">
                  SGST Collected
                </span>
                <div className="w-7 h-7 bg-[#F9F9F6] border border-[#E5E3DA] text-[#111111] flex items-center justify-center">
                  <ShieldCheck weight="bold" className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight font-mono tabular-nums">
                {formatCurrency(gstr1Data?.summary?.total_sgst)}
              </div>
              <p className="text-xs font-mono text-[#555550] mt-1.5">State Treasury (MH 27)</p>
            </div>

            {/* Card 4: IGST */}
            <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#555550]">
                  IGST Collected
                </span>
                <div className="w-7 h-7 bg-[#F9F9F6] border border-[#E5E3DA] text-[#111111] flex items-center justify-center">
                  <ArrowsLeftRight weight="bold" className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight font-mono tabular-nums">
                {formatCurrency(gstr1Data?.summary?.total_igst)}
              </div>
              <p className="text-xs font-mono text-[#555550] mt-1.5">Inter-State Consolidated</p>
            </div>

          </div>

          {/* Table 4: B2B Invoices */}
          <section className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DA]">
              <div>
                <h3 className="font-sans font-bold text-lg text-[#111111]">Table 4 — B2B Tax Invoices</h3>
                <p className="text-xs text-[#555550] font-mono mt-0.5">
                  Registered outward supplies with verified Modulo-36 GSTIN · Period: {selectedPeriodObj.label}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-[#111111] px-3 py-1 bg-[#F3F2ED] border border-[#E5E3DA]">
                {gstr1Data?.b2b?.length || 0} Registered Parties
              </span>
            </div>

            <div className="divide-y divide-[#E5E3DA]">
              {gstr1Data?.b2b?.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-[#555550]">
                  No B2B outward invoices recorded for {selectedPeriodObj.label}.
                </div>
              ) : (
                gstr1Data?.b2b?.map((b2bItem, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between hover:bg-[#F9F9F6] transition-none px-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#111111] bg-[#F3F2ED] px-2.5 py-0.5 border border-[#E5E3DA]">
                          {b2bItem.ctin}
                        </span>
                        <span className="text-xs text-[#555550] font-mono font-semibold">
                          POS: State {b2bItem.inv[0].pos}
                        </span>
                      </div>
                      <div className="text-xs text-[#111111] font-medium">
                        Invoice: <strong className="text-[#111111] font-mono">{b2bItem.inv[0].inum}</strong> · Date: {b2bItem.inv[0].idt}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-[#111111] tabular-nums">
                        {formatCurrency(b2bItem.inv[0].val)}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E4332] bg-[#EAF2EC] border border-[#1E4332]/40 px-2 py-0.5">
                        <CheckCircle weight="fill" className="w-3 h-3 text-[#1E4332]" />
                        Rule 46 Verified
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Table 12: HSN Summary */}
          <section className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 sm:p-7 space-y-4">
            <div className="pb-3 border-b border-[#E5E3DA]">
              <h3 className="font-sans font-bold text-lg text-[#111111]">Table 12 — HSN / SAC Summary</h3>
              <p className="text-xs text-[#555550] font-mono mt-0.5">
                Aggregate tax and volume classified by statutory Harmonized System codes
              </p>
            </div>

            <div className="overflow-x-auto border border-[#E5E3DA]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F9F9F6] border-b border-[#E5E3DA] text-[11px] font-mono font-bold uppercase tracking-wider text-[#555550]">
                    <th className="py-2.5 px-3">HSN / SAC</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">UQC</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-right">IGST</th>
                    <th className="py-2.5 px-3 text-right">CGST</th>
                    <th className="py-2.5 px-3 text-right">SGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DA] font-mono">
                  {gstr1Data?.hsn?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-xs text-[#555550]">
                        No HSN summary data for {selectedPeriodObj.label}.
                      </td>
                    </tr>
                  ) : (
                    gstr1Data?.hsn?.data?.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F9F9F6] transition-none">
                        <td className="py-3 px-3 font-bold text-[#111111]">{row.hsn_sc}</td>
                        <td className="py-3 px-3 font-sans font-semibold text-[#111111]">{row.desc}</td>
                        <td className="py-3 px-3 text-[#555550]">{row.uqc}</td>
                        <td className="py-3 px-3 text-right font-bold text-[#111111] tabular-nums">{formatCurrency(row.txval)}</td>
                        <td className="py-3 px-3 text-right font-medium text-[#111111] tabular-nums">{formatCurrency(row.iamt)}</td>
                        <td className="py-3 px-3 text-right font-medium text-[#111111] tabular-nums">{formatCurrency(row.camt)}</td>
                        <td className="py-3 px-3 text-right font-medium text-[#111111] tabular-nums">{formatCurrency(row.samt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>

      ) : activeSubTab === 'gstr3b' ? (

        /* ══════════════════════════════════════════════════════════
            GSTR-3B SETTLEMENT (SECTION 49 WATERFALL)
        ══════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          <section className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E3DA]">
              <div>
                <h3 className="font-sans font-bold text-xl text-[#111111]">
                  Section 49 Statutory Waterfall Settlement
                </h3>
                <p className="text-xs text-[#555550] font-mono mt-0.5">
                  Rule 88A set-off cascade across Output Liability and Eligible Input Tax Credit · Period: {selectedPeriodObj.label}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIs3BModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#E5E3DA] bg-[#FFFFFF] hover:bg-[#F3F2ED] text-[#111111] text-xs font-bold transition-none"
              >
                <FileText weight="bold" className="w-3.5 h-3.5" />
                <span>View &amp; Print Form GSTR-3B</span>
              </button>
            </div>

            {/* 3 Prominent Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              
              <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550] block mb-1">
                  Table 3.1 Output Liability
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight font-mono tabular-nums">
                  {formatCurrency(gstr3bData?.table_3_1_output_liability?.total_tax)}
                </div>
                <div className="text-xs text-[#555550] font-mono mt-2 pt-2 border-t border-[#E5E3DA] flex items-center justify-between">
                  <span>CGST: {formatCurrency(gstr3bData?.table_3_1_output_liability?.cgst)}</span>
                  <span>IGST: {formatCurrency(gstr3bData?.table_3_1_output_liability?.igst)}</span>
                </div>
              </div>

              <div className="border border-[#1E4332]/40 bg-[#EAF2EC] p-5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1E4332] block mb-1">
                  Table 4 Eligible ITC
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#1E4332] tracking-tight font-mono tabular-nums">
                  {formatCurrency(gstr3bData?.table_4_eligible_itc?.total_itc)}
                </div>
                <div className="text-xs text-[#1E4332] font-mono mt-2 pt-2 border-t border-[#1E4332]/30 flex items-center justify-between">
                  <span>CGST: {formatCurrency(gstr3bData?.table_4_eligible_itc?.cgst)}</span>
                  <span>IGST: {formatCurrency(gstr3bData?.table_4_eligible_itc?.igst)}</span>
                </div>
              </div>

              <div className="border border-[#963614]/40 bg-[#FAECE7] p-5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#963614] block mb-1">
                  Net Cash Challan (PMT-06)
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#963614] tracking-tight font-mono tabular-nums">
                  {formatCurrency(gstr3bData?.net_cash_payable?.total_cash_payable)}
                </div>
                <div className="text-xs text-[#963614] font-mono mt-2 pt-2 border-t border-[#963614]/30 flex items-center justify-between">
                  <span>Cash ledger liability</span>
                  <span className="font-bold">Challan Required</span>
                </div>
              </div>

            </div>

            {/* Statutory Order rules */}
            <div className="pt-4 border-t border-[#E5E3DA] text-xs font-mono text-[#555550] space-y-1.5 bg-[#F9F9F6] p-4 border">
              <span className="font-bold text-[#111111] block">Statutory Exhaustion Order (Section 49 &amp; Rule 88A):</span>
              <p>1. <strong>IGST Credit</strong> is exhausted 100% against IGST liabilities first, then applied to CGST or SGST.</p>
              <p>2. <strong>CGST &amp; SGST Cross-Utilization</strong> is strictly prohibited by statute to protect Union &amp; State allocations.</p>
            </div>
          </section>

        </div>

      ) : (

        /* ══════════════════════════════════════════════════════════
            GSTR-2B RECONCILER (4-WAY MATCHING TELEMETRY)
        ══════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Summary Strip: 4 High-Contrast Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="border border-[#1E4332]/40 bg-[#EAF2EC] p-5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1E4332] block mb-1">
                Matched Invoices
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#1E4332] font-mono tabular-nums">
                {reconcileData?.summary?.matched_count || 0} Bills
              </div>
              <p className="text-xs font-mono font-semibold text-[#1E4332] mt-1.5">100% Eligible ITC under Rule 36(4)</p>
            </div>

            <div className="border border-[#963614]/40 bg-[#FAECE7] p-5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#963614] block mb-1">
                Missing in 2B (At Risk)
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#963614] font-mono tabular-nums">
                {reconcileData?.summary?.missing_in_portal_count ?? reconcileData?.summary?.at_risk_count ?? 0} Bills
              </div>
              <p className="text-xs font-mono font-semibold text-[#963614] mt-1.5">Sec 16(2)(aa) blocked until filed</p>
            </div>

            <div className="border border-[#963614]/40 bg-[#FAECE7] p-5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#963614] block mb-1">
                ITC Value at Risk
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#963614] font-mono tabular-nums">
                {formatCurrency(reconcileData?.summary?.total_itc_at_risk)}
              </div>
              <p className="text-xs font-mono font-semibold text-[#963614] mt-1.5">Blocked from set-off cascade</p>
            </div>

            <div className="border border-[#E5E3DA] bg-[#FFFFFF] p-5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#555550] block mb-1">
                Missing in Books
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] font-mono tabular-nums">
                {reconcileData?.summary?.missing_in_books_count || 0} Invoices
              </div>
              <p className="text-xs font-mono font-semibold text-[#555550] mt-1.5">
                {formatCurrency(reconcileData?.summary?.total_itc_unclaimed)} unclaimed ITC
              </p>
            </div>

          </div>

          {uploadedFileName && (
            <div className="p-4 bg-[#EAF2EC] border border-[#1E4332]/40 flex items-center justify-between text-xs font-semibold text-[#1E4332]">
              <div className="flex items-center gap-2">
                <ShieldCheck weight="fill" className="w-4 h-4 text-[#1E4332]" />
                <span>Reconciled against uploaded portal file: <strong>{uploadedFileName}</strong></span>
              </div>
              <button
                type="button"
                onClick={loadComplianceData}
                className="text-[#1E4332] underline font-bold"
              >
                Reset to internal ledger
              </button>
            </div>
          )}

          {/* Records Table */}
          <section className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 sm:p-7 space-y-4">
            <div className="pb-3 border-b border-[#E5E3DA] flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-lg text-[#111111]">Inward Supplies Reconciler</h3>
                <p className="text-xs text-[#555550] font-mono mt-0.5">
                  Automated matching between internal Purchase Register and GSTR-2B portal telemetry
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#111111] px-3 py-1 bg-[#F3F2ED] border border-[#E5E3DA]">
                {reconcileData?.records?.length || 0} Records
              </span>
            </div>

            <div className="divide-y divide-[#E5E3DA]">
              {reconcileData?.records?.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-[#555550]">
                  No purchase records to reconcile for this period.
                </div>
              ) : (
                reconcileData?.records?.map((rec, idx) => {
                  const status = rec.status;
                  const isMatched = status === 'MATCHED';
                  const isMismatchAmount = status === 'MISMATCH_AMOUNT';
                  const isMissingInBooks = status === 'MISSING_IN_BOOKS';

                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 bg-[#FAECE7] text-[#963614] border border-[#963614]/40">
                      Missing in 2B
                    </span>
                  );

                  if (isMatched) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 bg-[#EAF2EC] text-[#1E4332] border border-[#1E4332]/40">
                        In 2B Portal
                      </span>
                    );
                  } else if (isMismatchAmount) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 bg-[#FAECE7] text-[#963614] border border-[#963614]/40">
                        Amount Discrepancy
                      </span>
                    );
                  } else if (isMissingInBooks) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 bg-[#F3F2ED] text-[#111111] border border-[#E5E3DA]">
                        Unclaimed in Books
                      </span>
                    );
                  }

                  return (
                    <div 
                      key={idx} 
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F9F9F6] transition-none px-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#111111] bg-[#F3F2ED] px-2 py-0.5 border border-[#E5E3DA]">
                            {rec.invoice_number}
                          </span>
                          {statusBadge}
                        </div>

                        <div className="text-xs text-[#111111] font-semibold">
                          {rec.vendor_name} · <span className="font-mono text-[#555550] font-normal">{rec.vendor_gstin}</span>
                        </div>

                        <div className="text-xs text-[#555550] font-mono">
                          {rec.remarks}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-left sm:text-right">
                          <div className="font-mono text-base font-bold text-[#111111] tabular-nums">
                            ITC: {formatCurrency(rec.tax_amount || rec.portal_tax_amount)}
                          </div>
                          <div className="text-xs text-[#555550] font-mono tabular-nums">
                            Taxable: {formatCurrency(rec.taxable_value)}
                          </div>
                        </div>

                        {!isMatched && !isMissingInBooks && (
                          <a
                            href={`https://wa.me/?text=Dear%20${encodeURIComponent(rec.vendor_name)},%20Invoice%20${rec.invoice_number}%20is%20missing%20in%20our%20GSTR-2B.%20Kindly%20file%20your%20GSTR-1%20return%20promptly.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-[#1E4332] hover:bg-[#153023] text-[#FFFFFF] text-xs font-bold transition-none"
                          >
                            <WhatsappLogo weight="bold" className="w-3.5 h-3.5" />
                            <span>Nudge</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

        </div>

      )}

      {/* GSTR-3B Statutory Statement Modal */}
      {is3BModalOpen && (
        <GSTR3BModal
          isOpen={is3BModalOpen}
          onClose={() => setIs3BModalOpen(false)}
          data={gstr3bData}
          periodLabel={selectedPeriodObj.label}
          businessProfile={businessProfile}
        />
      )}

    </div>
  );
}
