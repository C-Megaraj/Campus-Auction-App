const express = require('express');
const {
  getListings,
  getListingById,
  getMyListings,
  createListing,
  updateListing,
  cancelListing,
} = require('../controllers/listing.controller');
const { placeBid, getListingBids } = require('../controllers/bid.controller');
const {
  getAuctionResult,
  decideAuctionResult,
  updateHandoverStatus,
  acceptHighestBidEarly,
} = require('../controllers/result.controller');
const { protect } = require('../middleware/auth.middleware');

const upload = require('../middleware/upload.middleware');

const router = express.Router();

// GET /api/listings - Retrieve all listings with optional search, filters & sort
router.get('/', getListings);

// GET /api/listings/my-listings - Retrieve all listings of the authenticated student
router.get('/my-listings', protect, getMyListings);

// GET /api/listings/:id - Retrieve single listing with category, seller, images & bids
router.get('/:id', getListingById);

// POST /api/listings - Create a new auction listing (Authenticated student only, supporting multipart file uploads)
router.post('/', protect, upload.array('images', 5), createListing);

// POST /api/listings/upload-image - Standalone image upload endpoint
router.post('/upload-image', protect, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided.',
    });
  }
  return res.status(200).json({
    success: true,
    message: 'Image uploaded successfully.',
    image_url: `/uploads/${req.file.filename}`,
  });
});

// PUT /api/listings/:id - Edit an eligible auction listing (Owner only)
router.put('/:id', protect, updateListing);

// DELETE /api/listings/:id - Cancel an eligible auction listing (Owner only)
router.delete('/:id', protect, cancelListing);
router.post('/:id/cancel', protect, cancelListing);

// ==========================================
// MILESTONE 1: SECURE BIDDING ENDPOINTS
// ==========================================
// POST /api/listings/:id/bids - Place a bid (Protected)
router.post('/:id/bids', protect, placeBid);

// GET /api/listings/:id/bids - Public bid history
router.get('/:id/bids', getListingBids);

// ========================================================
// MILESTONES 2 & 3: AUCTION RESULTS & SELLER DECISION / HANDOVER
// ========================================================
// GET /api/listings/:id/result - Retrieve auction result & handover state
router.get('/:id/result', getAuctionResult);

// POST /api/listings/:id/decision - Seller approves or rejects provisional result (Owner only)
router.post('/:id/decision', protect, decideAuctionResult);

// POST /api/listings/:id/accept-highest-bid - Early sale: Seller sells immediately to highest bidder at any time
router.post('/:id/accept-highest-bid', protect, acceptHighestBidEarly);

// PATCH /api/listings/:id/handover - Update campus handover progress (Seller or Winner)
router.patch('/:id/handover', protect, updateHandoverStatus);
router.post('/:id/handover', protect, updateHandoverStatus);

module.exports = router;
