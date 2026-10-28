const Bid = require('../models/Bid');
const Auction = require('../models/Auction');

// @desc    Place a bid
// @route   POST /api/bids/:auctionId
exports.placeBid = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.auctionId);
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    if (!auction.isLive)
      return res.status(400).json({ success: false, message: 'Auction is not active' });
    if (auction.seller.toString() === req.user.id)
      return res.status(400).json({ success: false, message: 'Seller cannot bid on own auction' });

    const { amount } = req.body;
    const minRequired = auction.currentBid > 0
      ? auction.currentBid + auction.minBidIncrement
      : auction.startingBid;

    if (amount < minRequired)
      return res.status(400).json({
        success: false,
        message: `Bid must be at least $${minRequired}`,
      });

    // Mark previous winning bid as not winning
    await Bid.updateMany({ auction: auction._id, isWinning: true }, { isWinning: false });

    const bid = await Bid.create({ auction: auction._id, bidder: req.user.id, amount, isWinning: true });

    // Update auction
    auction.currentBid = amount;
    auction.bids.push(bid._id);
    await auction.save();

    const populated = await bid.populate('bidder', 'name avatar');
    res.status(201).json({ success: true, bid: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get bids for an auction
// @route   GET /api/bids/:auctionId
exports.getAuctionBids = async (req, res) => {
  try {
    const bids = await Bid.find({ auction: req.params.auctionId })
      .populate('bidder', 'name avatar')
      .sort({ amount: -1 });
    res.json({ success: true, count: bids.length, bids });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

