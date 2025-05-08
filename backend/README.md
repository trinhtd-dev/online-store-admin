# Online Store Backend API

A Node.js backend API for an e-commerce application using Express.js and SQL Server.

## Features

- User authentication with JWT (JSON Web Tokens)
- Role-based access control (User, Admin)
- Product management
- Order processing
- User management
- RESTful API design

## Tech Stack

- Node.js
- Express.js
- SQL Server (MSSQL)
- JWT for authentication
- bcrypt for password hashing

## Prerequisites

Before you begin, make sure you have:

- Node.js (v14 or newer)
- SQL Server instance
- SQL Server Management Studio (SSMS) or Azure Data Studio

## Database Setup

1. Create a new database in SQL Server:

```sql
CREATE DATABASE onlinestore;
GO
```

2. Create the necessary tables:

```sql
USE onlinestore;
GO

-- Users table
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  email NVARCHAR(100) UNIQUE NOT NULL,
  password NVARCHAR(255) NOT NULL,
  role NVARCHAR(20) DEFAULT 'user',
  createdAt DATETIME DEFAULT GETDATE(),
  updatedAt DATETIME DEFAULT GETDATE()
);

-- Products table
CREATE TABLE products (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  price DECIMAL(10,2) NOT NULL,
  category NVARCHAR(100),
  countInStock INT DEFAULT 0,
  imageUrl NVARCHAR(255),
  userId INT FOREIGN KEY REFERENCES users(id),
  createdAt DATETIME DEFAULT GETDATE(),
  updatedAt DATETIME DEFAULT GETDATE()
);

-- Orders table
CREATE TABLE orders (
  id INT IDENTITY(1,1) PRIMARY KEY,
  userId INT FOREIGN KEY REFERENCES users(id),
  shippingAddress NVARCHAR(MAX) NOT NULL,
  paymentMethod NVARCHAR(100) NOT NULL,
  paymentResult NVARCHAR(MAX),
  itemsPrice DECIMAL(10,2) NOT NULL,
  taxPrice DECIMAL(10,2) DEFAULT 0,
  shippingPrice DECIMAL(10,2) DEFAULT 0,
  totalPrice DECIMAL(10,2) NOT NULL,
  isPaid BIT DEFAULT 0,
  paidAt DATETIME,
  isDelivered BIT DEFAULT 0,
  deliveredAt DATETIME,
  status NVARCHAR(50) DEFAULT 'Pending',
  createdAt DATETIME DEFAULT GETDATE(),
  updatedAt DATETIME DEFAULT GETDATE()
);

-- Order Items table
CREATE TABLE orderItems (
  id INT IDENTITY(1,1) PRIMARY KEY,
  orderId INT FOREIGN KEY REFERENCES orders(id),
  productId INT FOREIGN KEY REFERENCES products(id),
  name NVARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  imageUrl NVARCHAR(255),
  createdAt DATETIME DEFAULT GETDATE()
);
```

3. Create a default admin user:

```sql
INSERT INTO users (name, email, password, role)
VALUES ('Admin User', 'admin@example.com', '$2a$10$X9mxLukfR9rD5LkXZ1.DOOyeRPFlP3WkSYpVMxkXmYH3ZQQsLZKMC', 'admin');
-- Password is 'password123'
```

## Installation

1. Clone the repository
2. Navigate to the backend directory:

```bash
cd backend
```

3. Install dependencies:

```bash
npm install
```

4. Copy the environment variables example file and update it with your own values:

```bash
cp .env.example .env
```

5. Update the `.env` file with your database credentials and JWT secret.

## Running the Server

For development:

```bash
npm run dev
```

For production:

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user & get token
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile

### Products

- `GET /api/products` - Get all products (with pagination)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create a product (Admin only)
- `PUT /api/products/:id` - Update a product (Admin only)
- `DELETE /api/products/:id` - Delete a product (Admin only)

### Orders

- `POST /api/orders` - Create a new order
- `GET /api/orders` - Get all orders (Admin) or user orders
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/pay` - Update order to paid
- `PUT /api/orders/:id/deliver` - Update order to delivered (Admin only)
- `PUT /api/orders/:id/cancel` - Cancel an order

### Users

- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `PUT /api/users/profile/update` - Update user profile

## License

MIT
