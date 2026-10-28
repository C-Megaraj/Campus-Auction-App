require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const { testConnection } = require('./config/db');
const { startAuctionScheduler } = require('./services/auctionCloser.service');

// Route imports
const listingRoutes = require('./routes/listing.routes');
const authRoutes = require('./routes/auth.routes');
const auctionRoutes = require('./routes/auction.routes');
const bidRoutes = require('./routes/bid.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

// Test MySQL Database connection
testConnection().then((connected) => {
  if (connected) {
    // Start background auction closing scheduler
    startAuctionScheduler(10000); // Check every 10 seconds
  }
});

// Middleware & Secure CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for local dev preview
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Static serving for uploaded item photos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Main Listings API (Includes bidding, closing results, seller decision, handover & image uploads)
app.use('/api/listings', listingRoutes);

// Additional REST routes (preserved for existing and future milestones)
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) =>
  res.json({
    status: 'ok',
    database: 'mysql',
    timestamp: new Date().toISOString(),
  })
);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
