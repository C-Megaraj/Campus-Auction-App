const { pool } = require('../config/db');

/**
 * Core auction finalization logic for a single listing.
 * Safe, transactional, idempotent.
 *
 * @param {number} listingId - ID of the listing to finalize
 * @param {object} [connection] - Optional existing transaction connection
 * @returns {Promise<object>} Result summary { finalized, outcome, winningBidId, winnerId, amount }
 */
async function finalizeListing(listingId, externalConn = null) {
  const conn = externalConn || await pool.getConnection();
  const ownsConnection = !externalConn;

  try {
    if (ownsConnection) {
      await conn.beginTransaction();
    }

    // 1. Lock listing row FOR UPDATE to prevent race conditions
    const [listings] = await conn.query(
      `SELECT id, seller_id, title, starting_price, closing_at, status
       FROM listings
       WHERE id = ?
       FOR UPDATE`,
      [listingId]
    );

    if (!listings || listings.length === 0) {
      if (ownsConnection) await conn.rollback();
      return { finalized: false, reason: 'listing_not_found' };
    }

    const listing = listings[0];

    // If already finalized or cancelled, check if auction_results already exists
    const [existingResults] = await conn.query(
      `SELECT id, winning_bid_id, seller_decision, handover_status
       FROM auction_results
       WHERE listing_id = ?`,
      [listingId]
    );

    if (existingResults.length > 0) {
      if (ownsConnection) await conn.commit();
      return {
        finalized: false,
        reason: 'already_finalized',
        result: existingResults[0],
      };
    }

    if (listing.status === 'cancelled') {
      if (ownsConnection) await conn.commit();
      return { finalized: false, reason: 'listing_cancelled' };
    }

    // 2. Query all accepted bids for this listing, ordered by amount DESC, created_at ASC (tie-breaking rule: earliest accepted bid)
    const [bids] = await conn.query(
      `SELECT id, bidder_id, amount, created_at
       FROM bids
       WHERE listing_id = ?
       ORDER BY amount DESC, created_at ASC
       FOR UPDATE`,
      [listingId]
    );

    let outcome;
    let winningBidId = null;
    let winningBidderId = null;
    let winningAmount = null;

    if (bids.length > 0) {
      // Highest bid wins (with earliest created_at as tie-breaker)
      const topBid = bids[0];
      winningBidId = topBid.id;
      winningBidderId = topBid.bidder_id;
      winningAmount = Number(topBid.amount);
      outcome = 'ended_with_bids';

      // Update listing status to 'ended'
      await conn.query(
        `UPDATE listings SET status = 'ended', updated_at = NOW() WHERE id = ?`,
        [listingId]
      );

      // Create record in auction_results with seller_decision = 'pending'
      await conn.query(
        `INSERT INTO auction_results (listing_id, winning_bid_id, seller_decision, handover_status)
         VALUES (?, ?, 'pending', 'pending')
         ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        [listingId, winningBidId]
      );
    } else {
      // No bids: mark listing as 'unsold'
      outcome = 'unsold';

      await conn.query(
        `UPDATE listings SET status = 'unsold', updated_at = NOW() WHERE id = ?`,
        [listingId]
      );

      // Create record in auction_results with winning_bid_id = NULL, seller_decision = 'expired'
      await conn.query(
        `INSERT INTO auction_results (listing_id, winning_bid_id, seller_decision, handover_status)
         VALUES (?, NULL, 'expired', 'cancelled')
         ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        [listingId]
      );
    }

    if (ownsConnection) {
      await conn.commit();
    }

    return {
      finalized: true,
      outcome,
      listingId,
      winningBidId,
      winningBidderId,
      winningAmount,
    };
  } catch (error) {
    if (ownsConnection) {
      try {
        await conn.rollback();
      } catch (rbErr) {
        console.error('Error rolling back during finalizeListing:', rbErr);
      }
    }
    throw error;
  } finally {
    if (ownsConnection) {
      conn.release();
    }
  }
}

/**
 * Scan database for all expired active auctions (closing_at <= NOW())
 * and finalize each safely.
 *
 * @returns {Promise<object>} Summary of processed auctions
 */
async function processExpiredAuctions() {
  try {
    // Find active or closing_soon auctions whose closing time has passed
    const [expiredListings] = await pool.query(
      `SELECT id, title, closing_at, status
       FROM listings
       WHERE status IN ('active', 'closing_soon')
         AND closing_at <= NOW()
       ORDER BY closing_at ASC`
    );

    if (expiredListings.length === 0) {
      return { processedCount: 0, results: [] };
    }

    const results = [];
    for (const listing of expiredListings) {
      try {
        const res = await finalizeListing(listing.id);
        results.push({ listingId: listing.id, ...res });
      } catch (err) {
        console.error(`Failed to finalize listing ${listing.id}:`, err);
        results.push({ listingId: listing.id, finalized: false, error: err.message });
      }
    }

    return {
      processedCount: results.length,
      results,
    };
  } catch (error) {
    console.error('Error in processExpiredAuctions:', error);
    throw error;
  }
}

/**
 * Start recurring background scheduler (runs every 10 seconds).
 * Idempotent, safe, lightweight.
 */
let schedulerInterval = null;

function startAuctionScheduler(intervalMs = 10000) {
  if (schedulerInterval) {
    return; // Already running
  }

  // Run initial scan immediately
  processExpiredAuctions().catch((err) =>
    console.error('Initial auction scheduler scan error:', err.message)
  );

  schedulerInterval = setInterval(() => {
    processExpiredAuctions().catch((err) =>
      console.error('Background auction scheduler run error:', err.message)
    );
  }, intervalMs);

  console.log(`✓ Auction closing scheduler active (checking every ${intervalMs / 1000}s)`);
}

function stopAuctionScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Auction closing scheduler stopped.');
  }
}

module.exports = {
  finalizeListing,
  processExpiredAuctions,
  startAuctionScheduler,
  stopAuctionScheduler,
};

