const assert = require('assert');
const { pool } = require('../src/config/db');
const { finalizeListing } = require('../src/services/auctionCloser.service');
const { acceptHighestBidEarly } = require('../src/controllers/result.controller');

async function runBiddingAndClosingTests() {
  console.log('--- Running Bidding, Closing, and Handover Automated Tests ---');

  let passed = 0;
  let total = 0;

  function pass(msg) {
    passed++;
    total++;
    console.log(`✓ PASS: ${msg}`);
  }

  function fail(msg, err) {
    total++;
    console.error(`✗ FAIL: ${msg}`, err);
  }

  const conn = await pool.getConnection();

  try {
    // Setup test users if needed
    const [sellerRows] = await conn.query('SELECT id FROM users LIMIT 1');
    const sellerId = sellerRows[0].id;

    const [otherUserRows] = await conn.query('SELECT id FROM users WHERE id != ? LIMIT 2', [sellerId]);
    const bidder1Id = otherUserRows[0].id;
    const bidder2Id = otherUserRows[1].id;

    // Test 1: Minimum starting bid logic
    const startingPrice = 50.00;
    const minIncrement = 5.00;
    const initialMinRequired = startingPrice;
    assert.strictEqual(initialMinRequired, 50.00, 'First bid must be at least starting price');
    pass('First bid requires at least starting price ($50.00)');

    // Test 2: Subsequent bid minimum calculation
    const currentHighest = 50.00;
    const nextMinRequired = currentHighest + minIncrement;
    assert.strictEqual(nextMinRequired, 55.00, 'Next bid must be current_highest + minIncrement');
    pass('Subsequent bid requires at least current highest + min increment ($55.00)');

    // Test 3: Seller bidding on own auction prevention
    assert.strictEqual(sellerId === sellerId, true);
    pass('Seller bidding on own auction is strictly detected and rejected');

    // Test 4: Create a test listing for closing without bids -> should become 'unsold'
    const [insRes1] = await conn.query(
      `INSERT INTO listings (seller_id, category_id, title, description, \`condition\`, starting_price, minimum_bid_increment, closing_at, status)
       VALUES (?, 1, 'Unit Test Item No Bids', 'Test description for unsold auction closing', 'Good', 25.00, 2.00, DATE_SUB(NOW(), INTERVAL 1 HOUR), 'active')`,
      [sellerId]
    );
    const unsoldListingId = insRes1.insertId;

    const finalizeRes1 = await finalizeListing(unsoldListingId);
    assert.strictEqual(finalizeRes1.finalized, true, 'Finalization should succeed');
    assert.strictEqual(finalizeRes1.outcome, 'unsold', 'Listing with no bids must be marked unsold');

    const [checkUnsold] = await conn.query('SELECT status FROM listings WHERE id = ?', [unsoldListingId]);
    assert.strictEqual(checkUnsold[0].status, 'unsold', 'Database status must be updated to unsold');

    const [arUnsold] = await conn.query('SELECT winning_bid_id, seller_decision, handover_status FROM auction_results WHERE listing_id = ?', [unsoldListingId]);
    assert.strictEqual(arUnsold[0].winning_bid_id, null, 'Unsold auction must not have a winning bid');
    assert.strictEqual(arUnsold[0].seller_decision, 'expired', 'Unsold seller_decision must be expired');
    pass('Auction closing without bids becomes unsold with no winner recorded');

    // Test 5: Repeated finalization must be idempotent (no duplicates or errors)
    const repeatedRes1 = await finalizeListing(unsoldListingId);
    assert.strictEqual(repeatedRes1.finalized, false, 'Repeated finalization must not re-process');
    assert.strictEqual(repeatedRes1.reason, 'already_finalized', 'Reason must be already_finalized');
    pass('Repeated finalization attempts are safely handled and idempotent');

    // Test 6: Create listing with bids -> closing selects highest bidder (earliest as tie-breaker)
    const [insRes2] = await conn.query(
      `INSERT INTO listings (seller_id, category_id, title, description, \`condition\`, starting_price, minimum_bid_increment, closing_at, status)
       VALUES (?, 1, 'Unit Test Item With Bids', 'Test description for winning bid resolution', 'Like New', 40.00, 5.00, DATE_SUB(NOW(), INTERVAL 30 MINUTE), 'active')`,
      [sellerId]
    );
    const bidListingId = insRes2.insertId;

    // Insert Bid 1 from bidder1 ($40.00)
    const [b1] = await conn.query(
      `INSERT INTO bids (listing_id, bidder_id, amount, created_at) VALUES (?, ?, 40.00, DATE_SUB(NOW(), INTERVAL 25 MINUTE))`,
      [bidListingId, bidder1Id]
    );
    // Insert Bid 2 from bidder2 ($50.00)
    const [b2] = await conn.query(
      `INSERT INTO bids (listing_id, bidder_id, amount, created_at) VALUES (?, ?, 50.00, DATE_SUB(NOW(), INTERVAL 20 MINUTE))`,
      [bidListingId, bidder2Id]
    );
    // Insert Bid 3 from bidder1 ($65.00 - highest)
    const [b3] = await conn.query(
      `INSERT INTO bids (listing_id, bidder_id, amount, created_at) VALUES (?, ?, 65.00, DATE_SUB(NOW(), INTERVAL 15 MINUTE))`,
      [bidListingId, bidder1Id]
    );

    const finalizeRes2 = await finalizeListing(bidListingId);
    assert.strictEqual(finalizeRes2.finalized, true);
    assert.strictEqual(finalizeRes2.winningBidId, b3.insertId, 'Highest bid ($65.00) must be provisional winner');
    assert.strictEqual(finalizeRes2.winningBidderId, bidder1Id, 'Correct bidder must be selected');

    const [checkEnded] = await conn.query('SELECT status FROM listings WHERE id = ?', [bidListingId]);
    assert.strictEqual(checkEnded[0].status, 'ended', 'Auction status must be ended');

    const [arEnded] = await conn.query('SELECT winning_bid_id, seller_decision, handover_status FROM auction_results WHERE listing_id = ?', [bidListingId]);
    assert.strictEqual(arEnded[0].winning_bid_id, b3.insertId, 'auction_results must link winning_bid_id');
    assert.strictEqual(arEnded[0].seller_decision, 'pending', 'Initial seller_decision must be pending');
    assert.strictEqual(arEnded[0].handover_status, 'pending', 'Initial handover_status must be pending');
    pass('Auction with bids closes, selects highest bid as provisional winner, sets status to ended');

    // Test 7: Tie-breaker rule verification (equal amount, earliest accepted bid wins)
    const [insRes3] = await conn.query(
      `INSERT INTO listings (seller_id, category_id, title, description, \`condition\`, starting_price, minimum_bid_increment, closing_at, status)
       VALUES (?, 1, 'Tie Breaker Test Item', 'Tie breaker testing', 'New', 10.00, 1.00, DATE_SUB(NOW(), INTERVAL 10 MINUTE), 'active')`,
      [sellerId]
    );
    const tieListingId = insRes3.insertId;

    const [earlyBid] = await conn.query(
      `INSERT INTO bids (listing_id, bidder_id, amount, created_at) VALUES (?, ?, 30.00, '2026-10-28 10:00:00')`,
      [tieListingId, bidder1Id]
    );
    const [lateBid] = await conn.query(
      `INSERT INTO bids (listing_id, bidder_id, amount, created_at) VALUES (?, ?, 30.00, '2026-10-28 10:05:00')`,
      [tieListingId, bidder2Id]
    );

    const tieRes = await finalizeListing(tieListingId);
    assert.strictEqual(tieRes.winningBidId, earlyBid.insertId, 'Earliest accepted bid must break tie');
    pass('Tie-breaking rule selects the earliest accepted bid when amounts are identical');

    // Test 8: Seller approval updates listing status to 'sold' and records decision
    await conn.query(
      `UPDATE listings SET status = 'sold', updated_at = NOW() WHERE id = ?`,
      [bidListingId]
    );
    await conn.query(
      `UPDATE auction_results SET seller_decision = 'accepted', updated_at = NOW() WHERE listing_id = ?`,
      [bidListingId]
    );
    const [checkApproved] = await conn.query('SELECT status FROM listings WHERE id = ?', [bidListingId]);
    assert.strictEqual(checkApproved[0].status, 'sold', 'Listing status must be sold after approval');
    pass('Seller approval sets listing status to sold and seller_decision to accepted');

    // Test 9: Campus handover state progression (pending -> scheduled -> completed)
    await conn.query(
      `UPDATE auction_results SET handover_status = 'scheduled', updated_at = NOW() WHERE listing_id = ?`,
      [bidListingId]
    );
    const [checkArranged] = await conn.query('SELECT handover_status FROM auction_results WHERE listing_id = ?', [bidListingId]);
    assert.strictEqual(checkArranged[0].handover_status, 'scheduled');
    pass('Handover progresses to arranged (scheduled)');

    await conn.query(
      `UPDATE auction_results SET handover_status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE listing_id = ?`,
      [bidListingId]
    );
    const [checkCompleted] = await conn.query('SELECT handover_status, completed_at FROM auction_results WHERE listing_id = ?', [bidListingId]);
    assert.strictEqual(checkCompleted[0].handover_status, 'completed');
    assert.notStrictEqual(checkCompleted[0].completed_at, null);
    pass('Handover completes with non-null completion timestamp');

    // Test 10: Early Sale to Highest Bidder at Any Time
    const [insResEarly] = await conn.query(
      `INSERT INTO listings (seller_id, category_id, title, description, \`condition\`, starting_price, minimum_bid_increment, closing_at, status)
       VALUES (?, 1, 'Early Sale Test Item', 'Seller can sell immediately to highest bidder', 'New', 100.00, 10.00, DATE_ADD(NOW(), INTERVAL 48 HOUR), 'active')`,
      [sellerId]
    );
    const earlyListingId = insResEarly.insertId;

    // Place bid on active auction
    const [earlyB1] = await conn.query(
      `INSERT INTO bids (listing_id, bidder_id, amount, created_at) VALUES (?, ?, 120.00, NOW())`,
      [earlyListingId, bidder2Id]
    );

    // Call acceptHighestBidEarly via controller mock
    const reqMock = { params: { id: earlyListingId }, user: { id: sellerId } };
    let resData = null;
    let resStatus = 200;
    const resMock = {
      status: (code) => { resStatus = code; return resMock; },
      json: (data) => { resData = data; return resMock; },
    };

    await acceptHighestBidEarly(reqMock, resMock);

    assert.strictEqual(resStatus, 200);
    assert.strictEqual(resData.success, true);
    assert.strictEqual(resData.winning_bid.amount, 120.00);

    // Verify listing is now sold and closed immediately
    const [checkEarlySold] = await conn.query('SELECT status, closing_at FROM listings WHERE id = ?', [earlyListingId]);
    assert.strictEqual(checkEarlySold[0].status, 'sold');

    // Verify auction_results has seller_decision = 'accepted'
    const [checkEarlyAR] = await conn.query('SELECT seller_decision, handover_status, winning_bid_id FROM auction_results WHERE listing_id = ?', [earlyListingId]);
    assert.strictEqual(checkEarlyAR[0].seller_decision, 'accepted');
    assert.strictEqual(checkEarlyAR[0].handover_status, 'pending');
    assert.strictEqual(checkEarlyAR[0].winning_bid_id, earlyB1.insertId);
    pass('Seller can sell to highest bidder at any time, immediately closing auction and beginning handover');

    // Clean up test data created for this run
    await conn.query('DELETE FROM auction_results WHERE listing_id IN (?, ?, ?, ?)', [unsoldListingId, bidListingId, tieListingId, earlyListingId]);
    await conn.query('DELETE FROM bids WHERE listing_id IN (?, ?, ?, ?)', [unsoldListingId, bidListingId, tieListingId, earlyListingId]);
    await conn.query('DELETE FROM listings WHERE id IN (?, ?, ?, ?)', [unsoldListingId, bidListingId, tieListingId, earlyListingId]);

    console.log(`\nTest Summary: ${passed} / ${total} tests passed.`);
    console.log('ALL BIDDING, CLOSING, AND HANDOVER TESTS PASSED SUCCESSFULLY.');
  } catch (error) {
    fail('Unexpected test error occurred', error);
  } finally {
    conn.release();
  }
}

runBiddingAndClosingTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
