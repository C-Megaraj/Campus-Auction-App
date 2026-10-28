const express = require('express');
const { placeBid, getAuctionBids } = require('../controllers/bid.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.route('/:auctionId').get(getAuctionBids).post(protect, placeBid);

module.exports = router;

