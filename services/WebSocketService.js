/**
 * WebSocket 连接服务类
 * 负责与 OKX WebSocket API 的连接和数据处理
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const config = require('../config');

class WebSocketService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.subscribers = new Set();
    this.heartbeatInterval = null;
  }

  /**
   * 连接到 OKX WebSocket
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🔗 正在连接 OKX WebSocket...');
      
      this.ws = new WebSocket(config.websocket.url);
      
      // 设置连接超时
      const connectTimeout = setTimeout(() => {
        if (this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.terminate();
          reject(new Error('WebSocket 连接超时'));
        }
      }, 10000); // 10秒超时

      this.ws.on('open', () => {
        clearTimeout(connectTimeout);
        console.log('✅ OKX WebSocket 连接成功');
        
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // 启动心跳
        this._startHeartbeat();
        
        // 延迟重新订阅，确保连接稳定
        setTimeout(() => {
          this._resubscribeAll();
          this.emit('connected');
        }, config.websocket.subscriptionDelay);
        
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const parsedData = JSON.parse(data.toString());
          this._handleMessage(parsedData);
        } catch (error) {
          console.error('❌ 解析 WebSocket 消息失败:', error.message);
          this.emit('error', error);
        }
      });

      this.ws.on('close', (code, reason) => {
        clearTimeout(connectTimeout);
        console.log(`🔌 WebSocket 连接断开 [${code}]: ${reason || '未知原因'}`);
        
        this.isConnected = false;
        this._stopHeartbeat();
        
        this.emit('disconnected', { code, reason });
        this._attemptReconnect();
      });

      this.ws.on('error', (error) => {
        clearTimeout(connectTimeout);
        console.error('❌ WebSocket 错误:', error.message);
        
        this.isConnected = false;
        this.emit('error', error);
        
        reject(error);
      });

      this.ws.on('pong', () => {
        // 收到 pong 响应，连接正常
        console.log('💓 WebSocket 心跳正常');
      });
    });
  }

  /**
   * 处理接收到的 WebSocket 消息
   * @param {Object} data - 解析后的消息数据
   */
  _handleMessage(data) {
    // 处理订阅确认消息
    if (data.event === 'subscribe') {
      console.log('📡 订阅确认:', data.arg?.instId || 'unknown');
      return;
    }

    // 处理错误消息
    if (data.event === 'error') {
      console.error('❌ WebSocket 错误消息:', data.msg);
      this.emit('error', new Error(data.msg));
      return;
    }

    // 处理价格数据
    if (data.data && Array.isArray(data.data) && data.arg?.channel === 'tickers') {
      data.data.forEach((item) => {
        const cryptoData = this._parsePriceData(item);
        if (cryptoData) {
          this.emit('priceUpdate', cryptoData);
        }
      });
    }
  }

  /**
   * 解析价格数据
   * @param {Object} item - OKX 返回的价格数据项
   * @returns {Object|null} 格式化的价格数据
   */
  _parsePriceData(item) {
    try {
      const symbol = this._convertOKXSymbolBack(item.instId);
      const last = parseFloat(item.last);
      const open24h = parseFloat(item.open24h);
      
      if (isNaN(last) || isNaN(open24h)) {
        console.warn(`⚠️ 无效的价格数据: ${item.instId}`);
        return null;
      }

      return {
        symbol,
        price: last,
        priceChange: last - open24h,
        priceChangePercent: ((last - open24h) / open24h) * 100,
        volume: parseFloat(item.vol24h) || 0,
        high24h: parseFloat(item.high24h) || 0,
        low24h: parseFloat(item.low24h) || 0,
        lastUpdate: new Date(parseInt(item.ts))
      };
    } catch (error) {
      console.error('❌ 解析价格数据失败:', error.message);
      return null;
    }
  }

  /**
   * 订阅币种价格数据
   * @param {string} symbol - 币种符号
   * @returns {boolean} 是否成功发送订阅请求
   */
  subscribe(symbol) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.add(symbol);
      console.log(`📊 添加订阅: ${symbol}`);
    }

    return this._sendSubscription(symbol);
  }

  /**
   * 取消订阅币种
   * @param {string} symbol - 币种符号
   * @returns {boolean} 是否成功发送取消订阅请求
   */
  unsubscribe(symbol) {
    this.subscribers.delete(symbol);
    console.log(`📊 取消订阅: ${symbol}`);
    
    return this._sendUnsubscription(symbol);
  }

  /**
   * 发送订阅请求
   * @param {string} symbol - 币种符号
   * @returns {boolean} 是否成功发送
   */
  _sendSubscription(symbol) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`⚠️ WebSocket 未连接，无法订阅 ${symbol}`);
      return false;
    }

    try {
      const message = {
        op: 'subscribe',
        args: [{
          channel: 'tickers',
          instId: this._convertSymbolForOKX(symbol)
        }]
      };

      this.ws.send(JSON.stringify(message));
      console.log(`📡 发送订阅请求: ${symbol}`);
      return true;
    } catch (error) {
      console.error(`❌ 发送订阅请求失败 ${symbol}:`, error.message);
      return false;
    }
  }

  /**
   * 发送取消订阅请求
   * @param {string} symbol - 币种符号
   * @returns {boolean} 是否成功发送
   */
  _sendUnsubscription(symbol) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message = {
        op: 'unsubscribe',
        args: [{
          channel: 'tickers',
          instId: this._convertSymbolForOKX(symbol)
        }]
      };

      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ 发送取消订阅请求失败 ${symbol}:`, error.message);
      return false;
    }
  }

  /**
   * 重新订阅所有币种
   */
  _resubscribeAll() {
    console.log(`🔄 重新订阅 ${this.subscribers.size} 个币种...`);
    
    this.subscribers.forEach(symbol => {
      this._sendSubscription(symbol);
    });
  }

  /**
   * 尝试重新连接
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= config.websocket.reconnectAttempts) {
      console.error(`❌ 达到最大重连次数 (${config.websocket.reconnectAttempts})，停止重连`);
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = config.websocket.reconnectDelay * this.reconnectAttempts;
    
    console.log(`🔄 尝试重连... (${this.reconnectAttempts}/${config.websocket.reconnectAttempts}) 延迟: ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ 重连失败:', error.message);
      }
    }, delay);
  }

  /**
   * 启动心跳检测
   */
  _startHeartbeat() {
    this._stopHeartbeat(); // 确保没有重复的心跳
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // 每30秒发送一次心跳
  }

  /**
   * 停止心跳检测
   */
  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 转换币种符号为 OKX 格式
   * @param {string} symbol - 标准币种符号
   * @returns {string} OKX 格式的币种符号
   */
  _convertSymbolForOKX(symbol) {
    if (symbol.endsWith('USDT')) {
      const base = symbol.replace('USDT', '');
      return `${base}-USDT`;
    }
    return symbol;
  }

  /**
   * 将 OKX 格式的币种符号转换回标准格式
   * @param {string} okxSymbol - OKX 格式的币种符号
   * @returns {string} 标准币种符号
   */
  _convertOKXSymbolBack(okxSymbol) {
    return okxSymbol.replace('-', '');
  }

  /**
   * 获取连接状态
   * @returns {Object} 连接状态信息
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscribedSymbols: Array.from(this.subscribers),
      readyState: this.ws ? this.ws.readyState : null
    };
  }

  /**
   * 关闭 WebSocket 连接
   */
  disconnect() {
    console.log('🔌 正在断开 WebSocket 连接...');
    
    this._stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
    
    console.log('✅ WebSocket 连接已断开');
  }
}

module.exports = WebSocketService;