/**
 * 工具函数模块
 * 包含各种通用的辅助函数
 */

/**
 * 格式化价格显示
 * @param {number} price - 价格
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的价格字符串
 */
function formatPrice(price, decimals = 4) {
  if (typeof price !== 'number' || isNaN(price)) {
    return '0.0000';
  }
  return price.toFixed(decimals);
}

/**
 * 格式化百分比显示
 * @param {number} percent - 百分比
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的百分比字符串
 */
function formatPercent(percent, decimals = 2) {
  if (typeof percent !== 'number' || isNaN(percent)) {
    return '0.00%';
  }
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(decimals)}%`;
}

/**
 * 格式化时间显示
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return new Date().toLocaleString();
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 延迟执行函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} Promise对象
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全的JSON解析
 * @param {string} jsonString - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 */
function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON解析失败:', error.message);
    return defaultValue;
  }
}

/**
 * 验证币种符号格式
 * @param {string} symbol - 币种符号
 * @returns {boolean} 是否为有效格式
 */
function isValidSymbol(symbol) {
  if (typeof symbol !== 'string') {
    return false;
  }
  // 检查是否为 XXXUSDT 格式
  return /^[A-Z]{2,10}USDT$/.test(symbol);
}

/**
 * 计算价格变化百分比
 * @param {number} currentPrice - 当前价格
 * @param {number} previousPrice - 之前价格
 * @returns {number} 变化百分比
 */
function calculatePriceChangePercent(currentPrice, previousPrice) {
  if (typeof currentPrice !== 'number' || typeof previousPrice !== 'number' || 
      isNaN(currentPrice) || isNaN(previousPrice) || previousPrice === 0) {
    return 0;
  }
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

/**
 * 限制数值在指定范围内
 * @param {number} value - 输入值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的值
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID字符串
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 深度克隆对象
 * @param {*} obj - 要克隆的对象
 * @returns {*} 克隆后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 重试函数
 * @param {Function} fn - 要重试的异步函数
 * @param {number} retries - 重试次数
 * @param {number} delay - 重试间隔（毫秒）
 * @returns {Promise} Promise对象
 */
async function retry(fn, retries = 3, delayMs = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.log(`重试中... 剩余次数: ${retries}`);
      await delay(delayMs);
      return retry(fn, retries - 1, delayMs);
    }
    throw error;
  }
}

module.exports = {
  formatPrice,
  formatPercent,
  formatTime,
  delay,
  safeJsonParse,
  isValidSymbol,
  calculatePriceChangePercent,
  clamp,
  generateId,
  deepClone,
  debounce,
  throttle,
  retry
};