const express = require('express');
const {
  getAuctions,
  getAuction,
  createAuction,
  updateAuction,
  deleteAuction,
} = require('../controllers/auction.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.route('/').get(getAuctions).post(protect, createAuction);
router.route('/:id').get(getAuction).put(protect, updateAuction).delete(protect, deleteAuction);

module.exports = router;

