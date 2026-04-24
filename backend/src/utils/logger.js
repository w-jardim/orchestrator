const getTimestamp = () => new Date().toISOString();

module.exports = {
  info: (message, data) => {
    console.log(`[${getTimestamp()}] INFO: ${message}`, data || '');
  },
  warn: (message, data) => {
    console.warn(`[${getTimestamp()}] WARN: ${message}`, data || '');
  },
  error: (message, data) => {
    console.error(`[${getTimestamp()}] ERROR: ${message}`, data || '');
  },
  debug: (message, data) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[${getTimestamp()}] DEBUG: ${message}`, data || '');
    }
  },
  operation: (message, data) => {
    console.log(`[${getTimestamp()}] OPERATION: ${message}`, data || '');
  },
};
