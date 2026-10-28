const User = require('../models/User');
const Auction = require('../models/Auction');

// @desc    Get user profile
// @route   GET /api/users/:id
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update own profile
// @route   PUT /api/users/me
exports.updateProfile = async (req, res) => {
  try {
    const { name, college, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, college, avatar },
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get user's listings
// @route   GET /api/users/:id/listings
exports.getUserListings = async (req, res) => {
  try {
    const auctions = await Auction.find({ seller: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: auctions.length, auctions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

