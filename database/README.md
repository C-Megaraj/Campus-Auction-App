# Campus Auction App — Database Documentation

This directory contains the relational database design for the **Campus Auction Marketplace**, engineered for **MySQL 8.0+** (also compatible with MariaDB 10.5+).

---

## 📁 File Structure & Execution Order

Always run the SQL files in the following exact sequence:

| Step | File | Purpose |
| :--- | :--- | :--- |
| **1** | [`schema.sql`](./schema.sql) | Creates the database `campus_auction`, defines all 7 relational tables, primary keys, foreign key constraints, indexes, and data validation rules. |
| **2** | [`seed.sql`](./seed.sql) | Populates the tables with fictional sample data (categories, student users, active/ended listings, photos, public bids, watchlist items, and auction results). |

---

## 🛠️ How to Set Up the Local Database

> **Note:** Replace `<your_mysql_user>` (commonly `root`) with your local MySQL username. Never hardcode credentials into version control.

### Option A: Using the MySQL Command Line Interface (CLI)

1. Open your terminal or command prompt.
2. Log into your MySQL server:
   ```bash
   mysql -u <your_mysql_user> -p
   ```
   *(Enter your MySQL password when prompted).*

3. Run the schema creation script:
   ```sql
   SOURCE C:/HAckathon/Campus-Auction-App/database/schema.sql;
   ```
   *(Or on Linux/macOS: `SOURCE /path/to/Campus-Auction-App/database/schema.sql;`)*

4. Run the seed data script:
   ```sql
   SOURCE C:/HAckathon/Campus-Auction-App/database/seed.sql;
   ```

5. Verify table creation:
   ```sql
   USE campus_auction;
   SHOW TABLES;
   ```

Alternatively, you can run both files in one line from your command line:
```bash
mysql -u <your_mysql_user> -p < database/schema.sql
mysql -u <your_mysql_user> -p campus_auction < database/seed.sql
```

---

### Option B: Using MySQL Workbench

1. Launch **MySQL Workbench** and open your local connection (e.g., `Local instance MySQL80`).
2. Go to **File** → **Open SQL Script...** and select `database/schema.sql`.
3. Click the **Execute** button (the yellow lightning bolt ⚡ icon) to run the script.
4. Go to **File** → **Open SQL Script...** and select `database/seed.sql`.
5. Click **Execute** ⚡ to populate the sample data.
6. In the left **Schemas** panel, right-click and choose **Refresh All**. You will see `campus_auction` with all 7 tables populated.

---

## 📊 Beginner-Friendly Explanation of Database Tables

Here is what each table does in plain English:

### 1. `users`
- **Purpose:** Stores the student profiles who participate in the marketplace as sellers or bidders.
- **Key Columns:**
  - `id`: Unique numeric ID for each student.
  - `full_name`: The student's display name.
  - `email`: University email address (`UNIQUE` ensures no student can register twice with the same email).
  - `password_hash`: Securely hashed password (e.g., bcrypt); plaintext passwords are never stored.
  - `student_verification_status`: Indicates whether the student's campus email has been authenticated (`unverified`, `pending`, `verified`).

### 2. `categories`
- **Purpose:** Organizes items into standardized categories so students can filter listings easily.
- **Key Columns:**
  - `id`: Unique category number.
  - `category_name`: Pre-populated with the 4 marketplace categories: `Books`, `Electronics`, `Cycles`, and `Other Items`.

### 3. `listings`
- **Purpose:** The core table representing every item put up for auction by a student seller.
- **Key Columns:**
  - `id`: Unique listing ID.
  - `seller_id`: Links back to `users.id` (who posted the item).
  - `category_id`: Links back to `categories.id` (what type of item it is).
  - `title` & `description`: Item title and detailed notes.
  - `condition`: Item quality (`New`, `Like New`, `Good`, or `Fair`).
  - `starting_price`: The opening price (must be greater than $0.00 using exact `DECIMAL(10, 2)`).
  - `minimum_bid_increment`: Minimum dollar amount each new bid must exceed the current bid (defaults to `$1.00`).
  - `closing_at`: The exact timestamp when the auction timer ends.
  - `status`: Current state of the auction (`active`, `closing_soon`, `ended`, `sold`, or `cancelled`).

### 4. `listing_images`
- **Purpose:** Stores URLs or file paths for photos associated with each listing.
- **Key Columns:**
  - `id`: Unique image ID.
  - `listing_id`: Links back to `listings.id`. If a listing is deleted, all its images are automatically cleaned up (`ON DELETE CASCADE`).
  - `image_url`: File path or asset link.
  - `is_primary`: Boolean flag indicating if this image is the main card thumbnail.

### 5. `bids`
- **Purpose:** Records every public bid placed on an auction by a student.
- **Key Columns:**
  - `id`: Unique bid ID.
  - `listing_id`: Links back to the listing being bid on.
  - `bidder_id`: Links back to `users.id` (who placed the bid).
  - `amount`: Exact monetary amount bid (`DECIMAL(10, 2)`).
  - `created_at`: The exact time the bid occurred (powers transparent public bid histories).

### 6. `watchlist`
- **Purpose:** Stores the auctions that students bookmark or save to monitor later.
- **Key Columns:**
  - `user_id`: Links back to the student bookmarking the item.
  - `listing_id`: Links back to the saved listing.
  - `created_at`: When the item was bookmarked.
  - **Duplicate Prevention:** Has a composite primary key `PRIMARY KEY (user_id, listing_id)`. This makes it physically impossible in the database for the same student to save the same listing more than once.

### 7. `auction_results`
- **Purpose:** Records the resolution when an auction concludes, identifying the winning bid and on-campus meetup status.
- **Key Columns:**
  - `id`: Unique result ID.
  - `listing_id`: Unique link to the completed listing.
  - `winning_bid_id`: Links to the winning bid in the `bids` table.
  - `seller_decision`: Tracks seller acceptance (`pending`, `accepted`, `rejected`, `expired`).
  - `handover_status`: Tracks safe public meetup status (`pending`, `scheduled`, `completed`, `cancelled`).
  - `completed_at`: Timestamp when the item was successfully exchanged in person.

---

## 🔒 Referential Integrity & Design Principles

1. **Exact Monetary Storage:** All financial numbers (`starting_price`, `minimum_bid_increment`, `amount`) strictly use `DECIMAL(10, 2)` rather than `FLOAT` or `DOUBLE` to avoid binary floating-point rounding errors.
2. **Foreign Key Integrity:** Child records reference their parent tables with appropriate rules (`ON DELETE CASCADE` for images and bids, and `ON DELETE RESTRICT` for sellers to prevent orphaned active listings).
3. **Data Constraints (`CHECK`):** Ensures positive starting prices (`starting_price > 0.00`), increments of at least `$1.00`, and positive bid amounts (`amount > 0.00`).
4. **Performance Indexes:** Optimized with composite indexes on `(listing_id, amount DESC)` for high-speed retrieval of highest bids, and `(status, category_id, closing_at)` for high-volume marketplace search and category filtering.
5. **Privacy & Security:** The seed script uses fictional student names and dummy bcrypt hashes. No real student records or credentials are used.

