const express = require('express');
const { placeBid, getListingBids } = require('../controllers/bid.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/bids/:auctionId or /api/bids/:id - Public bid history
router.get('/:auctionId', getListingBids);

// POST /api/bids/:auctionId or /api/bids/:id - Place a bid (Protected)
router.post('/:auctionId', protect, placeBid);

module.exports = router;
