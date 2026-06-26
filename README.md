<div align="center">
  
# 🔮 QRForge

**The World's Most Advanced Dynamic QR Code Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-black?style=for-the-badge&logo=fastify)](https://fastify.io/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-black?style=for-the-badge&logo=sqlite)](https://sqlite.org/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Deployed_on-Render-black?style=for-the-badge&logo=render)](https://render.com/)

[**Live Demo**](#) • [**API Documentation**](#) • [**Report a Bug**](#)

</div>

---

## 🚀 Overview

**QRForge** is a production-grade, multi-tenant SaaS platform for creating, managing, and tracking **Dynamic QR Codes**. 

Unlike static QR codes, Dynamic QR codes encode a shortened URL (e.g., `qrforge.io/r/abc`) that redirects to your final destination. This means you can **change the destination URL at any time without ever reprinting the physical QR code**.

QRForge is built with a focus on **extreme performance** and **premium aesthetics**, featuring an iOS-inspired glassmorphic design and a sub-10ms redirect engine.

## ✨ Features

- 🔗 **Dynamic Redirects**: Update the destination URL of a printed QR code instantly.
- ⚡ **Sub-10ms Redirect Engine**: Built on Fastify 5 and SQLite in WAL mode for blazing-fast redirects.
- 📊 **Real-time Analytics**: Track total scans, unique scans, devices, browsers, operating systems, and geographic locations.
- 🧠 **Smart Rule Engine**: Route users dynamically based on Time, Geography, Device Type, Scan Count, or A/B Testing.
- 🎨 **Beautiful UI**: An iOS-grade glassmorphic dashboard built with Next.js 16 and Recharts.
- 🔒 **Enterprise Security**: JWT-based authentication, bcrypt password hashing, and role-based access control.
- 📈 **High-throughput Rate Limiting**: Separate, optimized rate limits for the API (60 req/min) and the Redirect Hot Path (200 req/min).

## 🛠️ Technology Stack

**Frontend (Client)**
- Next.js 16 (App Router)
- React 18
- Vanilla CSS Modules (Glassmorphism design system)
- Recharts (Analytics visualization)
- Lucide React (Icons)

**Backend (Server)**
- Node.js
- Fastify 5 (Core framework)
- `better-sqlite3` (Database connection)
- `ua-parser-js` & `geoip-lite` (Request context analysis)
- JSON Web Tokens (JWT) & bcrypt (Auth & Security)

**Infrastructure / Data**
- SQLite (Configured in WAL mode for high concurrency)
- In-memory LRU Cache (For sub-millisecond redirect resolution)

## 📦 Local Deployment

1. **Clone the repository**
   ```bash
   git clone https://github.com/SONUVERMA11/QRForge.git
   cd QRForge
   ```

2. **Install Dependencies**
   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory based on `.env.example`.

4. **Start the Development Servers**
   ```bash
   # Terminal 1: Start Backend (Port 3001)
   cd server
   npm run dev

   # Terminal 2: Start Frontend (Port 3000)
   cd client
   npm run dev
   ```

5. Access the dashboard at `http://localhost:3000`.

## ☁️ Production Deployment

### Backend (Render)

QRForge includes a `render.yaml` Blueprint for 1-click deployment on Render. It automatically provisions a Web Service with a Persistent Disk to store the SQLite database.

1. Connect your GitHub repository to Render.
2. Render will automatically detect the `render.yaml` and configure the service.
3. Add the `BASE_URL` (your Render URL) and `CLIENT_URL` (your Vercel URL) to the Environment Variables in the Render dashboard.

### Frontend (Vercel)

1. Import the `client` directory as a new project in Vercel.
2. Set the `NEXT_PUBLIC_API_URL` environment variable to your Render Backend URL.
3. Deploy!

## 📜 License

This project is licensed under the MIT License.
