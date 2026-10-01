Here is the fully cleaned and formatted version of your README. I have fixed the MySQL dump filename to `database_dump.sql` and removed all the strange formatting tags (like `bash id="f6bgc7"`) that appeared when you copied it.

You can copy the block below exactly as it is and paste it into your `README.md` file:

````markdown
# Property Auction Platform with Automated Proxy Bidding

## Information about this Repository

This repository contains a full-stack property auction platform designed to automate the auction lifecycle for real estate transactions. Key technical highlights include a RICS-compliant proxy bidding engine, automated auction state transitions via backend scheduling, Stripe payment integration, and a concurrency-hardened persistence layer to ensure financial integrity during high-velocity bidding.

The project was developed individually as part of the final-year undergraduate dissertation for CO3204 Software Engineering Project.

---

## Main Software Artefacts

### Backend

**Location:** `/auction-backend`

**Technology Stack:**

- Spring Boot
- Maven
- Java 17
- Spring Security
- JPA / Hibernate
- MySQL
- Stripe API Integration

**The backend manages:**

- Authentication and role-based access control
- Property listings and auction lifecycle
- Proxy bidding engine
- Payment enforcement and strike system
- Scheduled automation
- Admin controls and suspension logic

### Frontend

**Location:** `/auction-frontend`

**Technology Stack:**

- React.js
- JavaScript
- Tailwind CSS
- Axios
- React Router
- Stripe.js
- Recharts

**The frontend provides:**

- Buyer, seller, and admin dashboards
- Live bidding interfaces
- Payment processing
- Analytics dashboards
- Accessibility-focused UI design

### Database

**Location:** `/database`

**Technology Stack:**

- MySQL 8+

**Includes:**

- Full SQL database dump (`database_dump.sql`)
- Schema creation
- Seeded demo accounts
- Sample property listings
- Bidding history and auction test data

---

## System Requirements

**Supported Operating Systems:**

- Windows 10 / 11
- macOS (Intel or Apple Silicon)
- Linux (Ubuntu 20.04+ recommended)

**Required Software:**

- Java JDK 17+
- Node.js v16+ (includes npm)
- MySQL 8+
- Maven

**External Services:**

- Stripe (configured in test mode)

---

## Installation and Setup

### 1. Database Setup

First, open your MySQL terminal (or Workbench) and create the database:

```sql
CREATE DATABASE property_auction;
USE property_auction;
```
````

Next, exit the MySQL terminal and run the following command from the project root to import the provided SQL dump:

```bash
mysql -u root -p property_auction < database/database_dump.sql
```

### 2. application.properties Configuration

Before running the backend, open `auction-backend/src/main/resources/application.properties`.

Update the following if required:

- MySQL username and password to match your local setup
- Gmail SMTP credentials if email verification functionality is required

Example:

```properties
spring.datasource.username=root
spring.datasource.password=YOUR_DATABASE_PASSWORD
spring.mail.username=YOUR_EMAIL@gmail.com
spring.mail.password=YOUR_APP_PASSWORD
```

_Note: Stripe is already configured in test mode for dissertation evaluation and does not require additional setup._

### 3. Backend Setup

Navigate to the backend directory, install dependencies, and run the server:

```bash
cd auction-backend
mvn clean install
mvn spring-boot:run
```

### Alternative: Running via IDE (Recommended)

If you prefer using an IDE or encounter local JDK/Lombok version mismatches when running Maven via the terminal, you can run the backend directly through IntelliJ IDEA:

1. Open IntelliJ IDEA and select **File > Open**, then choose the `auction-backend` folder.
2. Wait a moment for IntelliJ to index the Maven dependencies.
3. Navigate to `src/main/java/com/ps515/auctionbackend/AuctionBackendApplication.java`.
4. Click the green **Run** arrow next to the class name.

_The backend server will start on `http://localhost:8080`_

### 4. Frontend Setup

Open a new terminal, navigate to the frontend directory, install dependencies, and start the app:

```bash
cd auction-frontend
npm install
npm start
```

_The frontend will start on `http://localhost:3000`_

---

## Demo User Credentials

The following pre-configured accounts are seeded in the database and are intended for demonstration and evaluation purposes only.

### Administrator

- **Username:** `admin`
- **Password:** `12345678`

### Sellers

- **Username:** `seller1` | **Password:** `seller1`
- **Username:** `seller2` | **Password:** `seller2`
- **Username:** `seller3` | **Password:** `seller3`

### Buyers

- **Username:** `buyer1` | **Password:** `buyer1`
- **Username:** `buyer2` | **Password:** `buyer2`
- **Username:** `buyer3` | **Password:** `12345678`

---

## Stripe Test Payment Details

Use the following Stripe test card for payment testing. _Only Stripe test mode is enabled. No live payments are processed._

- **Card Number:** `4242 4242 4242 4242`
- **Expiry Date:** Any future date
- **CVC:** Any 3 digits
- **Postcode:** Any postcode

---

## Demo and Evaluation Mode (Important)

To facilitate rapid marking and viva demonstration, the platform includes a fast testing mode.

### Rapid Lifecycle Testing

When listing a property through the Seller Dashboard, select **1 Minute Duration**. This allows the full auction lifecycle to be demonstrated quickly.

### State Transitions

The backend scheduler polls every 5 seconds. Within approximately 1 minute, the property automatically transitions through:
`ACTIVE` → `ENDED` → `SOLD` (or `FAILED PAYMENT`).

### Automatic Payment Trigger

When the auction ends, the winning bidder automatically receives a payment request for the required 10% holding deposit via Stripe.

### Temporal Priority Testing

To test proxy bidding fairness, use two buyer accounts to place identical maximum bids. The system prioritises the **first bid placed**, demonstrating timestamp-based tie-breaking.

---

## Core Engineering Features

### RICS-Aligned Bid Increments

Bid increments are dynamically calculated based on UK property auction price bands rather than fixed static increases. This prevents unrealistic bidding behaviour and aligns with real-world auction practices.

### Proxy Bidding Engine

Users define maximum bid ceilings. The system automatically bids only when necessary, preventing unnecessary price inflation and improving fairness.

### Concurrency Safeguards

The system uses JPA Optimistic Locking (`@Version`), composite unique constraints, and transactional protection. This prevents race conditions during simultaneous bids and payment events.

### Admin Governance

Administrators can suspend users, manage failed payments, monitor analytics, enforce strike penalties, and protect platform integrity. Suspended users are automatically prevented from bidding and listing properties.

---

## Additional Files

- **PROJECTLOG.md:** Contains project development history, milestones, and implementation progress.
- **FAQ.md:** Contains troubleshooting guidance and setup support.

---

## Final Notes

This project was developed for the CO3204 Software Engineering Project dissertation. The system focuses on transparency, accountability, accessibility, and financial integrity in online property auctions while remaining realistic within undergraduate project scope.

```

```
