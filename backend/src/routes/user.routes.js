const express = require('express');
const { getUser, updateProfile, getUserListings } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.put('/me', protect, updateProfile);
router.get('/:id', getUser);
router.get('/:id/listings', getUserListings);

module.exports = router;

