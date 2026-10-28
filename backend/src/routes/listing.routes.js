const express = require('express');
const { getListings, getListingById } = require('../controllers/listing.controller');

const router = express.Router();

// GET /api/listings - Retrieve all listings with optional search, filters & sort
router.get('/', getListings);

// GET /api/listings/:id - Retrieve single listing with category, seller, images & bids
router.get('/:id', getListingById);

module.exports = router;
