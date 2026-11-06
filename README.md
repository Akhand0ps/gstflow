# GST Flow — Mobile-First GST Compliance, Invoicing & Returns System

> **Course Allocation**: Mobile App - Software Development for GST: Building an app for managing GST compliance and transactions.  
> **Backend**: Django 5 + Django REST Framework (DRF) + SQLite  
> **Frontend**: React (Vite) + Tailwind CSS + PWA (Progressive Web App)  
> **Design Framework**: `taste-skill` (Anti-Slop Software / Fintech Standard)  
> **Statutory Basis**: CGST Act 2017 & IGST Act 2017

---

## 🚀 Key Features & Statutory Compliance

1. **Statutory Tax Routing & Place of Supply (POS)**:
   - Evaluates Supplier State vs Recipient Place of Supply (POS):
     - **Intra-State**: Splits 50/50 into **CGST + SGST**.
     - **Inter-State**: Billed as 100% **IGST**.
   - Tax slabs supported: `0% (Exempt)`, `5%`, `12%`, `18% (Standard)`, `28% (+ Cess)`.

2. **15-Character GSTIN Modulo-36 Luhn Checksum**:
   - Built-in validation algorithm verified against live enterprise tax entities (e.g. TCS $\rightarrow$ `'W'`, Infosys $\rightarrow$ `'U'`).
   - Automatically rejects invalid checksums and formats.

3. **Rule 46 Tax Invoicing**:
   - Consecutive serial number generation (e.g., `INV/2026-27/0001`).
   - Section 170 statutory rounding off to the nearest whole Rupee.
   - Automated Indian Currency Number-to-Words generation (*"Indian Rupees Four Lakh Thirteen Thousand Only"*).
   - Instant downloadable **PDF Tax Invoices** via ReportLab.

4. **Statutory Returns & ITC Reconciliation**:
   - **GSTR-1**: Official government offline utility JSON generator (Table 4 B2B, Table 5 B2CL, Table 7 B2CS, Table 12 HSN Summary, Table 13 Document Summary).
   - **GSTR-3B**: Monthly self-declaration tax settlement executing the **Section 49, 49A, 49B ITC utilization cascade** (exhausting IGST first against IGST, then CGST/SGST).
   - **GSTR-2B Reconciler**: Inward purchase invoice matching flagging "ITC at Risk" with 1-click vendor WhatsApp reminders.

5. **`taste-skill` Mobile-First PWA Design**:
   - Zero generic AI slop: high visual density, monospaced tabular numerals (`font-mono tabular-nums`), clean slate surfaces, sapphire/emerald/amber financial indicators, subtle 2px card lifts, and an installable PWA shell with bottom tab bar.

---

## 🛠️ Project Structure

```
mobapp/
├── backend/
│   ├── venv/                       # Python virtual environment
│   ├── manage.py                   # Django management utility
│   ├── seed_data.py                # Database seeder with realistic GST records
│   ├── core/                       # Django settings, CORS, SimpleJWT, URLs
│   ├── common/
│   │   └── gst_utils.py            # Modulo-36 checksum, state mapping, Sec 170 rounding
│   ├── authentication/             # Taxpayer BusinessProfile model & GSTIN verification
│   ├── parties/                    # Customers & Vendors directory
│   ├── catalog/                    # Goods & Services catalog, HSN/SAC codes & tax rates
│   ├── transactions/               # Tax Invoices, Line Items, Rule 46 numbering engine
│   ├── compliance/                 # GSTR-1, GSTR-3B, GSTR-2B services & ReportLab PDF
│   └── tests/
│       └── test_gst_engine.py      # Automated statutory unit test suite (7 tests)
│
└── frontend/
    ├── public/                     # PWA icons & web manifest
    ├── src/
    │   ├── services/api.js         # API client connecting to Django backend
    │   ├── components/layout/      # Header with live GSTIN badge, BottomNav PWA bar
    │   ├── pages/
    │   │   ├── Dashboard.jsx       # Output liability vs ITC, Net Cash, Recent bills
    │   │   ├── Invoices.jsx        # Invoice ledger with filters & PDF download
    │   │   ├── InvoiceBuilder.jsx  # Rapid bill creator, live tax split, sticky total bar
    │   │   ├── Parties.jsx         # Party directory with live GSTIN verification
    │   │   └── Compliance.jsx      # GSTR-1 JSON export, GSTR-3B waterfall, 2B matcher
    │   ├── App.jsx                 # Main application controller
    │   └── main.jsx
    ├── tailwind.config.js          # Fintech palette tokens & typography
    └── vite.config.js              # Vite + React + PWA plugin
```

---

## ⚡ Quick Start Instructions

### 1. Run Backend (Django REST Framework)

```bash
cd backend
source venv/bin/activate

# Seed database with sample GST records
python seed_data.py

# Run Django development server
python manage.py runserver 0.0.0.0:8000
```
- **API Root**: `http://localhost:8000/api/`
- **Interactive Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc Documentation**: `http://localhost:8000/api/redoc/`

### 2. Run Frontend (React Vite PWA)

In a separate terminal:

```bash
cd frontend
npm run dev
```
- **PWA Application**: `http://localhost:5173/`

### 3. Run Backend Statutory Test Suite

```bash
cd backend
source venv/bin/activate
python manage.py test tests
```
Runs 7 unit tests covering Modulo-36 verification, Intra/Inter-state tax splitting, Section 170 rounding, GSTR-1 assembly, GSTR-3B Section 49 cascade, and PDF generation.

