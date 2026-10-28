const { pool } = require('../config/db');

// Allowlist of valid sorting options to prevent SQL injection
const SORT_MAPPINGS = {
  'closing-soon': 'l.closing_at ASC',
  'closing_soon': 'l.closing_at ASC',
  'price-low-high': 'current_bid ASC',
  'price_asc': 'current_bid ASC',
  'price-high-low': 'current_bid DESC',
  'price_desc': 'current_bid DESC',
  'newest': 'l.created_at DESC',
  'bids-count': 'bids_count DESC',
  'most_bids': 'bids_count DESC',
};

// Allowlist of valid conditions
const VALID_CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

// Allowlist of valid statuses
const VALID_STATUSES = ['active', 'closing_soon', 'ended', 'sold', 'cancelled'];

/**
 * @desc    Get all auction listings from MySQL with optional filtering and sorting
 * @route   GET /api/listings
 * @access  Public
 */
exports.getListings = async (req, res) => {
  try {
    const {
      search,
      q,
      category,
      condition,
      min_price,
      minPrice,
      max_price,
      maxPrice,
      status,
      sort,
    } = req.query;

    const searchTerm = (search || q || '').trim();
    const minVal = min_price !== undefined ? min_price : minPrice;
    const maxVal = max_price !== undefined ? max_price : maxPrice;

    // Base SELECT with joins and subqueries for category, seller, images, and live bid metrics
    let sql = `
      SELECT
        l.id,
        l.seller_id,
        l.category_id,
        l.title,
        l.description,
        l.condition,
        l.starting_price,
        l.minimum_bid_increment,
        l.closing_at,
        l.status,
        l.created_at,
        l.updated_at,
        c.category_name,
        u.full_name AS seller_name,
        u.email AS seller_email,
        u.student_verification_status AS seller_verification_status,
        COALESCE(
          (SELECT MAX(amount) FROM bids WHERE listing_id = l.id),
          l.starting_price
        ) AS current_bid,
        (SELECT COUNT(*) FROM bids WHERE listing_id = l.id) AS bids_count,
        (
          SELECT image_url
          FROM listing_images
          WHERE listing_id = l.id
          ORDER BY is_primary DESC, id ASC
          LIMIT 1
        ) AS primary_image_url
      FROM listings l
      INNER JOIN categories c ON l.category_id = c.id
      INNER JOIN users u ON l.seller_id = u.id
    `;

    const whereClauses = [];
    const queryParams = [];

    // 1. Keyword search on item title (parameterized)
    if (searchTerm) {
      whereClauses.push('l.title LIKE ?');
      queryParams.push(`%${searchTerm}%`);
    }

    // 2. Category filter by ID or category name
    if (category && category !== 'all') {
      const catNum = Number(category);
      if (!isNaN(catNum) && catNum > 0) {
        whereClauses.push('l.category_id = ?');
        queryParams.push(catNum);
      } else {
        const catStr = category.trim().toLowerCase();
        if (catStr === 'other' || catStr === 'other items') {
          whereClauses.push("LOWER(c.category_name) LIKE '%other%'");
        } else {
          whereClauses.push('(LOWER(c.category_name) = ? OR LOWER(c.category_name) LIKE ?)');
          queryParams.push(catStr, `%${catStr}%`);
        }
      }
    }

    // 3. Condition filter (validated against allowlist)
    if (condition && condition !== 'all') {
      const matchedCondition = VALID_CONDITIONS.find(
        (c) => c.toLowerCase() === condition.trim().toLowerCase()
      );
      if (matchedCondition) {
        whereClauses.push('l.condition = ?');
        queryParams.push(matchedCondition);
      }
    }

    // 4. Status filter (validated against allowlist; defaults to active/closing_soon/ended unless specified)
    if (status && status !== 'all') {
      if (VALID_STATUSES.includes(status.trim().toLowerCase())) {
        whereClauses.push('l.status = ?');
        queryParams.push(status.trim().toLowerCase());
      }
    } else {
      whereClauses.push("l.status != 'cancelled'");
    }

    // 5. Minimum price filter (evaluated on current_bid)
    if (minVal !== undefined && minVal !== '') {
      const parsedMin = Number(minVal);
      if (!isNaN(parsedMin) && parsedMin >= 0) {
        whereClauses.push(`
          COALESCE(
            (SELECT MAX(amount) FROM bids WHERE listing_id = l.id),
            l.starting_price
          ) >= ?
        `);
        queryParams.push(parsedMin);
      }
    }

    // 6. Maximum price filter (evaluated on current_bid)
    if (maxVal !== undefined && maxVal !== '') {
      const parsedMax = Number(maxVal);
      if (!isNaN(parsedMax) && parsedMax >= 0) {
        whereClauses.push(`
          COALESCE(
            (SELECT MAX(amount) FROM bids WHERE listing_id = l.id),
            l.starting_price
          ) <= ?
        `);
        queryParams.push(parsedMax);
      }
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    // 7. Safe allowlisted sorting
    const sortClause = SORT_MAPPINGS[sort] || 'l.closing_at ASC';
    sql += ` ORDER BY ${sortClause}`;

    const [rows] = await pool.query(sql, queryParams);

    // Format consistent JSON response
    const listings = rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      condition: row.condition,
      starting_price: Number(row.starting_price),
      minimum_bid_increment: Number(row.minimum_bid_increment),
      current_bid: Number(row.current_bid),
      bids_count: Number(row.bids_count),
      closing_at: row.closing_at,
      status: row.status,
      created_at: row.created_at,
      category_id: row.category_id,
      category_name: row.category_name,
      primary_image_url: row.primary_image_url || null,
      seller: {
        id: row.seller_id,
        name: row.seller_name,
        verification_status: row.seller_verification_status,
      },
    }));

    return res.status(200).json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error('Error in GET /api/listings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve listings from database',
      error: error.message,
    });
  }
};

/**
 * @desc    Get a single auction listing by ID with full details, images, and public bids
 * @route   GET /api/listings/:id
 * @access  Public
 */
exports.getListingById = async (req, res) => {
  try {
    const listingId = Number(req.params.id);

    // Validate that :id is a positive integer
    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format. ID must be a positive integer.',
      });
    }

    // 1. Query the main listing details with category and seller info
    const listingSql = `
      SELECT
        l.id,
        l.seller_id,
        l.category_id,
        l.title,
        l.description,
        l.condition,
        l.starting_price,
        l.minimum_bid_increment,
        l.closing_at,
        l.status,
        l.created_at,
        l.updated_at,
        c.category_name,
        u.full_name AS seller_name,
        u.email AS seller_email,
        u.student_verification_status AS seller_verification_status,
        COALESCE(
          (SELECT MAX(amount) FROM bids WHERE listing_id = l.id),
          l.starting_price
        ) AS current_bid,
        (SELECT COUNT(*) FROM bids WHERE listing_id = l.id) AS bids_count
      FROM listings l
      INNER JOIN categories c ON l.category_id = c.id
      INNER JOIN users u ON l.seller_id = u.id
      WHERE l.id = ?
      LIMIT 1
    `;

    const [listingRows] = await pool.query(listingSql, [listingId]);

    if (!listingRows || listingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Listing with ID ${listingId} not found.`,
      });
    }

    const row = listingRows[0];

    // 2. Query all associated images for this listing
    const imagesSql = `
      SELECT id, image_url, is_primary, created_at
      FROM listing_images
      WHERE listing_id = ?
      ORDER BY is_primary DESC, id ASC
    `;
    const [imageRows] = await pool.query(imagesSql, [listingId]);

    // 3. Query public bid history for this listing (anonymized/safe student name display)
    const bidsSql = `
      SELECT
        b.id,
        b.amount,
        b.created_at,
        u.id AS bidder_id,
        u.full_name AS bidder_name
      FROM bids b
      INNER JOIN users u ON b.bidder_id = u.id
      WHERE b.listing_id = ?
      ORDER BY b.amount DESC, b.created_at DESC
    `;
    const [bidRows] = await pool.query(bidsSql, [listingId]);

    const formattedBids = bidRows.map((bid, index) => ({
      id: bid.id,
      amount: Number(bid.amount),
      created_at: bid.created_at,
      bidder_id: bid.bidder_id,
      bidder_name: bid.bidder_name,
      is_winning: index === 0,
    }));

    const formattedImages = imageRows.map((img) => ({
      id: img.id,
      image_url: img.image_url,
      is_primary: Boolean(img.is_primary),
    }));

    const listing = {
      id: row.id,
      title: row.title,
      description: row.description,
      condition: row.condition,
      starting_price: Number(row.starting_price),
      minimum_bid_increment: Number(row.minimum_bid_increment),
      current_bid: Number(row.current_bid),
      bids_count: Number(row.bids_count),
      closing_at: row.closing_at,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category_id: row.category_id,
      category_name: row.category_name,
      seller: {
        id: row.seller_id,
        name: row.seller_name,
        verification_status: row.seller_verification_status,
      },
      images: formattedImages,
      bids: formattedBids,
    };

    return res.status(200).json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error(`Error in GET /api/listings/${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve listing details from database',
      error: error.message,
    });
  }
};
