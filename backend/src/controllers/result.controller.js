const { pool } = require('../config/db');
const { finalizeListing } = require('../services/auctionCloser.service');

/**
 * @desc    Early sale: Seller accepts the current highest bid at any time,
 *          closing the auction immediately and marking it sold to that bidder.
 * @route   POST /api/listings/:id/accept-highest-bid
 * @access  Private (Owner of the listing only)
 */
exports.acceptHighestBidEarly = async (req, res) => {
  const listingId = Number(req.params.id);
  const sellerId = req.user.id;

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid listing ID format.',
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Lock listing row and verify ownership
    const [listings] = await conn.query(
      `SELECT id, seller_id, title, status, closing_at
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

    // Ownership check
    if (listing.seller_id !== sellerId) {
      await conn.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only the seller who created this listing can accept bids.',
      });
    }

    // Must not be already sold or cancelled
    if (listing.status === 'sold') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'This auction has already been sold.',
      });
    }

    if (listing.status === 'cancelled') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'This auction has been cancelled.',
      });
    }

    // 2. Query all accepted bids for this listing, ordered by highest amount (earliest as tie-breaker)
    const [bids] = await conn.query(
      `SELECT b.id, b.bidder_id, b.amount, b.created_at, u.full_name AS bidder_name
       FROM bids b
       INNER JOIN users u ON b.bidder_id = u.id
       WHERE b.listing_id = ?
       ORDER BY b.amount DESC, b.created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [listingId]
    );

    if (!bids || bids.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'There are no bids on this listing yet. You can only sell when at least one student has placed a bid.',
      });
    }

    const highestBid = bids[0];

    // 3. Close the auction immediately: set status = 'sold', closing_at = NOW()
    await conn.query(
      `UPDATE listings
       SET status = 'sold',
           closing_at = LEAST(closing_at, NOW()),
           updated_at = NOW()
       WHERE id = ?`,
      [listingId]
    );

    // 4. Create or update record in auction_results with seller_decision = 'accepted', handover_status = 'pending'
    await conn.query(
      `INSERT INTO auction_results (listing_id, winning_bid_id, seller_decision, handover_status)
       VALUES (?, ?, 'accepted', 'pending')
       ON DUPLICATE KEY UPDATE
         winning_bid_id = VALUES(winning_bid_id),
         seller_decision = 'accepted',
         handover_status = 'pending',
         updated_at = NOW()`,
      [listingId, highestBid.id]
    );

    await conn.commit();

    return res.status(200).json({
      success: true,
      message: `Auction closed early! You accepted ${highestBid.bidder_name}'s highest bid of $${Number(highestBid.amount).toFixed(2)}. Bidding is now closed and campus handover can begin.`,
      winning_bid: {
        id: highestBid.id,
        bidder_id: highestBid.bidder_id,
        bidder_name: highestBid.bidder_name,
        amount: Number(highestBid.amount),
      },
      status: 'sold',
      handover_status: 'pending',
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error('Error rolling back acceptHighestBidEarly:', rbErr);
    }
    console.error(`Error in POST /api/listings/${listingId}/accept-highest-bid:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept highest bid.',
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * @desc    Get auction result and handover status for a listing
 * @route   GET /api/listings/:id/result
 * @access  Public (sensitive details sanitized, winner/seller receive full handover data)
 */
exports.getAuctionResult = async (req, res) => {
  const listingId = Number(req.params.id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid listing ID format.',
    });
  }

  try {
    // 1. Check listing status & closing time
    const [listings] = await pool.query(
      `SELECT
         l.id,
         l.seller_id,
         l.title,
         l.closing_at,
         l.status,
         u.full_name AS seller_name
       FROM listings l
       INNER JOIN users u ON l.seller_id = u.id
       WHERE l.id = ?`,
      [listingId]
    );

    if (!listings || listings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    const listing = listings[0];
    const isPastClosing = new Date() >= new Date(listing.closing_at);

    // If past closing and not finalized yet, finalize it now on-the-fly
    if (isPastClosing && (listing.status === 'active' || listing.status === 'closing_soon')) {
      await finalizeListing(listingId);
    }

    // 2. Query auction_results table with joins to winning bid and winner profile
    const [resultRows] = await pool.query(
      `SELECT
         ar.id,
         ar.listing_id,
         ar.winning_bid_id,
         ar.seller_decision,
         ar.handover_status,
         ar.completed_at,
         ar.created_at,
         ar.updated_at,
         b.amount AS winning_amount,
         b.created_at AS winning_bid_time,
         w.id AS winner_id,
         w.full_name AS winner_name,
         w.student_verification_status AS winner_verification_status
       FROM auction_results ar
       LEFT JOIN bids b ON ar.winning_bid_id = b.id
       LEFT JOIN users w ON b.bidder_id = w.id
       WHERE ar.listing_id = ?`,
      [listingId]
    );

    // Query highest bid if auction is still active to allow early accept
    const [highestBidRows] = await pool.query(
      `SELECT b.id, b.amount, u.id AS bidder_id, u.full_name AS bidder_name
       FROM bids b
       INNER JOIN users u ON b.bidder_id = u.id
       WHERE b.listing_id = ?
       ORDER BY b.amount DESC, b.created_at ASC
       LIMIT 1`,
      [listingId]
    );

    const currentUserId = req.user ? req.user.id : null;
    const isSeller = currentUserId && currentUserId === listing.seller_id;

    if (!resultRows || resultRows.length === 0) {
      // Auction has no auction_results record yet (active auction)
      return res.status(200).json({
        success: true,
        finalized: false,
        status: listing.status,
        can_accept_early: isSeller && (listing.status === 'active' || listing.status === 'closing_soon') && highestBidRows.length > 0,
        highest_bid: highestBidRows.length > 0
          ? {
              id: highestBidRows[0].id,
              amount: Number(highestBidRows[0].amount),
              bidder_name: highestBidRows[0].bidder_name,
            }
          : null,
        message: 'Auction is still active or has not concluded yet.',
      });
    }

    const ar = resultRows[0];
    const isWinner = currentUserId && currentUserId === ar.winner_id;
    const isAuthorizedParticipant = isSeller || isWinner;

    const responseResult = {
      id: ar.id,
      listing_id: ar.listing_id,
      status: listing.status,
      seller_id: listing.seller_id,
      seller_name: listing.seller_name,
      has_winner: Boolean(ar.winning_bid_id),
      seller_decision: ar.seller_decision,
      handover_status: ar.handover_status,
      completed_at: ar.completed_at,
      updated_at: ar.updated_at,
      winning_amount: ar.winning_amount ? Number(ar.winning_amount) : null,
      winner: ar.winning_bid_id
        ? {
            id: isAuthorizedParticipant ? ar.winner_id : undefined,
            name: ar.winner_name,
            verification_status: ar.winner_verification_status,
          }
        : null,
      user_role: isSeller ? 'seller' : isWinner ? 'winner' : 'public',
      can_decide: isSeller && listing.status === 'ended' && ar.seller_decision === 'pending' && Boolean(ar.winning_bid_id),
      can_accept_early: isSeller && (listing.status === 'active' || listing.status === 'closing_soon') && highestBidRows.length > 0,
      can_update_handover: isAuthorizedParticipant && ar.seller_decision === 'accepted' && ar.handover_status !== 'completed' && ar.handover_status !== 'cancelled',
      highest_bid: highestBidRows.length > 0
        ? {
            id: highestBidRows[0].id,
            amount: Number(highestBidRows[0].amount),
            bidder_name: highestBidRows[0].bidder_name,
          }
        : null,
    };

    return res.status(200).json({
      success: true,
      finalized: true,
      result: responseResult,
    });
  } catch (error) {
    console.error(`Error in GET /api/listings/${listingId}/result:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve auction result.',
      error: error.message,
    });
  }
};

/**
 * @desc    Submit seller decision (accept or reject) for provisional auction result
 * @route   POST /api/listings/:id/decision
 * @access  Private (Owner of the listing only)
 */
exports.decideAuctionResult = async (req, res) => {
  const listingId = Number(req.params.id);
  const sellerId = req.user.id;
  const { decision } = req.body;

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid listing ID format.',
    });
  }

  // Validate decision value
  const normalizedDecision = (decision || '').trim().toLowerCase();
  if (normalizedDecision !== 'accepted' && normalizedDecision !== 'approved' && normalizedDecision !== 'rejected') {
    return res.status(400).json({
      success: false,
      message: 'Invalid decision. Value must be "accepted" (or "approved") or "rejected".',
    });
  }

  const finalDecision = normalizedDecision === 'approved' ? 'accepted' : normalizedDecision;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Lock listing and verify ownership
    const [listings] = await conn.query(
      `SELECT id, seller_id, title, status, closing_at
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

    // Ownership check (authoritative backend enforcement)
    if (listing.seller_id !== sellerId) {
      await conn.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only the seller who created this listing can approve or reject the auction result.',
      });
    }

    // Must not be active or closing_soon unless using acceptHighestBidEarly
    if (listing.status === 'active' || listing.status === 'closing_soon') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot record decision while the auction is still active. Use early accept to close and sell immediately.',
      });
    }

    // Must not be unsold
    if (listing.status === 'unsold') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot approve or reject an auction that ended with no bids.',
      });
    }

    // 2. Lock auction_results record
    const [resultRows] = await conn.query(
      `SELECT id, winning_bid_id, seller_decision, handover_status
       FROM auction_results
       WHERE listing_id = ?
       FOR UPDATE`,
      [listingId]
    );

    if (!resultRows || resultRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'No auction result found for this listing.',
      });
    }

    const ar = resultRows[0];

    if (!ar.winning_bid_id) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot decide on an auction with no winning bid.',
      });
    }

    // Prevent re-deciding if already finalized (accepted/rejected)
    if (ar.seller_decision !== 'pending') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Decision has already been finalized as "${ar.seller_decision}". Further changes are not permitted.`,
      });
    }

    // 3. Apply decision
    if (finalDecision === 'accepted') {
      // Seller approved: listing status becomes 'sold'
      // handover_status starts at 'pending' (Awaiting Handover)
      await conn.query(
        `UPDATE listings SET status = 'sold', updated_at = NOW() WHERE id = ?`,
        [listingId]
      );

      await conn.query(
        `UPDATE auction_results
         SET seller_decision = 'accepted',
             handover_status = 'pending',
             updated_at = NOW()
         WHERE id = ?`,
        [ar.id]
      );
    } else {
      // Seller rejected: listing status remains 'ended'
      // handover_status becomes 'cancelled'
      await conn.query(
        `UPDATE auction_results
         SET seller_decision = 'rejected',
             handover_status = 'cancelled',
             updated_at = NOW()
         WHERE id = ?`,
        [ar.id]
      );
    }

    await conn.commit();

    return res.status(200).json({
      success: true,
      message: finalDecision === 'accepted'
        ? 'Auction result approved! You can now coordinate the campus handover with the buyer.'
        : 'Auction result rejected. The transaction will not proceed.',
      decision: finalDecision,
      handover_status: finalDecision === 'accepted' ? 'pending' : 'cancelled',
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error('Error rolling back decideAuctionResult:', rbErr);
    }
    console.error(`Error in POST /api/listings/${listingId}/decision:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record seller decision.',
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * @desc    Update campus handover progress (Awaiting Handover -> Handover Arranged -> Completed)
 * @route   PATCH /api/listings/:id/handover
 * @access  Private (Authorized participants: Seller or Winning Bidder only)
 */
exports.updateHandoverStatus = async (req, res) => {
  const listingId = Number(req.params.id);
  const userId = req.user.id;
  const { status: targetStatus } = req.body;

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid listing ID format.',
    });
  }

  // Validate allowed target status transitions
  const ALLOWED_STATUSES = ['pending', 'scheduled', 'completed', 'cancelled'];
  const normalizedStatus = (targetStatus || '').trim().toLowerCase();

  // Map user-friendly aliases
  let canonicalStatus = normalizedStatus;
  if (normalizedStatus === 'arranged') canonicalStatus = 'scheduled';
  if (normalizedStatus === 'awaiting') canonicalStatus = 'pending';

  if (!ALLOWED_STATUSES.includes(canonicalStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid handover status. Allowed values are: pending (Awaiting Handover), scheduled (Handover Arranged), completed (Completed), or cancelled.`,
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Query listing & auction_results with row locks
    const [results] = await conn.query(
      `SELECT
         ar.id,
         ar.listing_id,
         ar.winning_bid_id,
         ar.seller_decision,
         ar.handover_status,
         l.seller_id,
         b.bidder_id AS winner_id
       FROM auction_results ar
       INNER JOIN listings l ON ar.listing_id = l.id
       LEFT JOIN bids b ON ar.winning_bid_id = b.id
       WHERE ar.listing_id = ?
       FOR UPDATE`,
      [listingId]
    );

    if (!results || results.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: 'No active auction result found for this listing.',
      });
    }

    const record = results[0];

    // Authorization: only seller or winning bidder may access or update handover
    const isSeller = userId === record.seller_id;
    const isWinner = userId === record.winner_id;

    if (!isSeller && !isWinner) {
      await conn.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update handover status for this auction.',
      });
    }

    // Must be approved by seller first
    if (record.seller_decision !== 'accepted') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Handover can only be updated for auctions approved by the seller.',
      });
    }

    if (record.handover_status === 'completed') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Campus handover has already been marked completed.',
      });
    }

    if (record.handover_status === 'cancelled') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'This handover has been cancelled and cannot be updated.',
      });
    }

    // Update handover status and timestamp
    const isCompleted = canonicalStatus === 'completed';
    await conn.query(
      `UPDATE auction_results
       SET handover_status = ?,
           completed_at = ${isCompleted ? 'NOW()' : 'completed_at'},
           updated_at = NOW()
       WHERE id = ?`,
      [canonicalStatus, record.id]
    );

    await conn.commit();

    return res.status(200).json({
      success: true,
      message: `Handover status updated to "${canonicalStatus}".`,
      handover_status: canonicalStatus,
      completed_at: isCompleted ? new Date().toISOString() : null,
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error('Error rolling back updateHandoverStatus:', rbErr);
    }
    console.error(`Error in PATCH /api/listings/${listingId}/handover:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update handover status.',
      error: error.message,
    });
  } finally {
    conn.release();
  }
};
