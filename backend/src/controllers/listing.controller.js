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

/**
 * Helper to resolve category ID from either integer ID or category name
 */
async function resolveCategoryId(categoryInput) {
  if (!categoryInput) return null;
  const num = Number(categoryInput);
  if (Number.isInteger(num) && num > 0) {
    const [rows] = await pool.query('SELECT id FROM categories WHERE id = ?', [num]);
    return rows.length > 0 ? rows[0].id : null;
  }
  const str = String(categoryInput).trim().toLowerCase();
  let [rows] = await pool.query('SELECT id FROM categories WHERE LOWER(category_name) = ?', [str]);
  if (rows.length > 0) return rows[0].id;

  // Fallback keyword matching (e.g. 'books', 'electronics', 'cycles', 'other')
  [rows] = await pool.query(
    'SELECT id FROM categories WHERE LOWER(category_name) LIKE ? LIMIT 1',
    [`%${str}%`]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * @desc    Create a new auction listing for authenticated student
 * @route   POST /api/listings
 * @access  Private
 */
exports.createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      condition,
      starting_price,
      startingBid,
      startingPrice,
      minimum_bid_increment,
      minIncrement,
      closing_at,
      closingDateTime,
      category_id,
      category,
      images,
      image_url,
      imageUrl,
    } = req.body;

    // 1. Authenticated seller strictly from token
    const sellerId = req.user.id;

    // 2. Validate Title
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Item title is required and must be at least 3 characters long.',
      });
    }
    if (trimmedTitle.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Item title must not exceed 150 characters.',
      });
    }

    // 3. Validate Description
    const trimmedDescription = (description || '').trim();
    if (!trimmedDescription || trimmedDescription.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Item description is required and must be at least 10 characters long.',
      });
    }

    // 4. Resolve & Validate Category
    const resolvedCatId = await resolveCategoryId(category_id || category);
    if (!resolvedCatId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Please select Books, Electronics, Cycles, or Other Items.',
      });
    }

    // 5. Validate Condition
    const matchedCondition = VALID_CONDITIONS.find(
      (c) => c.toLowerCase() === (condition || '').trim().toLowerCase()
    );
    if (!matchedCondition) {
      return res.status(400).json({
        success: false,
        message: `Condition must be one of: ${VALID_CONDITIONS.join(', ')}.`,
      });
    }

    // 6. Validate Starting Price
    const rawPrice = starting_price ?? startingBid ?? startingPrice;
    const parsedPrice = Number(rawPrice);
    if (rawPrice === undefined || isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Starting price must be a positive number greater than $0.',
      });
    }

    // 7. Validate Minimum Bid Increment
    const rawInc = minimum_bid_increment ?? minIncrement ?? 1.0;
    const parsedInc = Number(rawInc);
    if (isNaN(parsedInc) || parsedInc < 1.0) {
      return res.status(400).json({
        success: false,
        message: 'Minimum bid increment must be at least $1.00.',
      });
    }

    // 8. Validate Closing Date/Time
    const rawClosing = closing_at || closingDateTime;
    if (!rawClosing) {
      return res.status(400).json({
        success: false,
        message: 'Closing date and time is required.',
      });
    }

    const closingDate = new Date(rawClosing);
    if (isNaN(closingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Closing date and time is not a valid date format.',
      });
    }

    // Must close in the future (at least 2 minutes from now)
    if (closingDate.getTime() <= Date.now() + 2 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: 'Closing date and time must be at least 2 minutes in the future.',
      });
    }

    // Format for MySQL DATETIME
    const formattedClosingAt = closingDate.toISOString().slice(0, 19).replace('T', ' ');

    // 9. Insert Listing into MySQL
    const insertSql = `
      INSERT INTO listings (
        seller_id,
        category_id,
        title,
        description,
        \`condition\`,
        starting_price,
        minimum_bid_increment,
        closing_at,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    const [insertResult] = await pool.query(insertSql, [
      sellerId,
      resolvedCatId,
      trimmedTitle,
      trimmedDescription,
      matchedCondition,
      parsedPrice.toFixed(2),
      parsedInc.toFixed(2),
      formattedClosingAt,
    ]);

    const newListingId = insertResult.insertId;

    // 10. Process and insert images if provided
    const imageList = [];
    if (Array.isArray(images) && images.length > 0) {
      images.forEach((img, idx) => {
        const url = typeof img === 'string' ? img.trim() : (img?.image_url || img?.url || '').trim();
        if (url) {
          imageList.push({
            url,
            is_primary: idx === 0 || Boolean(img?.is_primary),
          });
        }
      });
    } else {
      const singleUrl = (image_url || imageUrl || '').trim();
      if (singleUrl) {
        imageList.push({ url: singleUrl, is_primary: true });
      }
    }

    for (const img of imageList) {
      await pool.query(
        'INSERT INTO listing_images (listing_id, image_url, is_primary) VALUES (?, ?, ?)',
        [newListingId, img.url, img.is_primary ? 1 : 0]
      );
    }

    // 11. Fetch created listing to return complete response
    const [createdRows] = await pool.query(
      `
      SELECT l.*, c.category_name, u.full_name AS seller_name
      FROM listings l
      INNER JOIN categories c ON l.category_id = c.id
      INNER JOIN users u ON l.seller_id = u.id
      WHERE l.id = ?
    `,
      [newListingId]
    );

    const created = createdRows[0];

    return res.status(201).json({
      success: true,
      message: 'Auction listing created successfully.',
      listing: {
        id: created.id,
        title: created.title,
        description: created.description,
        condition: created.condition,
        starting_price: Number(created.starting_price),
        minimum_bid_increment: Number(created.minimum_bid_increment),
        current_bid: Number(created.starting_price),
        bids_count: 0,
        closing_at: created.closing_at,
        status: created.status,
        category_id: created.category_id,
        category_name: created.category_name,
        created_at: created.created_at,
        seller: {
          id: req.user.id,
          name: req.user.full_name,
          verification_status: req.user.student_verification_status,
        },
        images: imageList.map((img, i) => ({
          id: i + 1,
          image_url: img.url,
          is_primary: img.is_primary,
        })),
      },
    });
  } catch (error) {
    console.error('Error in POST /api/listings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create auction listing in database.',
      error: error.message,
    });
  }
};

/**
 * @desc    Edit an eligible auction listing (Owner only)
 * @route   PUT /api/listings/:id
 * @access  Private
 */
exports.updateListing = async (req, res) => {
  try {
    const listingId = Number(req.params.id);

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format.',
      });
    }

    // 1. Fetch current listing from database
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ? LIMIT 1', [listingId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Listing with ID ${listingId} not found.`,
      });
    }

    const current = rows[0];

    // 2. Authorization: Only the owner may edit
    if (current.seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit this listing.',
      });
    }

    // 3. Eligibility: Closed, sold, or cancelled listings cannot be edited
    if (current.status === 'ended' || current.status === 'sold' || current.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit this listing because it is ${current.status}.`,
      });
    }

    if (new Date(current.closing_at).getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit an auction that has already passed its closing time.',
      });
    }

    // 4. Check if bidding has already started
    const [bidCountRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM bids WHERE listing_id = ?',
      [listingId]
    );
    const hasBids = (bidCountRows[0]?.count || 0) > 0;

    const {
      title,
      description,
      condition,
      starting_price,
      startingBid,
      startingPrice,
      minimum_bid_increment,
      minIncrement,
      closing_at,
      closingDateTime,
      category_id,
      category,
      images,
      image_url,
      imageUrl,
    } = req.body;

    // 5. Bidding restriction: If bids exist, starting_price and min_increment cannot change
    if (hasBids) {
      const attemptedPrice = starting_price ?? startingBid ?? startingPrice;
      if (attemptedPrice !== undefined && Number(attemptedPrice) !== Number(current.starting_price)) {
        return res.status(400).json({
          success: false,
          message:
            'Starting price cannot be changed because bids have already been placed by students.',
        });
      }

      const attemptedInc = minimum_bid_increment ?? minIncrement;
      if (
        attemptedInc !== undefined &&
        Number(attemptedInc) !== Number(current.minimum_bid_increment)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Minimum bid increment cannot be changed because bids have already been placed.',
        });
      }
    }

    // Build update parameters
    const updateFields = [];
    const updateParams = [];

    // Title
    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle || trimmedTitle.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Title must be at least 3 characters long.',
        });
      }
      updateFields.push('title = ?');
      updateParams.push(trimmedTitle);
    }

    // Description
    if (description !== undefined) {
      const trimmedDesc = description.trim();
      if (!trimmedDesc || trimmedDesc.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Description must be at least 10 characters long.',
        });
      }
      updateFields.push('description = ?');
      updateParams.push(trimmedDesc);
    }

    // Condition
    if (condition !== undefined) {
      const matched = VALID_CONDITIONS.find(
        (c) => c.toLowerCase() === condition.trim().toLowerCase()
      );
      if (!matched) {
        return res.status(400).json({
          success: false,
          message: `Condition must be one of: ${VALID_CONDITIONS.join(', ')}.`,
        });
      }
      updateFields.push('`condition` = ?');
      updateParams.push(matched);
    }

    // Category (only if no bids yet)
    if (!hasBids && (category_id !== undefined || category !== undefined)) {
      const resolvedCatId = await resolveCategoryId(category_id || category);
      if (!resolvedCatId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category specified.',
        });
      }
      updateFields.push('category_id = ?');
      updateParams.push(resolvedCatId);
    }

    // Starting Price & Increment (only if no bids)
    if (!hasBids) {
      const rawPrice = starting_price ?? startingBid ?? startingPrice;
      if (rawPrice !== undefined) {
        const numPrice = Number(rawPrice);
        if (isNaN(numPrice) || numPrice <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Starting price must be a positive number greater than $0.',
          });
        }
        updateFields.push('starting_price = ?');
        updateParams.push(numPrice.toFixed(2));
      }

      const rawInc = minimum_bid_increment ?? minIncrement;
      if (rawInc !== undefined) {
        const numInc = Number(rawInc);
        if (isNaN(numInc) || numInc < 1.0) {
          return res.status(400).json({
            success: false,
            message: 'Minimum bid increment must be at least $1.00.',
          });
        }
        updateFields.push('minimum_bid_increment = ?');
        updateParams.push(numInc.toFixed(2));
      }
    }

    // Closing Date/Time
    const newClosing = closing_at || closingDateTime;
    if (newClosing !== undefined) {
      const closingDate = new Date(newClosing);
      if (isNaN(closingDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid closing date and time.',
        });
      }
      if (closingDate.getTime() <= Date.now() + 60 * 1000) {
        return res.status(400).json({
          success: false,
          message: 'Closing date and time must be in the future.',
        });
      }
      updateFields.push('closing_at = ?');
      updateParams.push(closingDate.toISOString().slice(0, 19).replace('T', ' '));
    }

    if (updateFields.length > 0) {
      const updateSql = `UPDATE listings SET ${updateFields.join(', ')} WHERE id = ?`;
      updateParams.push(listingId);
      await pool.query(updateSql, updateParams);
    }

    // Update images if provided
    const newImageList = [];
    if (Array.isArray(images)) {
      images.forEach((img, idx) => {
        const url = typeof img === 'string' ? img.trim() : (img?.image_url || img?.url || '').trim();
        if (url) {
          newImageList.push({
            url,
            is_primary: idx === 0 || Boolean(img?.is_primary),
          });
        }
      });
    } else {
      const singleUrl = (image_url || imageUrl || '').trim();
      if (singleUrl) {
        newImageList.push({ url: singleUrl, is_primary: true });
      }
    }

    if (newImageList.length > 0) {
      await pool.query('DELETE FROM listing_images WHERE listing_id = ?', [listingId]);
      for (const img of newImageList) {
        await pool.query(
          'INSERT INTO listing_images (listing_id, image_url, is_primary) VALUES (?, ?, ?)',
          [listingId, img.url, img.is_primary ? 1 : 0]
        );
      }
    }

    // Fetch updated record
    const [updatedRows] = await pool.query(
      `
      SELECT l.*, c.category_name, u.full_name AS seller_name
      FROM listings l
      INNER JOIN categories c ON l.category_id = c.id
      INNER JOIN users u ON l.seller_id = u.id
      WHERE l.id = ?
    `,
      [listingId]
    );

    return res.status(200).json({
      success: true,
      message: 'Listing updated successfully.',
      listing: updatedRows[0],
    });
  } catch (error) {
    console.error(`Error in PUT /api/listings/${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update listing in database.',
      error: error.message,
    });
  }
};

/**
 * @desc    Cancel an eligible auction listing (Owner only)
 * @route   DELETE /api/listings/:id
 * @access  Private
 */
exports.cancelListing = async (req, res) => {
  try {
    const listingId = Number(req.params.id);

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format.',
      });
    }

    // 1. Fetch current listing
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ? LIMIT 1', [listingId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Listing with ID ${listingId} not found.`,
      });
    }

    const listing = rows[0];

    // 2. Authorization: Only the owner may cancel
    if (listing.seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this listing.',
      });
    }

    // 3. Status checks
    if (listing.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This listing has already been cancelled.',
      });
    }

    if (listing.status === 'sold' || listing.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an auction that is already ${listing.status}.`,
      });
    }

    // 4. Check auction closing time
    if (new Date(listing.closing_at).getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an auction that has already closed.',
      });
    }

    // 5. Check if auction is in final closing stage with bids (auction rule protection)
    const [bidCountRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM bids WHERE listing_id = ?',
      [listingId]
    );
    const bidCount = bidCountRows[0]?.count || 0;
    const timeUntilCloseMs = new Date(listing.closing_at).getTime() - Date.now();

    // If auction has bids and has less than 30 minutes left, prohibit cancellation
    if (bidCount > 0 && timeUntilCloseMs < 30 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message:
          'Auction cannot be cancelled in its final 30 minutes when active student bids have been placed.',
      });
    }

    // 6. Update status to 'cancelled' (never delete auction history)
    await pool.query("UPDATE listings SET status = 'cancelled' WHERE id = ?", [listingId]);

    return res.status(200).json({
      success: true,
      message: 'Listing has been cancelled successfully.',
      listing_id: listingId,
      status: 'cancelled',
    });
  } catch (error) {
    console.error(`Error in DELETE /api/listings/${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel listing.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all listings belonging to the authenticated student
 * @route   GET /api/listings/my-listings
 * @access  Private
 */
exports.getMyListings = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const sql = `
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
      WHERE l.seller_id = ?
      ORDER BY l.created_at DESC
    `;

    const [rows] = await pool.query(sql, [sellerId]);

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
    }));

    return res.status(200).json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error('Error in GET /api/listings/my-listings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your listings from database.',
      error: error.message,
    });
  }
};
