# Project Log

This log contains the information about the tasks I have completed during the development of the project.

## Week 1-2 [07/10/2025 - 21/10/2025]

- Started interim report
- Completed project overview
- Defined project aim and objectives
- Meeting with Supervisor, discussed about project
- Complete literature review
- Set project requirements
- Outlined project specifications and designs
- Started creating the Gantt chart
- Developed UML and class diagrams

## Week 3-4 [22/10/2025 - 05/11/2025]

- Reviewed Literature Review
- Continued Gantt Chart
- Continued working on Class diagram

## Week 5-6 [06/11/2025 - 20/11/2025]

- Meeting with supervior to get Feedback on Interim Report
- Made the changes according to the feedback
- Submitted the interim report

## Week 7-8 [21/11/2025 - 05/12/2025]

- Created website structure
- Met with supervisor and clarified eventual doubts
- Created User Model
- Created Property and Auction Model, nav bar and login/sign up forms

## Week 9-10 [06/12/2025 - 20/12/2025]

- Started creatign seller and buyer dashboard
- Created method to allow sellers to list new properties
- Created method to allow the website to automatically show seller's properties

## Week 11-12 [21/12/2025 - 03/01/2026]

-Improved seller dashboard to allow deactivate/activate listings and edit its details
-Started workign on buyer dashoard

## Week 13-14 [04/01/2026 - 18/01/2026]

-Updated Properties page by addign a timer that would allow buyers to knnow when an auction expires
-When an auction closes, buyers are not able to plcae a bid anymore

## Week 15-16 [19/01/2026 - 02/02/2026]

-Implemented listing status management using enums (ACTIVE, DEACTIVATED, ENDED)
-Added backend scheduler to automatically mark auctions as ended when expiry time is reached
-Synced backend listing status with seller dashboard UI
-Prevented sellers from modifying critical auction details once live
-Improved error handling and validation across property and auction workflows
-Performed testing and bug fixes across seller and buyer dashboards

## Week 17-18 [03/02/2026 - 17/02/2026]

- Redesigned Buyer Dashboard UI with improved card layouts, animated status badges, and responsive stat cards
- Overhauled Seller Dashboard listing form with multi-step modal styling, staggered field animations, and live validation states
- Completely rebuilt the Property Detail/Auction page with a professional two-column layout, sticky bid panel, and structured information cards
- Added a live countdown timer component to the auction page showing days, hours, minutes, and seconds until auction end
- Implemented quick-bid increment buttons (£1,000 / £5,000 / £10,000) for faster bidding
- Added real-time bid status indicator showing whether the user is currently winning or has been outbid
- Introduced a success banner notification on the auction page after a bid is placed
- Added breadcrumb navigation to the property detail page for improved user flow
- Included trust indicators (Secure Bidding, Verified Listing, Instant Updates) across auction views
- Implemented currency prefix inside bid input field for clearer monetary input
- Added silent background data refresh on the auction page to keep bid information current
- Improved responsive design across all pages with dedicated breakpoints for tablet and mobile
- Refined colour palette to a more professional neutral tone scheme across the auction interface
- Added accessibility improvements including focus-visible states and print-friendly stylesheets

## Week 19-20 [18/02/2026 - 04/03/2026]

### Buyer Dashboard

- Refined dashboard logic to correctly identify "WON" or "LOST" states by synchronizing frontend badges with backend listingStatus and highestBidder fields
- Implemented smart sorting: winning auctions appear first, outbid second, lost last across all tabs
- Split dashboard into three functional tabs: Active Bids (live auctions only), Watchlist, and History (completed auctions with won/lost cards)
- Added tab counts showing number of items per section (e.g., "Active (3)", "History (2)")
- Added fourth stat card for "Lost" auctions alongside Active, Watchlist, and Won
- Prevented highest bidder from placing additional bids shows "You are the highest bidder" message instead of bid form
- Stabilized layout with consistent sorting, preventing cards from shifting during background refreshes

### Seller Dashboard

- Split listings into two tabbed sections: Active Listings and Completed, each with appropriate columns
- Added "Current Bid" column to active listings table with colour-coded values (green if reserve met, red if below, grey if no bids)
- Added "Result" column to completed listings showing SOLD (green) or RESERVE NOT MET (red) badges
- Integrated Recharts library for data visualisation:
  - Donut chart showing listing status breakdown (Active/Ended/Deactivated)
  - Bar chart comparing highest bid vs reserve price across top 6 properties
  - Custom-styled tooltips matching the application's neutral theme
- Added Location field to property listing form with city name and UK postcode validation
- Added fourth stat card showing count of completed auctions

### Property Detail / Auction Page

- Fixed quick-bid buttons to correctly add increments to current input value or fall back to reserve price when no bids exist
- Implemented fresh data fetch before every bid submission to prevent stale-state errors between multiple concurrent buyers
- Removed duplicate "You are the highest bidder" message now shows once in the bid form area only
- Added "outbid" status indicator that only appears when user has been outbid (not when winning)
- Disabled watchlist button when auction has ended
- Removed redundant Total Bids display from bid panel

### Watchlist Feature (Full Stack)

- Created Watchlist entity and repository in the Data Tier
- Built WatchlistController in the Logic Tier with endpoints for add, remove, and check operations
- Integrated heart toggle button on Property Detail page (inline styled, no CSS changes required)
- Added dedicated Watchlist tab in Buyer Dashboard displaying all watched properties
- Resolved 404 errors caused by mismatched API endpoint paths between frontend and backend

### Cross-Application

- Unified visual identity across all pages: Login/Signup, Property Search, Navbar, and About Us page migrated to neutral theme (#1e1e2d, Inter font, #f7f7f9 backgrounds, #ebebf0 borders)
- Built static About Us page with hero section, stats bar, company story, values grid, team section, and CTA
- Fixed critical authentication bug: login was saving to sessionStorage while dashboards read from localStorage, causing all users to share the same data
- Renamed LoginSignup CSS class from `.container` to `.ls-container` to prevent global style conflicts affecting Navbar
- Implemented silent background refreshes (10-second intervals) across all dashboards, eliminating UI flicker during data synchronisation
- Optimised responsive design across all new components with dedicated mobile breakpoints

## Week 21-22 [05/02/2026 - 19/03/2026]

LANDING PAGE:

- Created LandingPage.jsx with hero, stats bar, featured properties,
  how-it-works tabs (buyer/seller), and CTA section
- Created LandingPage.css matching dashboard colour scheme (#1e1e2d, #059669)
- Smart navigation handlers check auth at click time, not render time
- Featured section pulls live auctions from /api/properties/active

ROUTING:

- Added /login route for LoginSignup component
- Landing page now serves at / (root)
- Updated App.js with public + protected route structure

AUTH STORAGE FIX (Critical):

- Unified ALL components to use sessionStorage consistently
- Fixed: LoginSignup, Navbar, ProtectedRoute, BuyerDashboard,
  SellerDashboard, PropertyDetail, PropertySearch, LandingPage
- Previously mixed localStorage/sessionStorage caused ghost sessions,
  wrong role redirects, and disappearing dashboards

BUYER DASHBOARD:

- History tab now shows ended auctions using endedBids filter
- Removed broken /api/bids/history endpoint dependency
- Won/Lost counts now work correctly using isAuctionEnded() helper
- Added endTime check to isAuctionEnded() for time-based detection
- Cards show end date and winner info for completed auctions

NAVBAR:

- Added guest state (Welcome, Guest + Login link)
- Smart logo link based on auth state
- Logout redirects to / (landing page)
- Role-based menu items (buyer sees Search/My Bids, seller sees Listings)

BACKEND FIXES:

- Auction.java: Removed duplicate @OneToMany annotation (caused Hibernate crash)
- Auction.java: Initialized @Version field to 0L (fixed NullPointerException)
- Bid.java: Added 3-argument constructor for AuctionService.placeBid()
- BidRepository: Added findAllBidsByUser() query (no time filter)
- AuctionService: Added getAllBidsByUser() method returning active + ended
- AuctionController: /users/{username}/bids now calls getAllBidsByUser()
- SQL fix: UPDATE auctions SET version = 0 WHERE version IS NULL

PROTECTED ROUTE:

- Wrong role redirects to correct dashboard (not /properties)
- No-auth redirects to / (landing page)"

**New Files:**

- `Payment.java`, `PaymentRepository.java`, `PaymentService.java`, `PaymentController.java`
- `PaymentPage.jsx`, `PaymentPage.css`
- Added `SOLD` to `ListingStatus.java` enum

**Flow:**
Buyer wins auction → Dashboard shows "Pay Deposit (10%)" → PaymentPage →
Stripe test card → Backend confirms → Property marked SOLD → Card shows "Deposit Paid"

**Key Decisions:**

- 10% deposit model (standard UK auction practice)
- Stripe Test Mode with `pk_test_` / `sk_test_` keys
- Old PENDING payments deleted on retry (fixed duplicate record crash)
- `findAllByAuctionIdAndBuyerUsername` returns List (not Optional) to handle duplicates
- Error responses always return strings to prevent React render crashes

**BuyerDashboard Card States:**

- `WON` + not paid → Shows "Pay Deposit" button
- `PAID` → Shows "Deposit Paid" with confirmation message
- `LOST` → Shows "Auction Closed — Won by {username}"

**Test Cards:** `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline)

**Bug Fixed:** `IncorrectResultSizeDataAccessException` — duplicate payment records
caused `findBy` to return 2 rows. Changed to `findAllBy` returning a List.

## Week 23-24 [20/03/2026 - 03/04/2026]

### Admin Dashboard (Full Stack)

- Created AdminDashboard.jsx with 5 tabbed sections: Overview, Users, Properties, Payments, Activity
- Created AdminDashboard.css with unified light theme matching site design system
- Overview tab displays 10 platform stat cards (users, buyers, sellers, suspended, properties, active, sold, revenue, bids, payments)
- Users tab with inline role switching (BUYER/SELLER dropdown), suspend/unsuspend toggle, and delete with confirmation
- Email masking system with per-user show/hide toggle for GDPR-conscious display
- Properties tab with status dropdown (ACTIVE/DEACTIVATED/ENDED/SOLD) and delete functionality
- Payments tab showing Stripe transaction records with deposit amounts, total prices, and truncated intent IDs
- Activity tab displaying last 50 bid events from immutable BidHistory audit trail
- Admin account protected from suspension, deletion, and role changes across all endpoints
- Toast notification system for success/error feedback on all admin actions

### Admin Backend (AdminController.java)

- Fixed ListingStatus enum comparisons (replaced string equals with direct enum comparison)
- Added cascade cleanup on user deletion: watchlist, auto-bids, pending payments, bids
- Buyer deletion reverts auctions to next highest bidder using findTopByAuctionAndBidderUsernameNotOrderByBidAmountDesc
- Seller suspension deactivates all ACTIVE listings; unsuspension restores them
- Buyer suspension deactivates all active auto-bids
- BidHistory records preserved on deletion for audit compliance

### User Suspension System

- AuthController: Suspended users blocked from logging in with 403 response
- AuthController: Added GET /api/auth/check endpoint for real-time session validation
- AuctionService: Suspended buyers blocked from placing bids
- AutoBidController: Suspended buyers blocked from setting auto-bids
- WatchlistController: Suspended buyers blocked from adding/removing (read-only access preserved)
- PropertyController: Suspended sellers blocked from creating, editing, deleting, and toggling listings
- Created useSessionGuard.js hook polling /api/auth/check every 10 seconds
- Suspended or deleted users kicked from any page within 10 seconds with alert message

### Repository Updates

- WatchlistRepository: Added deleteByUsername for cascade cleanup
- AutoBidRepository: Added deleteByUsername for cascade cleanup
- BidRepository: Added deleteByBidderUsername and findTopByAuctionAndBidderUsernameNotOrderByBidAmountDesc
- PaymentRepository: Added deleteByBuyerUsernameAndStatus for selective cleanup (keeps completed records)
- PropertyRepository: Added findBySellerUsername for suspension-based listing management

### Routing & Authentication

- Added /admin-dashboard route with ADMIN-only ProtectedRoute guard
- Updated ProtectedRoute.jsx with ADMIN redirect logic
- Updated Navbar.jsx with Admin Panel link for ADMIN role and path-based role detection
- Updated LoginSignup.jsx with role normalization (.toUpperCase) and ADMIN-first redirect logic
- Admin accounts created via SQL promotion only — no ADMIN option on signup form (security by design)

### Landing Page

- Created LandingPage.jsx with hero section, live property previews, and auth-aware navigation
- Created LandingPage.css matching site design system

### Support Ticketing & State Synchronization

- Created Ticket entity and controller for seller correction requests

- Added "Support" tab to Admin Dashboard to track and resolve tickets, triggering auto-emails via JavaMail

- Added server-side validation to reject seller edits on active properties if bids already exist (403 error)

- Automated Auction cancellation when an admin deactivates a property

- Implemented 3-second short polling in Seller Dashboard to lock the UI during live bids

- Fixed Seller Dashboard filtering to correctly move DEACTIVATED listings to the Completed tab

- Updated Completed table logic to prioritize CANCELLED status over sold logic, displaying "N/A" for final prices

## Week 25-26 [04/04/2026 - 18/04/2026]

Key Achievements & Implementation Details:

- Architectural Redesign of Proxy Bidding (Auto-Bid Bot):

- Issue Identified: Initial designs allowed users to set custom bid increments (e.g., £5k or £10k jumps). This created a critical flaw where the bot could unnecessarily waste a buyer's funds by overbidding, and caused unpredictable algorithmic behavior during bot-vs-bot bidding wars.

- Solution Implemented: Scrapped user-defined increments in favor of a server-side Dynamic Price Bracket System (Industry Standard). The system now autonomously calculates the mandatory minimum increment based on the property's current valuation (e.g., £500 jumps for <£50k; £5,000 jumps for >£500k).

- Outcome: Mathematically protects buyer wallets, standardizes the auction pacing, and simplifies the backend processing loop.

- Admin Dashboard Scalability (Pagination & Polling):

- Issue Identified: The Admin "Activity Log" was fetching the entire BidHistory table from the database every 10 seconds. This monolithic fetch would cause severe browser degradation and server overload at scale (1,000+ users).

- Solution Implemented: Engineered true server-side pagination utilizing Spring Data JPA (Page<BidHistory>, PageRequest). The React frontend now dynamically requests chunks of 20 logs at a time.

- Optimization: Introduced "Smart Polling" to the React useEffect hooks so the application only pings the backend for activity updates when the Admin is actively viewing the Activity tab.

- UI/UX Enhancements & Filtering:

- Built an interactive Search Filter within the Admin Activity tab to instantly filter paginated results by username or auctionId.

- Redesigned the Auto-Bid UI across PropertyDetail and BuyerDashboard to match professional auction house layouts, including dynamic "Minimum Next Bid" calculations.

- Resolved a frontend logic bug that physically prevented current winning bidders from increasing their maximum Auto-Bid limit.

- Cleaned up global navigation by removing redundant components (e.g., Contact Us) and deduplicated legal disclaimers in the bidding forms.

- Search Query Normalization:

- Patched a vulnerability in the PropertySearch component where case-sensitive user inputs (e.g., "London" vs "london") would fail to match database records.

- Implemented frontend normalization (trim(), toLowerCase()) before passing the payload to the Spring Boot REST API, ensuring consistent and reliable query matching.

- Fixed 'Dodged Strike' bug by adding email fallback search in PaymentExpirationService.

- Added background polling (heartbeat) to Admin Dashboard for live UI updates.

- Secured Admin Dashboard by making User Roles read-only to prevent data corruption.

- Synced Admin 'Activate' button to properly restart Auction timers.

### Fix mobile responsiveness, image scaling, and clean up test data

Frontend:

- Fixed Landing Page grid layout to ensure property cards display side-by-side (desktop) and stack correctly (mobile).
- Applied object-fit to property images to prevent stretching and awkward cropping.
- Removed hardcoded inline styles from LandingPage.jsx to allow CSS classes to manage layout.
- Added missing '.lp-card-live-dot' class for the LIVE badge on the hero image.
- Fixed Seller Dashboard pie chart getting cut off on mobile by adding '.charts-container' and stacking columns vertically on smaller screens.

Backend:

- Removed CommandLineRunner dummy user seeder from AuctionBackendApplication.java for production readiness.

Documentation:

- Finalized Introduction and Testing & Evaluation chapters for dissertation submission.

### Refactor: Move locked fields banner and update warning text

Frontend:

- Relocated the <EditBids /> component in SellerDashboard.js to sit below the property attributes row for better UX.
- Updated the warning text in EditBids.js to clarify that core property details are locked, but the description remains editable.

## Week 27-28 [19/04/2026 - 22/04/2026]

### System Stability & Concurrency Optimization

- Refactored PaymentExpirationService.java to prevent Infinite Loops during auction expiration triggered by conflicting Spring Boot @Transactional boundaries.
- Isolated the active-to-ended state transitions from the strike-and-suspension cascading logic, resolving race conditions.
- Engineered a robust SuspensionService.java to handle the complex, cascading rollback of suspended users' active bids globally without corrupting live auction states.

### Persistence Tier (Database) Refinement

- Verified N-Tier architecture with Spring Data JPA entities serving as the single source of truth for schema generation.
- Confirmed implementation of Optimistic Locking (@Version) on the Auction entity to prevent "Lost Update" anomalies during concurrent bidding events.
- Validated the use of decoupled "soft links" for the Payment and Bid_History tables to prevent heavy recursive joins and avoid table-locking bottlenecks.
- Finalized database documentation, emphasizing the security isolation of the PendingUser table.

### UI & Documentation Polish

- Fixed mobile responsiveness issues: corrected Landing Page grid layouts for mobile stacking, applied object-fit to property images.
- Removed hardcoded inline styling from LandingPage.jsx in favour of external CSS classes for maintainability.
- Added missing .lp-card-live-dot class for the LIVE badge on hero images.
- Refactored UI hierarchy in SellerDashboard.js: relocated the <EditBids /> component below the property attributes row.
- Updated warning text in EditBids.js to clarify editing restrictions (core details locked vs. description editable).
- Removed the CommandLineRunner dummy user seeder from AuctionBackendApplication.java to prepare the backend for production deployment.
- Completed final drafting of the "Design and Implementation", "Testing and Evaluation", and "Conclusion" chapters for the final dissertation submission.

## Week 29 [23/04/2026-27/04/2026]

### UI Optimization & Responsive Design

- Resolved global layout inconsistencies by standardizing flexbox wrappers (min-height: 100vh, flex: 1) to eliminate floating footers across the Payment, Admin, and Dashboard pages.
- Scaled up the Payment Page interface (increased max-width, typography, and padding) to improve screen utilization and UX on high-resolution desktop displays.
- Completely overhauled the Admin Dashboard data tables for mobile responsiveness. Implemented a CSS-driven card layout using @media queries and data-label attribute injection, transforming horizontal rows into readable vertical flex-cards on smaller viewports.

### State Management & Dashboard Logic Refinement

- Debugged and resolved a React state-rendering issue in the Seller Dashboard where overlapping filter states (activeSection) caused the DOM to unmount the property list entirely.
- Refactored the dashboard filtering logic (for both Buyer and Seller) to utilize a strict, mutually exclusive hierarchy.
- Fixed edge-case logic in the Buyer "History" tab to ensure properties where the payment timer expired are correctly filtered out of the "Won/Paid" counts and accurately isolated into their own "Expired" state.

### User Evaluation & Testing Validation

- Finalized and deployed the Usability Testing framework (Google Forms).
- Calibrated the survey questions to accurately reflect the localized prototype's technical realities (e.g., proxy bidding mechanics, 2-3 second polling latency, and email verification constraints) rather than out-of-scope features.
- Conducted supervised, in-person testing sessions to gather empirical data for Chapter 5, successfully collecting actionable feedback regarding bid status visibility and dashboard color-coding, which were subsequently implemented.
- Pushed final pre-submission codebase adjustments to the GitLab repository.

### UI #ResponsiveDesign

- Global Layout Fixes: Standardized layouts using flexbox wrappers (min-height: 100vh, flex: 1) to eliminate floating footers across the Payment, Admin, and Dashboard pages.

- Desktop Scaling: Optimized the Payment Page for high-resolution displays by increasing the max-width, typography, and padding.

- Mobile Responsiveness: Completely overhauled the Admin Dashboard tables, using CSS @media queries to transform horizontal rows into readable vertical flex-cards on smaller screens.

### StateManagement ### Logic

- Dashboard Rendering Fix: Debugged and resolved a React state issue in the Seller Dashboard where overlapping filter states were causing the property list to unmount.

- Refined Filtering: Overhauled the dashboard filtering logic for Buyers and Sellers to use a strict, mutually exclusive hierarchy.

- Edge-Case Handling: Fixed the Buyer "History" tab logic to ensure properties with expired payment timers are correctly isolated into an "Expired" state, rather than being counted as "Won/Paid."

### UserTesting ### PreSubmission

- Usability Testing: Finalized and deployed the Usability Testing framework, calibrating questions to accurately reflect the prototype's specific technical constraints (e.g., polling latency and proxy bidding).

- Actionable Feedback Implemented: Conducted supervised, in-person testing sessions and immediately implemented user feedback regarding bid status visibility and dashboard color-coding.

- Final Code Push: Completed all pre-submission adjustments and pushed the final codebase to the GitLab repository.
