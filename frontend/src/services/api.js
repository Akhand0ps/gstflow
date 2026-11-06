/**
 * API client connecting React frontend to the Django REST Framework backend.
 */
const BASE_URL = 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || `HTTP Error ${response.status}`);
    }
    // Return blob if PDF
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      return response.blob();
    }
    return response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Business Profile
  getBusinessProfile: () => request('/business/profile/'),
  verifyGSTIN: (gstin) => request('/gstin/verify/', {
    method: 'POST',
    body: JSON.stringify({ gstin })
  }),
  getStateCodes: () => request('/states/'),

  // Parties (Customers & Vendors)
  getParties: (partyType = '') => request(`/parties/${partyType ? `?party_type=${partyType}` : ''}`),
  getParty: (id) => request(`/parties/${id}/`),
  createParty: (data) => request('/parties/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateParty: (id, data) => request(`/parties/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteParty: (id) => request(`/parties/${id}/`, {
    method: 'DELETE'
  }),

  // Catalog
  getCatalog: () => request('/catalog/'),
  createProductItem: (data) => request('/catalog/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateProductItem: (id, data) => request(`/catalog/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteProductItem: (id) => request(`/catalog/${id}/`, {
    method: 'DELETE'
  }),

  // Invoices
  getInvoices: (type = '', status = '') => {
    const params = new URLSearchParams();
    if (type) params.append('invoice_type', type);
    if (status) params.append('status', status);
    const query = params.toString();
    return request(`/invoices/${query ? `?${query}` : ''}`);
  },
  getInvoice: (id) => request(`/invoices/${id}/`),
  getNextInvoiceNumber: (type = 'SALES') => request(`/invoices/next_number/?invoice_type=${type}`),
  createInvoice: (data) => request('/invoices/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  markInvoicePaid: (id) => request(`/invoices/${id}/mark_paid/`, {
    method: 'POST'
  }),
  cancelInvoice: (id) => request(`/invoices/${id}/cancel/`, {
    method: 'POST'
  }),
  downloadInvoicePDF: async (id, invoiceNumber) => {
    const blob = await request(`/invoices/${id}/pdf/`);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Invoice-${invoiceNumber.replace(/\//g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // Compliance
  getDashboardSummary: (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    const query = params.toString();
    return request(`/compliance/dashboard/${query ? `?${query}` : ''}`);
  },
  getGSTR1Report: (year, month) => request(`/compliance/gstr1/?year=${year}&month=${month}`),
  getGSTR3BReport: (year, month) => request(`/compliance/gstr3b/?year=${year}&month=${month}`),
  getGSTR2BReconciliation: (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    const query = params.toString();
    return request(`/compliance/reconcile-2b/${query ? `?${query}` : ''}`);
  },
  uploadGSTR2B: (payload) => request('/compliance/reconcile-2b/', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
};

