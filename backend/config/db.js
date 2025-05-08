const sql = require("mssql");
const { AppError } = require("../utils/errorHandler");

/**
 * SQL Server connection pool configuration
 */
let dbConfig;

if (process.env.DB_TRUSTED_CONNECTION === "true") {
  // Windows Authentication
  dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
      encrypt: true,
      trustServerCertificate: process.env.NODE_ENV !== "production",
      trustedConnection: true, // Windows Authentication
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    // For Windows Authentication in Node.js, we need to set authentication to 'ntlm'
    authentication: {
      type: "ntlm",
      options: {
        domain: process.env.DB_DOMAIN || "",
        userName: process.env.DB_USERNAME || "",
        password: process.env.DB_PASSWORD || "",
      },
    },
  };
} else {
  // SQL Server Authentication
  dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
      encrypt: true,
      trustServerCertificate: process.env.NODE_ENV !== "production",
      requestTimeout: 30000,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

console.log("Database config (without sensitive info):", {
  server: dbConfig.server,
  database: dbConfig.database,
  authType:
    process.env.DB_TRUSTED_CONNECTION === "true"
      ? "Windows Authentication"
      : "SQL Server Authentication",
});

/**
 * SQL Server connection pool singleton
 */
const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

// Handle initial connection errors
poolConnect.catch((err) => {
  console.error("Error connecting to database. Message:", err.message);
  if (err.stack) {
    console.error(
      "Stack (first 10 lines):\n",
      err.stack.split("\n").slice(0, 10).join("\n")
    );
  }
  // console.error("Full error object for debugging (might be complex):", err); // Comment out or use selectively
  process.exit(1);
});

/**
 * Execute a query against the database
 * @param {string} query - SQL query string
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} - Query results
 */
async function executeQuery(query, params = {}) {
  try {
    await poolConnect; // Ensure pool is connected
    const request = pool.request();

    // Add parameters to request
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    console.log("Executing query:", query);
    console.log("With parameters:", JSON.stringify(params));

    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error("Database query error:", error);
    // Log more detailed error information
    if (error.originalError) {
      console.error("Original error:", error.originalError);
      console.error("Procedure:", error.procName);
      console.error("Line number:", error.lineNumber);
    }
    throw new AppError("Database operation failed", 500);
  }
}

/**
 * Begin a new transaction
 * @returns {Promise<sql.Transaction>} - Transaction object
 */
async function beginTransaction() {
  try {
    await poolConnect; // Ensure pool is connected
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    console.log("Transaction begun");
    return transaction;
  } catch (error) {
    console.error("Error beginning transaction:", error);
    throw new AppError("Failed to begin transaction", 500);
  }
}

/**
 * Execute a query within a transaction
 * @param {sql.Transaction} transaction - Transaction object
 * @param {string} query - SQL query string
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} - Query results
 */
async function executeTransactionQuery(transaction, query, params = {}) {
  try {
    const request = new sql.Request(transaction);

    // Add parameters to request
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    console.log("Executing transaction query:", query);
    console.log("With parameters:", JSON.stringify(params));

    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error("Transaction query error:", error);
    // Log more detailed error information
    if (error.originalError) {
      console.error("Original error:", error.originalError);
      console.error("Procedure:", error.procName);
      console.error("Line number:", error.lineNumber);
    }
    throw error; // Re-throw to be caught by the transaction wrapper
  }
}

/**
 * Commit a transaction
 * @param {sql.Transaction} transaction - Transaction object
 * @returns {Promise<void>}
 */
async function commitTransaction(transaction) {
  try {
    await transaction.commit();
    console.log("Transaction committed");
  } catch (error) {
    console.error("Error committing transaction:", error);
    throw new AppError("Failed to commit transaction", 500);
  }
}

/**
 * Rollback a transaction
 * @param {sql.Transaction} transaction - Transaction object
 * @returns {Promise<void>}
 */
async function rollbackTransaction(transaction) {
  try {
    await transaction.rollback();
    console.log("Transaction rolled back");
  } catch (error) {
    console.error("Error rolling back transaction:", error);
    throw new AppError("Failed to rollback transaction", 500);
  }
}

/**
 * Close the database connection pool
 * @returns {Promise<void>}
 */
async function closePool() {
  try {
    await pool.close();
    console.log("Database connection pool closed");
  } catch (error) {
    console.error("Error closing database pool:", error);
  }
}

module.exports = {
  executeQuery,
  beginTransaction,
  executeTransactionQuery,
  commitTransaction,
  rollbackTransaction,
  closePool,
  pool,
};
