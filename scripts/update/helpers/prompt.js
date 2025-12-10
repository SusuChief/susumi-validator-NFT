/**
 * @title Interactive Prompt Utility
 * @notice Safe confirmation prompts for critical operations
 */

const readline = require("readline");
const { logger, colors } = require("./logger");

/**
 * Create readline interface
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt for confirmation
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} User confirmation
 */
async function confirm(message) {
  const rl = createInterface();
  
  return new Promise((resolve) => {
    rl.question(`\n${colors.yellow}❓ ${message} (yes/no): ${colors.reset}`, (answer) => {
      rl.close();
      const confirmed = answer.toLowerCase() === "yes" || answer.toLowerCase() === "y";
      if (!confirmed) {
        logger.warn("Operation cancelled by user");
      }
      resolve(confirmed);
    });
  });
}

/**
 * Prompt for input
 * @param {string} question - Question to ask
 * @param {string} defaultValue - Default value if empty
 * @returns {Promise<string>} User input
 */
async function input(question, defaultValue = "") {
  const rl = createInterface();
  const defaultStr = defaultValue ? ` (default: ${defaultValue})` : "";
  
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}📝 ${question}${defaultStr}: ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Prompt for selection from options
 * @param {string} question - Question to ask
 * @param {Array} options - Array of {value, label} objects
 * @returns {Promise<any>} Selected value
 */
async function select(question, options) {
  const rl = createInterface();
  
  console.log(`\n${colors.cyan}📋 ${question}${colors.reset}`);
  options.forEach((opt, idx) => {
    console.log(`   ${colors.white}${idx + 1}.${colors.reset} ${opt.label}`);
  });
  
  return new Promise((resolve, reject) => {
    rl.question(`${colors.cyan}Enter number: ${colors.reset}`, (answer) => {
      rl.close();
      const idx = parseInt(answer) - 1;
      if (idx >= 0 && idx < options.length) {
        resolve(options[idx].value);
      } else {
        reject(new Error("Invalid selection"));
      }
    });
  });
}

/**
 * Show operation summary and confirm
 * @param {Object} params - Operation parameters
 * @returns {Promise<boolean>}
 */
async function confirmOperation(params) {
  logger.separator();
  console.log(`\n${colors.cyan}📋 Operation Summary:${colors.reset}`);
  
  Object.entries(params).forEach(([key, value]) => {
    logger.data(key, value);
  });
  
  logger.separator();
  
  return confirm("Proceed with this operation?");
}

/**
 * Dangerous operation confirmation (requires typing "CONFIRM")
 * @param {string} message - Warning message
 * @returns {Promise<boolean>}
 */
async function dangerousConfirm(message) {
  const rl = createInterface();
  
  console.log(`\n${colors.red}${colors.bright}⚠️  DANGEROUS OPERATION ⚠️${colors.reset}`);
  console.log(`\n${message}`);
  
  return new Promise((resolve) => {
    rl.question(`\n${colors.red}🔴 Type "CONFIRM" to proceed: ${colors.reset}`, (answer) => {
      rl.close();
      const confirmed = answer === "CONFIRM";
      if (!confirmed) {
        logger.warn("Operation cancelled - confirmation text did not match");
      }
      resolve(confirmed);
    });
  });
}

module.exports = {
  confirm,
  input,
  select,
  confirmOperation,
  dangerousConfirm,
};
