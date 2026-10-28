const express = require('express');
const {
  getListings,
  getListingById,
  getMyListings,
  createListing,
  updateListing,
  cancelListing,
} = require('../controllers/listing.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/listings - Retrieve all listings with optional search, filters & sort
router.get('/', getListings);

// GET /api/listings/my-listings - Retrieve all listings of the authenticated student
router.get('/my-listings', protect, getMyListings);

// GET /api/listings/:id - Retrieve single listing with category, seller, images & bids
router.get('/:id', getListingById);

// POST /api/listings - Create a new auction listing (Authenticated student only)
router.post('/', protect, createListing);

// PUT /api/listings/:id - Edit an eligible auction listing (Owner only)
router.put('/:id', protect, updateListing);

// DELETE /api/listings/:id - Cancel an eligible auction listing (Owner only)
router.delete('/:id', protect, cancelListing);
router.post('/:id/cancel', protect, cancelListing);

module.exports = router;
