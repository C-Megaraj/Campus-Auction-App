-- ==============================================================================
-- Campus Auction App - Seed Data
-- File: database/seed.sql
-- Description: Fictional sample data for development and demonstration.
-- NOTE: Never add real student identities, real passwords, or production credentials.
-- ==============================================================================

USE campus_auction;

-- Temporarily disable foreign key checks during batch seed reset
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE auction_results;
TRUNCATE TABLE watchlist;
TRUNCATE TABLE bids;
TRUNCATE TABLE listing_images;
TRUNCATE TABLE listings;
TRUNCATE TABLE categories;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. Seed Categories
-- Exactly aligns with the marketplace's 4 required categories.
-- ------------------------------------------------------------------------------
INSERT INTO categories (id, category_name) VALUES
  (1, 'Books'),
  (2, 'Electronics'),
  (3, 'Cycles'),
  (4, 'Other Items');

-- ------------------------------------------------------------------------------
-- 2. Seed Users (Fictional campus student profiles)
-- Passwords are dummy bcrypt hashes representing fictional passwords for testing.
-- ------------------------------------------------------------------------------
INSERT INTO users (id, full_name, email, password_hash, student_verification_status, created_at) VALUES
  (1, 'Alex Miller', 'alex.miller@campus.fake.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbTzP9P/Vz0G5Oa', 'verified', '2026-09-01 10:00:00'),
  (2, 'Priya Sharma', 'priya.sharma@campus.fake.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbTzP9P/Vz0G5Oa', 'verified', '2026-09-03 11:30:00'),
  (3, 'Marcus King', 'marcus.king@campus.fake.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbTzP9P/Vz0G5Oa', 'verified', '2026-09-05 14:15:00'),
  (4, 'Chen Wang', 'chen.wang@campus.fake.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbTzP9P/Vz0G5Oa', 'verified', '2026-09-10 09:20:00'),
  (5, 'Sarah Taylor', 'sarah.taylor@campus.fake.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbTzP9P/Vz0G5Oa', 'verified', '2026-09-12 16:45:00'),
  (6, 'Elena Rostova', 'elena.rostova@campus.fake.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbTzP9P/Vz0G5Oa', 'verified', '2026-09-15 13:10:00'),
  (7, 'Daniel Kim', 'daniel.kim@campus.fake.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbTzP9P/Vz0G5Oa', 'verified', '2026-09-18 17:00:00'),
  (8, 'Samantha Reed', 'samantha.reed@campus.fake.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbTzP9P/Vz0G5Oa', 'unverified', '2026-09-20 18:30:00');

-- ------------------------------------------------------------------------------
-- 3. Seed Listings (Realistic campus auction listings)
-- ------------------------------------------------------------------------------
INSERT INTO listings (
  id, seller_id, category_id, title, description, `condition`,
  starting_price, minimum_bid_increment, closing_at, status, created_at
) VALUES
  (
    1, 1, 2,
    'TI-84 Plus CE Color Graphing Calculator (With Charger & Case)',
    'Used for two semesters in Calc II and Stats. High-resolution backlit color screen with rechargeable battery. Includes slide case and mini-USB charging cable. Exam mode cleared.',
    'Like New',
    30.00, 2.00,
    DATE_ADD(NOW(), INTERVAL 2 HOUR),
    'closing_soon',
    '2026-10-25 09:00:00'
  ),
  (
    2, 2, 1,
    'Organic Chemistry (Vollhardt & Schore 8th Ed) + Full Study Guide',
    'The standard required textbook for CHEM 2210/2220 series. Clean interior pages, minimal pencil notes in chapters 3 and 7. Solutions manual included.',
    'Good',
    20.00, 2.00,
    DATE_ADD(NOW(), INTERVAL 3 DAY),
    'active',
    '2026-10-26 11:30:00'
  ),
  (
    3, 3, 3,
    'Trek FX 2 Disc Hybrid Commuter Bike (Medium Frame, with U-Lock)',
    'Lightweight aluminum commuter bike with hydraulic disc brakes and 18-speed Shimano gears. Recently tuned up. Includes heavy-duty Kryptonite U-lock and safety lights.',
    'Like New',
    120.00, 5.00,
    DATE_ADD(NOW(), INTERVAL 5 DAY),
    'active',
    '2026-10-26 14:00:00'
  ),
  (
    4, 4, 2,
    'Dell UltraSharp 27" 4K USB-C Hub Monitor (Model U2720Q)',
    '90W USB-C power delivery charges laptop while providing 4K display. IPS panel, HDR400, factory calibrated color gamut. Complete in original box.',
    'New',
    150.00, 10.00,
    DATE_ADD(NOW(), INTERVAL 4 DAY),
    'active',
    '2026-10-27 10:15:00'
  ),
  (
    5, 5, 4,
    'Compact Dorm Mini-Fridge with Top Freezer (3.2 cu. ft EnergyStar)',
    'Clean and sanitized double-door mini fridge with dedicated freezer section. Quiet compressor, approved for all standard dorm power circuits.',
    'Good',
    25.00, 3.00,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    'ended',
    '2026-10-20 08:00:00'
  ),
  (
    6, 6, 2,
    'Sony WH-1000XM4 Noise Canceling Wireless Headphones (Silver)',
    'Industry leading noise cancellation, multipoint Bluetooth pairing, pristine ear cushions. Includes audio cable, airline adapter, and protective travel case.',
    'Like New',
    85.00, 5.00,
    DATE_ADD(NOW(), INTERVAL 45 MINUTE),
    'closing_soon',
    '2026-10-26 15:45:00'
  );

-- ------------------------------------------------------------------------------
-- 4. Seed Listing Images
-- ------------------------------------------------------------------------------
INSERT INTO listing_images (id, listing_id, image_url, is_primary) VALUES
  (1, 1, '/images/listings/ti84-front.png', TRUE),
  (2, 1, '/images/listings/ti84-case.png', FALSE),
  (3, 2, '/images/listings/ochem-cover.png', TRUE),
  (4, 2, '/images/listings/ochem-solutions.png', FALSE),
  (5, 3, '/images/listings/trek-profile.png', TRUE),
  (6, 3, '/images/listings/trek-gears.png', FALSE),
  (7, 4, '/images/listings/dell-monitor-front.png', TRUE),
  (8, 5, '/images/listings/mini-fridge-front.png', TRUE),
  (9, 6, '/images/listings/sony-xm4-silver.png', TRUE);

-- ------------------------------------------------------------------------------
-- 5. Seed Bids
-- Transparent student bid history with realistic ascending bid progressions.
-- ------------------------------------------------------------------------------
INSERT INTO bids (id, listing_id, bidder_id, amount, created_at) VALUES
  -- Bids for Listing 1: TI-84 Calculator (Starting: $30.00, Increment: $2.00)
  (1, 1, 7, 30.00, '2026-10-25 10:15:00'),
  (2, 1, 8, 35.00, '2026-10-25 14:30:00'),
  (3, 1, 7, 48.00, '2026-10-26 09:20:00'),
  (4, 1, 8, 55.00, '2026-10-26 18:05:00'),
  (5, 1, 7, 60.00, '2026-10-27 11:40:00'),
  (6, 1, 8, 65.00, '2026-10-27 16:15:00'),
  (7, 1, 7, 68.00, '2026-10-28 08:30:00'),

  -- Bids for Listing 2: Organic Chemistry (Starting: $20.00, Increment: $2.00)
  (8, 2, 1, 20.00, '2026-10-26 13:00:00'),
  (9, 2, 3, 28.00, '2026-10-26 19:45:00'),
  (10, 2, 7, 36.00, '2026-10-27 10:10:00'),
  (11, 2, 3, 42.00, '2026-10-27 14:25:00'),
  (12, 2, 7, 45.00, '2026-10-28 09:15:00'),

  -- Bids for Listing 3: Trek FX 2 Bike (Starting: $120.00, Increment: $5.00)
  (13, 3, 4, 120.00, '2026-10-26 16:00:00'),
  (14, 3, 2, 150.00, '2026-10-27 11:20:00'),
  (15, 3, 4, 165.00, '2026-10-27 17:35:00'),
  (16, 3, 2, 180.00, '2026-10-28 07:50:00'),
  (17, 3, 7, 195.00, '2026-10-28 10:45:00'),

  -- Bids for Listing 4: Dell 4K Monitor (Starting: $150.00, Increment: $10.00)
  (18, 4, 1, 150.00, '2026-10-27 12:00:00'),
  (19, 4, 3, 180.00, '2026-10-27 16:40:00'),
  (20, 4, 1, 200.00, '2026-10-27 21:10:00'),
  (21, 4, 3, 220.00, '2026-10-28 08:05:00'),
  (22, 4, 6, 230.00, '2026-10-28 11:15:00'),

  -- Bids for Listing 5: Dorm Mini-Fridge (Ended - Winning bid: $58.00)
  (23, 5, 2, 25.00, '2026-10-20 10:00:00'),
  (24, 5, 4, 35.00, '2026-10-21 14:30:00'),
  (25, 5, 2, 46.00, '2026-10-22 17:15:00'),
  (26, 5, 4, 55.00, '2026-10-23 19:00:00'),
  (27, 5, 7, 58.00, '2026-10-24 16:50:00');

-- ------------------------------------------------------------------------------
-- 6. Seed Watchlist Entries
-- Unique user + listing combinations testing duplicate prevention.
-- ------------------------------------------------------------------------------
INSERT INTO watchlist (user_id, listing_id, created_at) VALUES
  (7, 1, '2026-10-25 10:00:00'), -- Daniel watches Calculator
  (7, 3, '2026-10-26 15:00:00'), -- Daniel watches Bike
  (7, 6, '2026-10-27 09:30:00'), -- Daniel watches Headphones
  (8, 1, '2026-10-25 11:20:00'), -- Samantha watches Calculator
  (2, 4, '2026-10-27 13:00:00'), -- Priya watches Dell Monitor
  (1, 3, '2026-10-26 18:30:00'); -- Alex watches Bike

-- ------------------------------------------------------------------------------
-- 7. Seed Auction Results
-- Sample outcome for Listing 5 (ended mini-fridge auction won by Daniel Kim).
-- ------------------------------------------------------------------------------
INSERT INTO auction_results (
  id, listing_id, winning_bid_id, seller_decision, handover_status, completed_at, created_at
) VALUES
  (
    1, 5, 27,
    'accepted',
    'completed',
    '2026-10-25 14:00:00',
    '2026-10-24 17:00:00'
  );

