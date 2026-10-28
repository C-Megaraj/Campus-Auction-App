-- ==============================================================================
-- Campus Auction App - Database Schema
-- File: database/schema.sql
-- Engine: MySQL 8.0+ / MariaDB 10.5+
-- ==============================================================================

-- Create database if it does not already exist
CREATE DATABASE IF NOT EXISTS campus_auction
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campus_auction;

-- ------------------------------------------------------------------------------
-- Drop existing tables in reverse dependency order to avoid foreign key errors
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS auction_results;
DROP TABLE IF EXISTS watchlist;
DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS listing_images;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- ------------------------------------------------------------------------------
-- 1. Table: users
-- Stores registered campus student profiles with credentials & verification.
-- ------------------------------------------------------------------------------
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  student_verification_status ENUM('unverified', 'pending', 'verified') NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints & Indexes
  CONSTRAINT uq_users_email UNIQUE (email),
  INDEX idx_users_verification (student_verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Table: categories
-- Standardized marketplace categories for item organization.
-- ------------------------------------------------------------------------------
CREATE TABLE categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL,
  
  -- Constraints & Indexes
  CONSTRAINT uq_categories_name UNIQUE (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Table: listings
-- Core auction listings posted by campus student sellers.
-- ------------------------------------------------------------------------------
CREATE TABLE listings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  `condition` ENUM('New', 'Like New', 'Good', 'Fair') NOT NULL,
  starting_price DECIMAL(10, 2) NOT NULL,
  minimum_bid_increment DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  closing_at DATETIME NOT NULL,
  status ENUM('active', 'closing_soon', 'ended', 'sold', 'cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Price & Increment Validation Checks
  CONSTRAINT chk_listings_starting_price CHECK (starting_price > 0.00),
  CONSTRAINT chk_listings_min_increment CHECK (minimum_bid_increment >= 1.00),
  
  -- Foreign Keys
  CONSTRAINT fk_listings_seller FOREIGN KEY (seller_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_listings_category FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
  -- Indexes for search, filter & closing time sorting
  INDEX idx_listings_category (category_id),
  INDEX idx_listings_seller (seller_id),
  INDEX idx_listings_status (status),
  INDEX idx_listings_closing_at (closing_at),
  INDEX idx_listings_composite (status, category_id, closing_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Table: listing_images
-- Photos and visual previews associated with an auction listing.
-- ------------------------------------------------------------------------------
CREATE TABLE listing_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id INT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys & Indexes
  CONSTRAINT fk_listing_images_listing FOREIGN KEY (listing_id)
    REFERENCES listings (id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_listing_images_listing (listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Table: bids
-- Public and transparent bids submitted by verified student bidders.
-- ------------------------------------------------------------------------------
CREATE TABLE bids (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id INT UNSIGNED NOT NULL,
  bidder_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Bid Amount Validation Check
  CONSTRAINT chk_bids_amount CHECK (amount > 0.00),
  
  -- Foreign Keys
  CONSTRAINT fk_bids_listing FOREIGN KEY (listing_id)
    REFERENCES listings (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bids_bidder FOREIGN KEY (bidder_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
  -- Performance Indexes: Quick lookup of highest bid for each listing
  INDEX idx_bids_listing_amount (listing_id, amount DESC),
  INDEX idx_bids_bidder (bidder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Table: watchlist
-- Tracks saved auctions for students with duplicate prevention.
-- ------------------------------------------------------------------------------
CREATE TABLE watchlist (
  user_id INT UNSIGNED NOT NULL,
  listing_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Composite Primary Key prevents duplicate watchlist entries for same user and listing
  PRIMARY KEY (user_id, listing_id),
  
  -- Foreign Keys
  CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_watchlist_listing FOREIGN KEY (listing_id)
    REFERENCES listings (id) ON DELETE CASCADE ON UPDATE CASCADE,
    
  INDEX idx_watchlist_listing (listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Table: auction_results
-- Concluded auction outcomes, winning bid resolution, and campus handover status.
-- ------------------------------------------------------------------------------
CREATE TABLE auction_results (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id INT UNSIGNED NOT NULL,
  winning_bid_id INT UNSIGNED DEFAULT NULL,
  seller_decision ENUM('pending', 'accepted', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
  handover_status ENUM('pending', 'scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  completed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Ensure only one auction result record per listing
  CONSTRAINT uq_auction_results_listing UNIQUE (listing_id),
  
  -- Foreign Keys
  CONSTRAINT fk_auction_results_listing FOREIGN KEY (listing_id)
    REFERENCES listings (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_auction_results_winning_bid FOREIGN KEY (winning_bid_id)
    REFERENCES bids (id) ON DELETE SET NULL ON UPDATE CASCADE,
    
  INDEX idx_auction_results_handover (handover_status),
  INDEX idx_auction_results_decision (seller_decision)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

