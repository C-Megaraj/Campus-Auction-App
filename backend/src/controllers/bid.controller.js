const { pool } = require('../config/db');
const { finalizeListing } = require('../services/auctionCloser.service');

/**
 * @desc    Place a secure bid on an active auction listing
 * @route   POST /api/listings/:id/bids
 * @access  Private (Authenticated student only)
 */
exports.placeBid = async (req, res) => {
  const listingId = Number(req.params.id);
  const bidderId = req.user.id;
  const { amount } = req.body;

  // 1. Validate listing ID format
  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid listing ID format.',
    });
  }

  // 2. Validate submitted bid amount
  const parsedAmount = Number(amount);
  if (amount === undefined || amount === null || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Bid amount must be a positive number greater than $0.00.',
    });
  }

  // Ensure amount has at most 2 decimal places
  const normalizedAmount = Math.round(parsedAmount * 100) / 100;

  const conn = await pool.getConnection();

  try {
    // 3. Begin transaction with row locking
    await conn.beginTransaction();

    // 4. Query listing FOR UPDATE to lock the row and serialize concurrent bids
    const [listings] = await conn.query(
      `SELECT
         id,
         seller_id,
         starting_price,
         minimum_bid_increment,
         closing_at,
         status
       FROM listings
       WHERE id = ?
       FOR UPDATE`,
      [listingId]
    );

    if (!listings || listings.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: 'Auction listing not found.',
      });
    }

    const listing = listings[0];

    // 5. Check if user is the seller (prevent self-bidding)
    if (listing.seller_id === bidderId) {
      await conn.rollback();
      return res.status(403).json({
        success: false,
        message: 'You cannot bid on your own listing.',
      });
    }

    // 6. Check listing status: must be active or closing_soon
    if (listing.status !== 'active' && listing.status !== 'closing_soon') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `This auction is no longer active (current status: ${listing.status}). Bids cannot be accepted.`,
      });
    }

    // 7. Check if auction closing time has passed (even if scheduled background process hasn't run)
    const now = new Date();
    const closingAt = new Date(listing.closing_at);
    if (now >= closingAt) {
      // Trigger finalization on this connection or immediately
      await conn.commit();
      // Finalize the listing
      await finalizeListing(listingId);
      return res.status(400).json({
        success: false,
        message: 'This auction has already closed. No further bids can be accepted.',
      });
    }

    // 8. Determine authoritative current highest bid from trusted database records
    const [highestBidRows] = await conn.query(
      `SELECT amount, created_at
       FROM bids
       WHERE listing_id = ?
       ORDER BY amount DESC, created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [listingId]
    );

    const startingPrice = Number(listing.starting_price);
    const minIncrement = Number(listing.minimum_bid_increment);

    let requiredMinBid;
    let isFirstBid = false;

    if (!highestBidRows || highestBidRows.length === 0) {
      // First bid rule: must be at least the starting price
      requiredMinBid = startingPrice;
      isFirstBid = true;
    } else {
      // Subsequent bid rule: must be at least current_highest + min_increment
      const currentHighest = Number(highestBidRows[0].amount);
      requiredMinBid = Math.round((currentHighest + minIncrement) * 100) / 100;
    }

    if (normalizedAmount < requiredMinBid) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: isFirstBid
          ? `The opening bid must be at least the starting price of $${requiredMinBid.toFixed(2)}.`
          : `Bid must be at least $${requiredMinBid.toFixed(2)} (current highest bid plus minimum increment of $${minIncrement.toFixed(2)}).`,
        required_minimum: requiredMinBid,
        current_highest: highestBidRows && highestBidRows.length > 0 ? Number(highestBidRows[0].amount) : null,
      });
    }

    // 9. Insert the accepted bid into bids table
    const [insertResult] = await conn.query(
      `INSERT INTO bids (listing_id, bidder_id, amount)
       VALUES (?, ?, ?)`,
      [listingId, bidderId, normalizedAmount]
    );

    // 10. Check if auction is within 10 minutes of closing -> update status to closing_soon if active
    const msRemaining = closingAt.getTime() - now.getTime();
    if (msRemaining <= 10 * 60 * 1000 && listing.status === 'active') {
      await conn.query(
        `UPDATE listings SET status = 'closing_soon', updated_at = NOW() WHERE id = ?`,
        [listingId]
      );
    }

    // 11. Commit transaction
    await conn.commit();

    // 12. Fetch new bid count and current bid
    const [stats] = await conn.query(
      `SELECT
         COUNT(*) AS bids_count,
         MAX(amount) AS current_bid
       FROM bids
       WHERE listing_id = ?`,
      [listingId]
    );

    return res.status(201).json({
      success: true,
      message: 'Your bid has been placed successfully!',
      bid: {
        id: insertResult.insertId,
        listing_id: listingId,
        amount: normalizedAmount,
        created_at: new Date().toISOString(),
        bidder: {
          id: req.user.id,
          name: req.user.full_name,
        },
      },
      current_bid: Number(stats[0].current_bid),
      bids_count: Number(stats[0].bids_count),
      next_minimum_bid: Math.round((normalizedAmount + minIncrement) * 100) / 100,
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error('Error rolling back placeBid:', rbErr);
    }
    console.error(`Error in POST /api/listings/${listingId}/bids:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record bid due to a server error.',
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * @desc    Get public bid history for a listing
 * @route   GET /api/listings/:id/bids
 * @access  Public
 */
exports.getListingBids = async (req, res) => {
  const listingId = Number(req.params.id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid listing ID format.',
    });
  }

  try {
    // 1. Verify listing exists
    const [listings] = await pool.query(
      `SELECT id, starting_price, minimum_bid_increment, status, closing_at
       FROM listings
       WHERE id = ?`,
      [listingId]
    );

    if (!listings || listings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Auction listing not found.',
      });
    }

    const listing = listings[0];

    // 2. Fetch all bids ordered by amount DESC, created_at ASC
    // Never expose email addresses, passwords, or hashes
    const [bids] = await pool.query(
      `SELECT
         b.id,
         b.amount,
         b.created_at,
         u.id AS bidder_id,
         u.full_name AS bidder_name
       FROM bids b
       INNER JOIN users u ON b.bidder_id = u.id
       WHERE b.listing_id = ?
       ORDER BY b.amount DESC, b.created_at ASC`,
      [listingId]
    );

    const formattedBids = bids.map((b, index) => ({
      id: b.id,
      amount: Number(b.amount),
      created_at: b.created_at,
      bidder_id: b.bidder_id,
      bidder_name: b.bidder_name,
      is_winning: index === 0,
    }));

    const currentBid = formattedBids.length > 0
      ? formattedBids[0].amount
      : Number(listing.starting_price);

    const nextMinBid = formattedBids.length > 0
      ? Math.round((currentBid + Number(listing.minimum_bid_increment)) * 100) / 100
      : Number(listing.starting_price);

    return res.status(200).json({
      success: true,
      count: formattedBids.length,
      current_bid: currentBid,
      next_minimum_bid: nextMinBid,
      bids: formattedBids,
    });
  } catch (error) {
    console.error(`Error in GET /api/listings/${listingId}/bids:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bid history.',
      error: error.message,
    });
  }
};
