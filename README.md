# Campus Auction App

A full-stack web application for campus-based peer-to-peer auctions. Students can list items, place bids, and win auctions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + React Router v6 |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (JSON Web Tokens) |

## Project Structure

```
Campus-Auction-App/
├── frontend/               # React Vite app
│   ├── src/
│   │   ├── components/     # Navbar, ProtectedRoute
│   │   ├── context/        # AuthContext (global auth state)
│   │   ├── pages/          # Home, Login, Register, AuctionList, AuctionDetail, CreateAuction, Profile
│   │   ├── services/       # Axios API client
│   │   └── App.jsx
│   └── package.json
│
└── backend/                # Express REST API
    ├── src/
    │   ├── config/         # MongoDB connection
    │   ├── controllers/    # auth, auction, bid, user
    │   ├── middleware/      # JWT auth, role authorization
    │   ├── models/         # User, Auction, Bid
    │   ├── routes/         # auth, auction, bid, user routes
    │   └── server.js
    └── package.json
```

## API Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/register` | Register user | ❌ |
| POST | `/api/auth/login` | Login | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |
| GET | `/api/auctions` | List auctions | ❌ |
| GET | `/api/auctions/:id` | Get auction | ❌ |
| POST | `/api/auctions` | Create auction | ✅ |
| PUT | `/api/auctions/:id` | Update auction | ✅ |
| DELETE | `/api/auctions/:id` | Delete auction | ✅ |
| GET | `/api/bids/:auctionId` | Get bids | ❌ |
| POST | `/api/bids/:auctionId` | Place bid | ✅ |
| GET | `/api/users/:id` | Get profile | ❌ |
| PUT | `/api/users/me` | Update profile | ✅ |
| GET | `/api/users/:id/listings` | User's listings | ❌ |

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally or a MongoDB Atlas URI

### Backend

```bash
cd backend
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm install
npm run dev            # runs on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # runs on http://localhost:5173
```

> Set `VITE_API_URL=http://localhost:5000/api` in `frontend/.env` if needed.

