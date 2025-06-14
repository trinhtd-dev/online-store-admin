# ElectroTech Admin - Electronic Store Management System

## Introduction

ElectroTech Admin is a comprehensive management system for electronic stores, developed with the goal of optimizing business processes, enhancing customer experience, and supporting data-driven decision making. The system includes both an admin interface and an end-user interface, efficiently managing products, orders, customers, and many other functions.

## Key Features

### Product Management

- Create, update, and delete product information and variants
- Manage attributes and attribute values for product variants
- Update stock and sales quantities

### Category Management

- Organize products by categories
- Add, edit, and delete categories

### Customer Management

- View and manage customer information
- Track purchase history

### Order Management

- Process customer orders
- Track order status
- Handle cancellation requests and returns

### Payment Processing

- Support multiple payment methods
- Track payment status

### Review Management

- Monitor and respond to customer reviews
- Analyze feedback to improve service quality

### User Role Management

- Manage roles and permissions
- Specific permission assignments by role (Admin, Manager, Staff)

### Reports and Analytics

- Aggregate sales data
- Analyze market trends
- Revenue reporting

## Technologies Used

### Frontend

- **React**: Building user interfaces
- **TypeScript**: Ensuring code robustness and safety
- **Ant Design**: UI component library
- **React Router**: Navigation management
- **Axios**: API communication
- **Styled Components**: Custom styling

### Backend

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web framework
- **SQL Server**: Database management system
- **JWT**: User authentication
- **bcryptjs**: Password encryption
- **Redis**: Data caching

## System Requirements

- Node.js (v16 or higher)
- SQL Server
- Redis (optional, for performance enhancement)

## Installation and Setup

### Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
# Create .env file based on .env.example template

# Initialize database
# Run SQL scripts in create_table.sql and create_indexes.sql

# Run in development mode
npm run dev

# Run in production mode
npm start
```

### Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build
```

## Project Structure

```
online-store-admin/
├── backend/            # API and backend logic
│   ├── config/         # Configuration (database, constants)
│   ├── controllers/    # Business logic handlers
│   ├── middlewares/    # Express middlewares
│   ├── routes/         # Route definitions
│   ├── services/       # Business services
│   ├── sql/            # SQL queries
│   ├── utils/          # Utilities
│   ├── validators/     # Input validation
│   └── server.js       # Application entry point
│
├── frontend/           # User interface
│   ├── public/         # Static resources
│   └── src/            # React source code
│       ├── api/        # API communication
│       ├── components/ # Reusable components
│       ├── context/    # React Context
│       ├── pages/      # Main pages
│       ├── routes/     # Route configuration
│       ├── services/   # Services
│       └── styles/     # CSS & styles
│
├── create_table.sql    # Table creation script
├── create_indexes.sql  # Index creation script
└── package.json        # Root npm configuration
```
