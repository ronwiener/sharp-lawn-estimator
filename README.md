# 🌿 Sharp Lawn Mowing - Professional Estimator

A high-precision lawn measurement and invoicing tool built for field service. This app allows you to measure property boundaries using satellite imagery, calculate costs instantly, and generate a professional PDF invoice for customers.

## ✨ Features

- **Satellite Measurement:** Powered by Google Maps and TerraDraw for exact sq. ft. calculations.
- **Instant Invoicing:** Generates a branded PDF with Venmo QR codes and customer details.
- **Custom Fees:** Easy toggle for additional services like mulching or bush trimming.
- **Persistent Storage:** Save estimates directly to a Supabase database for record-keeping.

## 🛠️ Built With

- **React.js** (Vite)
- **Google Maps API** (Geometry & Places)
- **TerraDraw** (Vector drawing engine)
- **Supabase** (Database & Auth)
- **jsPDF & html2canvas** (PDF generation)

## 🚀 Getting Started

1. **Clone the repo:** `git clone https://github.com/YOUR_USERNAME/sharp-lawn-estimator.git`
2. **Install dependencies:** `npm install`
3. **Environment Variables:** Create a `.env` file with the following:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_key_here
   VITE_SUPABASE_URL=your_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
