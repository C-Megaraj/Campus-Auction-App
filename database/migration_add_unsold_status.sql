-- Migration: Add 'unsold' to listings status ENUM
-- Safe migration: preserves all existing data and foreign keys
ALTER TABLE listings 
  MODIFY COLUMN status ENUM('active', 'closing_soon', 'ended', 'sold', 'cancelled', 'unsold') 
  NOT NULL DEFAULT 'active';

