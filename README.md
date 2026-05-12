# Purani Books

A multi-tenant used-book marketplace with fixed-price listings, auctions, offers, real-time chat, Stripe escrow payments, and Cloudinary image uploads.

---

## Project Structure

```
Purani-books/
├── backend/          # Flask + SocketIO API
└── frontend/         # React + Vite SPA
```

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| MongoDB | 6+ (local or Atlas) |

---

## Backend Setup

### 1. Create and activate a virtual environment

```bash
cd backend

# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Create the environment file

Create a file called `.env` inside the `backend/` folder:

```env
# Required
SECRET_KEY=change-me-in-production
JWT_SECRET_KEY=change-me-jwt-in-production
MONGO_URI=mongodb://localhost:27017/book_saas_db

# Frontend origin(s) allowed by CORS (comma-separated)
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Public URL used for Stripe redirect links
PUBLIC_APP_URL=http://127.0.0.1:5173

# Optional — leave blank to disable the feature
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=


# First super_admin registration secret (leave blank to disable)
ADMIN_SETUP_SECRET=

# Dev only — exposes reset token in API response (never true in production)
EXPOSE_PASSWORD_RESET_TOKEN=false

# JWT expiry
JWT_ACCESS_EXPIRES_MIN=15
JWT_REFRESH_EXPIRES_DAYS=30

# Offer expiry windows (hours)
OFFER_EXPIRE_HOURS_BASIC=12
OFFER_EXPIRE_HOURS_PRO=48

# Set to false to disable background scheduler (useful in testing)
SCHEDULER_ENABLED=true
```

### 4. Run the backend

```bash
# from the backend/ folder with venv active
npm start
# or equivalently
npm run dev
```

The API will be available at **http://127.0.0.1:5000**

Health check: `GET http://127.0.0.1:5000/api/health` → `{"status": "ok"}`

> Both `npm start` and `npm run dev` run `python wsgi.py` which starts Flask-SocketIO in debug mode on port 5000.

---

## Frontend Setup

### 1. Install Node dependencies

```bash
cd frontend
npm install
```

### 2. Create the environment file (optional)

Create a file called `.env` inside the `frontend/` folder.  
If omitted, the tenant defaults to `"default"`.

```env
VITE_TENANT_ID=default
```

### 3. Run the frontend

```bash
# from the frontend/ folder
npm run dev
```

The app will be available at **http://localhost:5173**

The Vite dev server proxies all `/api` and `/socket.io` requests to `http://127.0.0.1:5000` automatically — no manual CORS configuration needed during development.

---

## Running Both Together

Open two terminals side by side:

**Terminal 1 — Backend**
```bash
cd backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
npm start
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Book catalog — browse and search listings |
| `/sell` | Sell-back price calculator |
| `/dashboard` | Register, login, account info, listings, offers |
| `/chat` | Real-time messaging between buyers and sellers |
| `/admin` | Platform overview and user role management (super_admin only) |
| `/success` | Stripe payment success redirect |
| `/cancel` | Stripe payment cancel redirect |

---

## API Overview

All endpoints are prefixed with `/api`.

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Register, login, refresh, verify email, password reset |
| `/api/books` | List, search, create, update listings; place bids; valuation |
| `/api/offers` | Submit, accept, reject, counter offers |
| `/api/orders` | Create orders, ship, confirm delivery, refund |
| `/api/payments` | Stripe checkout session, webhook |
| `/api/dashboard` | My listings, orders summary, wishlist |
| `/api/conversations` | Create threads, list messages, post messages |
| `/api/subscriptions` | View and upgrade subscription plan |
| `/api/admin` | Platform stats, user role management (super_admin) |
| `/api/tenants` | List and create tenants |
| `/api/isbn/<isbn>` | Google Books metadata + edition verification |
| `/api/uploads/signature` | Cloudinary signed upload parameters |

---

## Creating the First Super Admin

> Admin accounts can **only** be created via the one-time database seed script.
> There is no registration form for admins — the `/api/auth/register` endpoint
> explicitly blocks `super_admin` and `admin` roles.

```bash
# from the backend/ folder with venv active
python seed_admin.py
```

The script will:
1. Check that no `super_admin` exists yet (refuses to run a second time)
2. Prompt for a `@gmail.com` email and a strong password
3. Prompt for a tenant slug (default: `default`)
4. Insert the user + enterprise subscription directly into MongoDB

After seeding, log in at **http://localhost:5173/login** — you will be
automatically redirected to **http://localhost:5173/admin-panel**.

---

## Production Notes

- Set `JWT_COOKIE_SECURE=true` when serving over HTTPS
- Replace `SECRET_KEY` and `JWT_SECRET_KEY` with long random strings
- Use a production WSGI server (e.g. `gunicorn` with `eventlet` or `gevent` worker for SocketIO)
- Set `SCHEDULER_ENABLED=false` if running multiple workers (use an external scheduler instead)
- Set `EXPOSE_PASSWORD_RESET_TOKEN=false` (it is false by default)
