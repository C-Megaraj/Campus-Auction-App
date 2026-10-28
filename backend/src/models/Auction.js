const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    images: [{ type: String }],
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['electronics', 'books', 'clothing', 'sports', 'furniture', 'other'],
    },
    condition: {
      type: String,
      enum: ['new', 'like-new', 'good', 'fair', 'poor'],
      required: true,
    },
    startingBid: {
      type: Number,
      required: [true, 'Starting bid is required'],
      min: [0, 'Starting bid must be positive'],
    },
    currentBid: {
      type: Number,
      default: 0,
    },
    minBidIncrement: {
      type: Number,
      default: 1,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'ended', 'cancelled'],
      default: 'active',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    bids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bid' }],
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Auto-set status to 'ended' when endTime passes
auctionSchema.index({ endTime: 1 });

// Virtual: is auction live?
auctionSchema.virtual('isLive').get(function () {
  return this.status === 'active' && new Date() < this.endTime;
});

module.exports = mongoose.model('Auction', auctionSchema);

