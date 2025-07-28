/**
 * 价格监控服务类
 * 负责价格数据处理和阈值检查
 */

const config = require('../config');
const NotificationService = require('./NotificationService');

class PriceMonitorService {
  constructor() {
    this.cryptoData = new Map();
    this.priceThresholds = { ...config.symbols.thresholds };
    this.notificationService = new NotificationService();
  }

  /**
   * 更新加密货币数据并检查价格阈值
   * @param {string} symbol - 币种符号
   * @param {Object} data - 价格数据
   */
  updateCryptoData(symbol, data) {
    // 存储历史数据用于比较
    const previousData = this.cryptoData.get(symbol);
    this.cryptoData.set(symbol, data);

    // 检查价格阈值
    this._checkPriceThresholds(symbol, data, previousData);

    // 记录价格变化
    this._logPriceChange(symbol, data, previousData);
  }

  /**
   * 检查价格是否突破阈值
   * @param {string} symbol - 币种符号
   * @param {Object} data - 当前价格数据
   * @param {Object} previousData - 之前的价格数据
   */
  _checkPriceThresholds(symbol, data, previousData) {
    const thresholds = this.priceThresholds[symbol];
    if (!thresholds) {
      console.warn(`⚠️ 未找到 ${symbol} 的价格阈值配置`);
      return;
    }

    const { price } = data;
    const { min, max } = thresholds;

    // 检查是否超过最大价格
    if (price > max) {
      this._handlePriceExceeded(symbol, data, 'max', max);
    }
    // 检查是否低于最小价格
    else if (price < min) {
      this._handlePriceExceeded(symbol, data, 'min', min);
    }
  }

  /**
   * 处理价格突破阈值的情况
   * @param {string} symbol - 币种符号
   * @param {Object} data - 价格数据
   * @param {string} type - 突破类型 ('max' | 'min')
   * @param {number} threshold - 突破的阈值
   */
  _handlePriceExceeded(symbol, data, type, threshold) {
    const { price } = data;
    
    // 更新阈值
    this._updateThresholds(symbol, price);
    
    // 生成预警消息
    const message = this._generateAlertMessage(symbol, data, type, threshold);
    
    // 发送预警
    const alertKey = `${symbol}_${type}_price_exceeded`;
    this.notificationService.sendWechatAlert(message, alertKey);
    
    console.log(`🚨 ${message}`);
  }

  /**
   * 动态更新价格阈值
   * @param {string} symbol - 币种符号
   * @param {number} currentPrice - 当前价格
   */
  _updateThresholds(symbol, currentPrice) {
    const changeThreshold = config.alerts.priceChangeThreshold;
    
    this.priceThresholds[symbol] = {
      min: currentPrice * (1 - changeThreshold),
      max: currentPrice * (1 + changeThreshold)
    };
    
    console.log(`📊 ${symbol} 阈值已更新: 最小=${this.priceThresholds[symbol].min.toFixed(4)}, 最大=${this.priceThresholds[symbol].max.toFixed(4)}`);
  }

  /**
   * 生成预警消息
   * @param {string} symbol - 币种符号
   * @param {Object} data - 价格数据
   * @param {string} type - 突破类型
   * @param {number} threshold - 突破的阈值
   * @returns {string} 预警消息
   */
  _generateAlertMessage(symbol, data, type, threshold) {
    const { price, priceChangePercent } = data;
    const direction = type === 'max' ? '超过最大' : '低于最小';
    const emoji = type === 'max' ? '📈' : '📉';
    
    const newThresholds = this.priceThresholds[symbol];
    
    return `${emoji} 价格预警！\n` +
           `币种: ${symbol}\n` +
           `当前价格: $${price.toFixed(4)}\n` +
           `${direction}设定值: $${threshold.toFixed(4)}\n` +
           `24h涨跌: ${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%\n` +
           `新阈值范围: $${newThresholds.min.toFixed(4)} - $${newThresholds.max.toFixed(4)}\n` +
           `时间: ${new Date().toLocaleString()}`;
  }

  /**
   * 记录价格变化
   * @param {string} symbol - 币种符号
   * @param {Object} data - 当前价格数据
   * @param {Object} previousData - 之前的价格数据
   */
  _logPriceChange(symbol, data, previousData) {
    if (!previousData) return;
    
    const priceChange = data.price - previousData.price;
    const changePercent = (priceChange / previousData.price) * 100;
    
    if (Math.abs(changePercent) >= 0.5) { // 变化超过0.5%时记录
      const direction = priceChange > 0 ? '📈' : '📉';
      console.log(`${direction} ${symbol}: $${data.price.toFixed(4)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
    }
  }

  /**
   * 获取指定币种的当前数据
   * @param {string} symbol - 币种符号
   * @returns {Object|null} 价格数据
   */
  getCryptoData(symbol) {
    return this.cryptoData.get(symbol) || null;
  }

  /**
   * 获取所有币种的当前数据
   * @returns {Map} 所有价格数据
   */
  getAllCryptoData() {
    return new Map(this.cryptoData);
  }

  /**
   * 获取指定币种的当前阈值
   * @param {string} symbol - 币种符号
   * @returns {Object|null} 阈值配置
   */
  getThresholds(symbol) {
    return this.priceThresholds[symbol] || null;
  }

  /**
   * 手动设置币种阈值
   * @param {string} symbol - 币种符号
   * @param {number} min - 最小价格
   * @param {number} max - 最大价格
   */
  setThresholds(symbol, min, max) {
    this.priceThresholds[symbol] = { min, max };
    console.log(`⚙️ 手动设置 ${symbol} 阈值: 最小=${min}, 最大=${max}`);
  }

  /**
   * 获取监控统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      monitoredSymbols: this.cryptoData.size,
      activeAlerts: this.notificationService.getActiveAlertsCount(),
      lastUpdate: new Date().toLocaleString()
    };
  }
}

module.exports = PriceMonitorService;