const Auction = require('../models/Auction');

// @desc    Get all active auctions
// @route   GET /api/auctions
exports.getAuctions = async (req, res) => {
  try {
    const { category, status = 'active', search, page = 1, limit = 12 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;
    const [auctions, total] = await Promise.all([
      Auction.find(query)
        .populate('seller', 'name avatar college')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Auction.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: auctions.length,
      total,
      pages: Math.ceil(total / limit),
      auctions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single auction
// @route   GET /api/auctions/:id
exports.getAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('seller', 'name avatar college email')
      .populate({ path: 'bids', populate: { path: 'bidder', select: 'name avatar' } });

    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });

    res.json({ success: true, auction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create auction
// @route   POST /api/auctions
exports.createAuction = async (req, res) => {
  try {
    const auction = await Auction.create({ ...req.body, seller: req.user.id });
    res.status(201).json({ success: true, auction });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update auction
// @route   PUT /api/auctions/:id
exports.updateAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    if (auction.seller.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const updated = await Auction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, auction: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Delete auction
// @route   DELETE /api/auctions/:id
exports.deleteAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    if (auction.seller.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    await auction.deleteOne();
    res.json({ success: true, message: 'Auction removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

