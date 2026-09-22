# 🤖 PRO-BOT V2

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=Cloudflare&logoColor=white)
![Render](https://img.shields.io/badge/Render-%46E3B7.svg?style=for-the-badge&logo=render&logoColor=white)

PRO-BOT V2 is an advanced, automated booking and notification system tailored for scheduling, built with a modern React frontend and a powerful Express/Node.js backend. 

## 🌐 Live URLs
- **Frontend (Cloudflare Pages):** [https://khaleeji-bot-v2-frontend.tech-rm-re.workers.dev](https://khaleeji-bot-v2-frontend.tech-rm-re.workers.dev)
- **Backend API (Render):** [https://khaleeji-bot-v2-backend.onrender.com/](https://khaleeji-bot-v2-backend.onrender.com/)

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS 4
- **State Management / Fetching:** TanStack React Query + Axios
- **Routing:** React Router v7
- **Icons:** Lucide React

### Backend (API)
- **Runtime:** Node.js + Express.js
- **Database:** MongoDB + Redis (for caching & job queues)
- **Security:** Helmet, Express Rate Limit, CORS configurations

---

##  Features
- **Secure Authentication:** JWT-based login with optimized session handling.
- **Automated Workflows:** Background jobs integrated with Salla Webhooks and Prometric systems.
- **Real-time Notifications:** Automated alerts and updates.
- **Dashboard:** Modern, responsive UI for admin and user management.
- **Optimized Performance:** Blazing fast rendering with Vite and React Query.

---

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/redasalem/pro-bot-v2-frontend.git
cd pro-bot-v2-frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory and add the following:
```env
VITE_API_BASE_URL=https://khaleeji-bot-v2-backend.onrender.com/api/v1
```

### 4. Run the Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

---

## ☁️ Deployment

The frontend is configured to automatically deploy to **Cloudflare Pages** on push to the `main` branch. Ensure that environment variables (like `VITE_API_BASE_URL`) are correctly set in the Cloudflare Dashboard before building.
