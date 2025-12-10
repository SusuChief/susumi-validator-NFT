/**
 * @title Logger Utility
 * @notice Professional logging with Winston - file & console output
 * @dev Provides structured logging with timestamps, levels, and file persistence
 */

const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists inside scripts/update
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  magenta: "\x1b[35m",
};

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
    tx: 4,
    data: 5,
    debug: 6,
  },
  colors: {
    error: "red",
    warn: "yellow",
    success: "green",
    info: "blue",
    tx: "magenta",
    data: "gray",
    debug: "cyan",
  },
};

// Custom format for console output with colors
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  const levelColors = {
    error: colors.red,
    warn: colors.yellow,
    success: colors.green,
    info: colors.blue,
    tx: colors.magenta,
    data: colors.gray,
    debug: colors.cyan,
  };

  const levelIcons = {
    error: "❌",
    warn: "⚠️ ",
    success: "✅",
    info: "ℹ️ ",
    tx: "📝",
    data: "  ",
    debug: "🔍",
  };

  const color = levelColors[level] || colors.white;
  const icon = levelIcons[level] || "";
  
  let output = `${color}${icon} ${message}${colors.reset}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0 && metadata.label) {
    output = `${colors.gray}   ${metadata.label}: ${colors.reset}${metadata.value}`;
  }
  
  return output;
});

// Custom format for file output (JSON structured)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || "debug",
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for errors only
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for transactions
    new winston.transports.File({
      filename: path.join(logsDir, "transactions.log"),
      level: "tx",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// Add colors to Winston
winston.addColors(customLevels.colors);

/**
 * Logger wrapper with convenient methods
 */
const logger = {
  /**
   * Get Winston instance for advanced usage
   */
  winston: winstonLogger,

  /**
   * Log section header
   * @param {string} message - Header message
   */
  header: (message) => {
    const line = "═".repeat(60);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    console.log(`${colors.bright}${colors.white}🔷 ${message}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}`);
    winstonLogger.info(message, { type: "header" });
  },

  /**
   * Log success message
   * @param {string} message - Success message
   */
  success: (message) => {
    winstonLogger.log("success", message);
  },

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Error} [error] - Optional error object
   */
  error: (message, error = null) => {
    winstonLogger.error(message, { error: error?.stack || error });
  },

  /**
   * Log warning message
   * @param {string} message - Warning message
   */
  warn: (message) => {
    winstonLogger.warn(message);
  },

  /**
   * Log info message
   * @param {string} message - Info message
   */
  info: (message) => {
    winstonLogger.info(message);
  },

  /**
   * Log debug message
   * @param {string} message - Debug message
   */
  debug: (message) => {
    winstonLogger.debug(message);
  },

  /**
   * Log step in process
   * @param {number} number - Step number
   * @param {string} message - Step description
   */
  step: (number, message) => {
    const stepMsg = `[Step ${number}] ${message}`;
    console.log(`\n${colors.cyan}${stepMsg}${colors.reset}`);
    winstonLogger.info(stepMsg, { type: "step", stepNumber: number });
  },

  /**
   * Log data/details
   * @param {string} label - Data label
   * @param {any} value - Data value
   */
  data: (label, value) => {
    console.log(`${colors.gray}   ${label}: ${colors.reset}${value}`);
    winstonLogger.log("data", `${label}: ${value}`, { label, value });
  },

  /**
   * Log transaction details
   * @param {string} hash - Transaction hash
   * @param {string} description - Transaction description
   * @param {Object} [metadata] - Additional transaction data
   */
  tx: (hash, description, metadata = {}) => {
    console.log(`${colors.magenta}📝 TX [${description}]: ${colors.reset}${hash}`);
    winstonLogger.log("tx", `${description}: ${hash}`, {
      type: "transaction",
      hash,
      description,
      ...metadata,
    });
  },

  /**
   * Log network info
   * @param {string} name - Network name
   * @param {string} chainId - Chain ID
   */
  network: (name, chainId) => {
    const msg = `Network: ${name} (Chain ID: ${chainId})`;
    console.log(`${colors.cyan}🌐 ${msg}${colors.reset}`);
    winstonLogger.info(msg, { type: "network", network: name, chainId });
  },

  /**
   * Log gas usage
   * @param {string} used - Gas used
   * @param {string} price - Gas price
   */
  gas: (used, price) => {
    const msg = `Gas Used: ${used} | Gas Price: ${price}`;
    console.log(`${colors.gray}⛽ ${msg}${colors.reset}`);
    winstonLogger.info(msg, { type: "gas", gasUsed: used, gasPrice: price });
  },

  /**
   * Separator line
   */
  separator: () => {
    console.log(`${colors.gray}${"-".repeat(50)}${colors.reset}`);
  },

  /**
   * Log current state vs new state
   * @param {string} label - Property label
   * @param {any} current - Current value
   * @param {any} newValue - New value
   */
  stateChange: (label, current, newValue) => {
    console.log(`${colors.gray}   ${label}:${colors.reset}`);
    console.log(`${colors.gray}     Current: ${colors.reset}${current}`);
    console.log(`${colors.green}     New:     ${newValue}${colors.reset}`);
    winstonLogger.info(`State change: ${label}`, {
      type: "stateChange",
      property: label,
      oldValue: current,
      newValue: newValue,
    });
  },

  /**
   * Log contract operation
   * @param {string} contract - Contract name
   * @param {string} method - Method name
   * @param {Object} params - Method parameters
   */
  contractCall: (contract, method, params = {}) => {
    winstonLogger.info(`Contract call: ${contract}.${method}`, {
      type: "contractCall",
      contract,
      method,
      params,
    });
  },

  /**
   * Log table of data
   * @param {Array|Object} data - Data to display
   */
  table: (data) => {
    console.table(data);
    winstonLogger.debug("Table data", { data });
  },

  /**
   * Log raw message without formatting
   * @param {string} message - Raw message
   */
  raw: (message) => {
    console.log(message);
  },

  /**
   * Start a timer for performance measurement
   * @param {string} label - Timer label
   * @returns {Function} Stop function that logs duration
   */
  startTimer: (label) => {
    const start = Date.now();
    winstonLogger.debug(`Timer started: ${label}`, { type: "timer", label, action: "start" });
    
    return () => {
      const duration = Date.now() - start;
      const msg = `${label} completed in ${duration}ms`;
      console.log(`${colors.gray}⏱️  ${msg}${colors.reset}`);
      winstonLogger.debug(msg, { type: "timer", label, action: "end", duration });
      return duration;
    };
  },

  /**
   * Log operation summary
   * @param {Object} summary - Summary object
   */
  summary: (summary) => {
    console.log(`\n${colors.cyan}📊 Operation Summary:${colors.reset}`);
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`${colors.gray}   ${key}: ${colors.reset}${value}`);
    });
    winstonLogger.info("Operation summary", { type: "summary", ...summary });
  },

  /**
   * Create a child logger with additional context
   * @param {Object} context - Context to add to all logs
   * @returns {Object} Child logger
   */
  child: (context) => {
    return winstonLogger.child(context);
  },

  /**
   * Log session start (useful for tracking script runs)
   * @param {string} scriptName - Name of the script
   * @param {Object} params - Script parameters
   */
  sessionStart: (scriptName, params = {}) => {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    winstonLogger.info(`Session started: ${scriptName}`, {
      type: "session",
      action: "start",
      sessionId,
      scriptName,
      params,
      timestamp: new Date().toISOString(),
    });
    return sessionId;
  },

  /**
   * Log session end
   * @param {string} sessionId - Session ID from sessionStart
   * @param {string} status - 'success' or 'failed'
   * @param {Object} result - Result data
   */
  sessionEnd: (sessionId, status, result = {}) => {
    winstonLogger.info(`Session ended: ${status}`, {
      type: "session",
      action: "end",
      sessionId,
      status,
      result,
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = { logger, colors, winstonLogger };
