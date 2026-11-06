import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MagnifyingGlass, 
  X,
  Buildings,
  CheckCircle
} from '@phosphor-icons/react';
import { api } from '../services/api';
import GSTINInspector from '../components/ui/GSTINInspector';

export default function Parties({ showToast }) {
  const [masterTab, setMasterTab] = useState('parties'); // 'parties' | 'catalog'

  // Counterparty State
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [editingPartyId, setEditingPartyId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Party Form State
  const [formData, setFormData] = useState({
    party_type: 'CUSTOMER',
    legal_name: '',
    trade_name: '',
    gstin: '',
    state_code: '27',
    state_name: 'Maharashtra',
    email: '',
    phone: '',
    billing_address: '',
    pincode: ''
  });

  const [gstinStatus, setGstinStatus] = useState(null);
  const [validatingGstin, setValidatingGstin] = useState(false);

  // Catalog State
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalogId, setEditingCatalogId] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Catalog Form State
  const [catalogForm, setCatalogForm] = useState({
    item_type: 'SERVICE',
    name: '',
    hsn_sac_code: '998314',
    description: '',
    uqc_unit: 'OTH',
    unit_price: 10000,
    gst_rate: 18.0
  });

  useEffect(() => {
    if (masterTab === 'parties') {
      loadParties();
    } else {
      loadCatalog();
    }
  }, [masterTab, filterType]);

  const loadParties = async () => {
    try {
      setLoading(true);
      const res = await api.getParties(filterType);
      setParties(res || []);
    } catch (err) {
      console.error('Failed to load parties:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      setCatalogLoading(true);
      const res = await api.getCatalog();
      setCatalog(res || []);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingPartyId(null);
    setFormData({
      party_type: 'CUSTOMER',
      legal_name: '',
      trade_name: '',
      gstin: '',
      state_code: '27',
      state_name: 'Maharashtra',
      email: '',
      phone: '',
      billing_address: '',
      pincode: ''
    });
    setGstinStatus(null);
    setShowPartyModal(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingPartyId(p.id);
    setFormData({
      party_type: p.party_type || 'CUSTOMER',
      legal_name: p.legal_name || '',
      trade_name: p.trade_name || '',
      gstin: p.gstin || '',
      state_code: p.state_code || '27',
      state_name: p.state_name || 'Maharashtra',
      email: p.email || '',
      phone: p.phone || '',
      billing_address: p.billing_address || '',
      pincode: p.pincode || ''
    });
    setGstinStatus(p.gstin ? { valid: true } : null);
    setShowPartyModal(true);
  };

  const handleGstinChange = async (val) => {
    const clean = val.toUpperCase().trim();
    setFormData(prev => ({ ...prev, gstin: clean }));

    if (clean.length === 15) {
      try {
        setValidatingGstin(true);
        const res = await api.verifyGSTIN(clean);
        setGstinStatus(res);
        if (res.valid) {
          showToast?.(`GSTIN Verified for ${res.state_name} (PAN: ${res.pan})`, 'success', 'Statutory Mod-36 Checksum Valid');
          setFormData(prev => ({
            ...prev,
            state_code: res.state_code,
            state_name: res.state_name
          }));
        } else {
          showToast?.('Invalid GSTIN checksum or state code', 'error');
        }
      } catch (err) {
        setGstinStatus({ valid: false, message: 'Verification error' });
      } finally {
        setValidatingGstin(false);
      }
    } else {
      setGstinStatus(null);
    }
  };

  const handleSaveParty = async (e) => {
    e.preventDefault();
    if (!formData.legal_name) {
      showToast?.('Legal business name is required.', 'error');
      return;
    }

    try {
      if (editingPartyId) {
        await api.updateParty(editingPartyId, formData);
        showToast?.(`${formData.legal_name} updated successfully`, 'success');
      } else {
        await api.createParty(formData);
        showToast?.(`${formData.legal_name} added to party directory`, 'success', 'Party Registered');
      }
      setShowPartyModal(false);
      loadParties();
    } catch (err) {
      showToast?.('Error saving party: ' + err.message, 'error');
    }
  };

  // Catalog Handlers
  const handleOpenAddCatalog = () => {
    setEditingCatalogId(null);
    setCatalogForm({
      item_type: 'SERVICE',
      name: '',
      hsn_sac_code: '998314',
      description: '',
      uqc_unit: 'OTH',
      unit_price: 10000,
      gst_rate: 18.0
    });
    setShowCatalogModal(true);
  };

  const handleOpenEditCatalog = (item) => {
    setEditingCatalogId(item.id);
    setCatalogForm({
      item_type: item.item_type || 'SERVICE',
      name: item.name || '',
      hsn_sac_code: item.hsn_sac_code || '998314',
      description: item.description || '',
      uqc_unit: item.uqc_unit || 'OTH',
      unit_price: parseFloat(item.unit_price) || 0,
      gst_rate: parseFloat(item.gst_rate) || 18.0
    });
    setShowCatalogModal(true);
  };

  const handleSaveCatalog = async (e) => {
    e.preventDefault();
    if (!catalogForm.name) {
      showToast?.('Item / service name is required.', 'error');
      return;
    }

    try {
      if (editingCatalogId) {
        await api.updateProductItem(editingCatalogId, catalogForm);
        showToast?.(`${catalogForm.name} updated in catalog`, 'success');
      } else {
        await api.createProductItem(catalogForm);
        showToast?.(`${catalogForm.name} added to catalog`, 'success');
      }
      setShowCatalogModal(false);
      loadCatalog();
    } catch (err) {
      showToast?.('Error saving catalog item: ' + err.message, 'error');
    }
  };

  const filteredParties = parties.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.legal_name.toLowerCase().includes(q) ||
      (p.trade_name && p.trade_name.toLowerCase().includes(q)) ||
      (p.gstin && p.gstin.toLowerCase().includes(q)) ||
      (p.state_name && p.state_name.toLowerCase().includes(q))
    );
  });

  const filteredCatalog = catalog.filter(c => {
    if (!catalogSearch) return true;
    const q = catalogSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.hsn_sac_code && c.hsn_sac_code.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 font-sans text-[#111111]">
      
      {/* ══════════════════════════════════════════════════════════
          1. HEADER WITH ACTIONS
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#555550] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#1E4332]" />
            <span className="tracking-wider uppercase">Master Data &amp; Statutory Catalog</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
            {masterTab === 'parties' ? 'Parties & Entities' : 'Goods & Services Catalog'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {masterTab === 'parties' ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E3DA] text-xs font-mono font-semibold text-[#555550]">
                <span>{parties.length} Master Records</span>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
              >
                <Plus weight="bold" className="w-3.5 h-3.5" />
                <span>Add Party</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E3DA] text-xs font-mono font-semibold text-[#555550]">
                <span>{catalog.length} Products &amp; Services</span>
              </div>

              <button
                type="button"
                onClick={handleOpenAddCatalog}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
              >
                <Plus weight="bold" className="w-3.5 h-3.5" />
                <span>New Item</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Primary Master Selector */}
      <div className="flex items-center bg-[#F3F2ED] border border-[#E5E3DA] p-0.5 text-xs font-semibold max-w-fit">
        <button
          type="button"
          onClick={() => setMasterTab('parties')}
          className={`px-4 py-1.5 text-xs transition-none ${
            masterTab === 'parties'
              ? 'bg-[#111111] text-[#FFFFFF] font-bold'
              : 'text-[#555550] hover:text-[#111111] font-semibold'
          }`}
        >
          Counterparty Directory
        </button>
        <button
          type="button"
          onClick={() => setMasterTab('catalog')}
          className={`px-4 py-1.5 text-xs transition-none ${
            masterTab === 'catalog'
              ? 'bg-[#111111] text-[#FFFFFF] font-bold'
              : 'text-[#555550] hover:text-[#111111] font-semibold'
          }`}
        >
          Goods &amp; Services (HSN/SAC)
        </button>
      </div>


      {masterTab === 'parties' ? (

        /* ══════════════════════════════════════════════════════════
            2A. COUNTERPARTY DIRECTORY
        ══════════════════════════════════════════════════════════ */
        <section className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 sm:p-7 space-y-4">
          
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E3DA]">
            
            {/* Filter Buttons */}
            <div className="flex items-center bg-[#F3F2ED] border border-[#E5E3DA] p-0.5 text-xs font-semibold">
              {[
                { id: '', label: 'All Parties' },
                { id: 'CUSTOMER', label: 'Customers (Buyers)' },
                { id: 'VENDOR', label: 'Vendors (Suppliers)' }
              ].map((tab) => {
                const isActive = filterType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    className={`px-3.5 py-1.5 text-xs transition-none ${
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

            {/* Search Input */}
            <div className="relative">
              <MagnifyingGlass className="w-3.5 h-3.5 text-[#555550] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search legal name, GSTIN or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#F9F9F6] border border-[#E5E3DA] text-xs text-[#111111] placeholder-[#555550]/60 focus:outline-none focus:border-[#111111] w-56 sm:w-72 font-mono font-medium"
              />
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto border border-[#E5E3DA]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F9F9F6] border-b border-[#E5E3DA] text-[11px] font-mono font-bold uppercase tracking-wider text-[#555550]">
                  <th className="py-2.5 px-3">Entity Name</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">GSTIN Identifier</th>
                  <th className="py-2.5 px-3">State / POS</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DA] font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#555550] font-mono text-xs">
                      Loading party records...
                    </td>
                  </tr>
                ) : filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#555550] font-mono text-xs">
                      No parties registered matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredParties.map((p) => {
                    const isCustomer = p.party_type === 'CUSTOMER';

                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleOpenEditModal(p)}
                        className="hover:bg-[#F9F9F6] transition-none cursor-pointer group"
                      >
                        
                        {/* Legal Name & Trade */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-[#111111] group-hover:underline block">
                            {p.legal_name}
                          </span>
                          {p.trade_name && (
                            <span className="text-[11px] font-mono text-[#555550] block mt-0.5">
                              Trade: {p.trade_name}
                            </span>
                          )}
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2.5 py-0.5 text-[11px] font-mono font-bold border ${
                            isCustomer 
                              ? 'bg-[#F3F2ED] text-[#111111] border-[#E5E3DA]' 
                              : 'bg-[#EAF2EC] text-[#1E4332] border-[#1E4332]/40'
                          }`}>
                            {isCustomer ? 'Customer' : 'Vendor'}
                          </span>
                        </td>

                        {/* GSTIN */}
                        <td className="py-3 px-3 font-mono text-xs">
                          {p.gstin ? (
                            <span className="font-bold text-[#111111] bg-[#F3F2ED] px-2 py-0.5 border border-[#E5E3DA] inline-block">
                              {p.gstin}
                            </span>
                          ) : (
                            <span className="text-[#555550] italic">
                              Unregistered B2C
                            </span>
                          )}
                        </td>

                        {/* State / Place of Supply */}
                        <td className="py-3 px-3 font-semibold text-[#111111]">
                          {p.state_name} <span className="text-[#555550] font-mono font-normal">({p.state_code})</span>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-3 font-mono text-xs text-[#555550]">
                          {p.phone || '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {p.is_registered ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E4332] bg-[#EAF2EC] border border-[#1E4332]/40 px-2 py-0.5">
                              <span className="w-1.5 h-1.5 bg-[#1E4332]" />
                              <span>Registered</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#963614] bg-[#FAECE7] border border-[#963614]/40 px-2 py-0.5">
                              <span className="w-1.5 h-1.5 bg-[#963614]" />
                              <span>Consumer</span>
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(p);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#111111] bg-[#F9F9F6] hover:bg-[#E5E3DA] border border-[#E5E3DA] transition-none"
                          >
                            Edit
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

      ) : (

        /* ══════════════════════════════════════════════════════════
            2B. GOODS & SERVICES CATALOG
        ══════════════════════════════════════════════════════════ */
        <section className="border border-[#E5E3DA] bg-[#FFFFFF] p-6 sm:p-7 space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E3DA]">
            <div>
              <h2 className="text-xl font-bold text-[#111111]">Statutory Item Master</h2>
              <p className="text-xs text-[#555550] font-mono mt-0.5">Classification by 4/6-digit HSN codes and 6-digit SAC codes</p>
            </div>

            <div className="relative">
              <MagnifyingGlass className="w-3.5 h-3.5 text-[#555550] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search catalog by name or HSN..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#F9F9F6] border border-[#E5E3DA] text-xs text-[#111111] placeholder-[#555550]/60 focus:outline-none focus:border-[#111111] w-56 sm:w-72 font-mono font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E5E3DA]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F9F9F6] border-b border-[#E5E3DA] text-[11px] font-mono font-bold uppercase tracking-wider text-[#555550]">
                  <th className="py-2.5 px-3">Item Name &amp; Description</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">HSN / SAC</th>
                  <th className="py-2.5 px-3 text-right">Base Price (₹)</th>
                  <th className="py-2.5 px-3 text-center">GST Slab</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DA] font-sans">
                {catalogLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#555550] font-mono text-xs">
                      Loading catalog items...
                    </td>
                  </tr>
                ) : filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#555550] font-mono text-xs">
                      No catalog items match your search.
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenEditCatalog(item)}
                      className="hover:bg-[#F9F9F6] transition-none cursor-pointer group"
                    >
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#111111] group-hover:underline block">
                          {item.name}
                        </span>
                        {item.description && (
                          <span className="text-xs text-[#555550] block mt-0.5 font-medium">
                            {item.description}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-0.5 text-[11px] font-mono font-bold bg-[#F3F2ED] text-[#111111] border border-[#E5E3DA]">
                          {item.item_type === 'GOODS' ? 'Goods' : 'Service'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[#111111] font-bold text-xs">
                        {item.hsn_sac_code}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-[#111111] text-sm tabular-nums">
                        ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-[#111111]">
                        <span className="px-2 py-0.5 bg-[#F3F2ED] text-xs border border-[#E5E3DA]">
                          {item.gst_rate}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditCatalog(item);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#111111] bg-[#F9F9F6] hover:bg-[#E5E3DA] border border-[#E5E3DA] transition-none"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </section>

      )}


      {/* ══════════════════════════════════════════════════════════
          3. ADD / EDIT PARTY MODAL
      ══════════════════════════════════════════════════════════ */}
      {showPartyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-[#FFFFFF] border border-[#111111] max-w-lg w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#E5E3DA] pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#111111]">
                  {editingPartyId ? 'Edit Master Party' : 'Add Master Party'}
                </h2>
                <p className="text-xs text-[#555550] font-mono mt-0.5">
                  {editingPartyId ? 'Update counterparty details and statutory state code' : 'Register customer or supplier profile with statutory POS routing'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPartyModal(false)}
                className="w-7 h-7 flex items-center justify-center text-[#555550] hover:text-[#111111] hover:bg-[#F3F2ED] transition-none"
              >
                <X weight="bold" className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="space-y-4 text-xs">
              
              {/* Party Type */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                  Party Type
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#F3F2ED] border border-[#E5E3DA] p-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, party_type: 'CUSTOMER' })}
                    className={`py-1.5 text-xs font-semibold transition-none ${
                      formData.party_type === 'CUSTOMER' 
                        ? 'bg-[#111111] text-[#FFFFFF] font-bold' 
                        : 'text-[#555550] hover:text-[#111111]'
                    }`}
                  >
                    Customer (Buyer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, party_type: 'VENDOR' })}
                    className={`py-1.5 text-xs font-semibold transition-none ${
                      formData.party_type === 'VENDOR' 
                        ? 'bg-[#111111] text-[#FFFFFF] font-bold' 
                        : 'text-[#555550] hover:text-[#111111]'
                    }`}
                  >
                    Vendor (Supplier)
                  </button>
                </div>
              </div>

              {/* Legal Name */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Consultancy Services Ltd"
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs text-[#111111] placeholder-[#555550]/60 focus:outline-none focus:border-[#111111]"
                />
              </div>

              {/* Trade Name */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                  Trade / Brand Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. TCS"
                  value={formData.trade_name}
                  onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                  className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs text-[#111111] placeholder-[#555550]/60 focus:outline-none focus:border-[#111111]"
                />
              </div>

              {/* GSTIN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] font-bold">
                    15-Digit GSTIN (Optional for Retail B2C)
                  </label>
                  {validatingGstin && <span className="text-[10px] text-[#111111] font-mono">Validating...</span>}
                </div>
                <input
                  type="text"
                  maxLength="15"
                  placeholder="e.g. 27AAACT2727Q1ZW"
                  value={formData.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs font-mono uppercase font-semibold text-[#111111] tracking-wider placeholder-[#555550]/60 focus:outline-none focus:border-[#111111]"
                />

                {/* GSTIN Inspector */}
                {formData.gstin && formData.gstin.length > 2 && (
                  <div className="mt-2">
                    <GSTINInspector gstin={formData.gstin} status={gstinStatus} />
                  </div>
                )}
              </div>

              {/* State Code & State Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                    State Code (POS)
                  </label>
                  <input
                    type="text"
                    value={formData.state_code}
                    onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                    className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs font-mono font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                    State Name
                  </label>
                  <input
                    type="text"
                    value={formData.state_name}
                    onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                    className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                  Billing Address
                </label>
                <textarea
                  rows="2"
                  placeholder="Principal registered address"
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs text-[#111111] placeholder-[#555550]/60 focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3DA]">
                <button
                  type="button"
                  onClick={() => setShowPartyModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#555550] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
                >
                  {editingPartyId ? 'Update Party' : 'Save Party'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════
          4. ADD / EDIT CATALOG MODAL
      ══════════════════════════════════════════════════════════ */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-[#FFFFFF] border border-[#111111] max-w-lg w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#E5E3DA] pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#111111]">
                  {editingCatalogId ? 'Edit Catalog Item' : 'New Catalog Item'}
                </h2>
                <p className="text-xs text-[#555550] font-mono mt-0.5">
                  Assign statutory HSN/SAC code and default tax slab
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="w-7 h-7 flex items-center justify-center text-[#555550] hover:text-[#111111] hover:bg-[#F3F2ED] transition-none"
              >
                <X weight="bold" className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveCatalog} className="space-y-4 text-xs">
              
              {/* Item Type */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                  Classification
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#F3F2ED] border border-[#E5E3DA] p-1">
                  <button
                    type="button"
                    onClick={() => setCatalogForm({ ...catalogForm, item_type: 'GOODS', hsn_sac_code: '8471' })}
                    className={`py-1.5 text-xs font-semibold transition-none ${
                      catalogForm.item_type === 'GOODS' 
                        ? 'bg-[#111111] text-[#FFFFFF] font-bold' 
                        : 'text-[#555550] hover:text-[#111111]'
                    }`}
                  >
                    Goods (HSN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogForm({ ...catalogForm, item_type: 'SERVICE', hsn_sac_code: '998314' })}
                    className={`py-1.5 text-xs font-semibold transition-none ${
                      catalogForm.item_type === 'SERVICE' 
                        ? 'bg-[#111111] text-[#FFFFFF] font-bold' 
                        : 'text-[#555550] hover:text-[#111111]'
                    }`}
                  >
                    Services (SAC)
                  </button>
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                  Product or Service Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud Tenancy"
                  value={catalogForm.name}
                  onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                  className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs text-[#111111] placeholder-[#555550]/60 focus:outline-none focus:border-[#111111]"
                />
              </div>

              {/* HSN Code & Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 998314"
                    value={catalogForm.hsn_sac_code}
                    onChange={(e) => setCatalogForm({ ...catalogForm, hsn_sac_code: e.target.value })}
                    className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs font-mono font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                    GST Slab Rate
                  </label>
                  <select
                    value={catalogForm.gst_rate}
                    onChange={(e) => setCatalogForm({ ...catalogForm, gst_rate: parseFloat(e.target.value) })}
                    className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs font-mono font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% (Essential)</option>
                    <option value="12">12% (Standard I)</option>
                    <option value="18">18% (Standard II / SaaS)</option>
                    <option value="28">28% (Luxury)</option>
                  </select>
                </div>
              </div>

              {/* Unit Price */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                  Default Unit Price (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  required
                  value={catalogForm.unit_price}
                  onChange={(e) => setCatalogForm({ ...catalogForm, unit_price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs font-mono font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#555550] block mb-1.5 font-bold">
                  Description &amp; Specifications
                </label>
                <textarea
                  rows="2"
                  placeholder="Technical scope or line item notes"
                  value={catalogForm.description}
                  onChange={(e) => setCatalogForm({ ...catalogForm, description: e.target.value })}
                  className="w-full bg-[#F9F9F6] border border-[#E5E3DA] px-3.5 py-2 text-xs text-[#111111] placeholder-[#555550]/60 focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3DA]">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#555550] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#111111] hover:bg-[#252525] text-[#FFFFFF] text-xs font-bold transition-none"
                >
                  {editingCatalogId ? 'Update Item' : 'Add to Catalog'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
