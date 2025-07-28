const WebSocket = require('ws');
const https = require('https');

// 配置
const CONFIG = {
    OKX_WEBSOCKET_URL: 'wss://ws.okx.com:8443/ws/v5/public', // OKX WebSocket API地址
    DEFAULT_SYMBOLS: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', "DOGEUSDT", "OKBUSDT", "BNBUSDT", "APTUSDT"], // 默认订阅的币种
    MAX_PRICE: {
        SOLUSDT: 143,
        ETHUSDT: 2400,
        BTCUSDT: 108000,
        DOGEUSDT: 0.165,
        OKBUSDT: 51,
        BNBUSDT: 630,
        APTUSDT: 4.5
    }, // 币种的最大价格
    MIN_PRICE: {
        SOLUSDT: 143,
        ETHUSDT: 2400,
        BTCUSDT: 108000,
        DOGEUSDT: 0.165,
        OKBUSDT: 51,
        BNBUSDT: 630,
        APTUSDT: 4.5
    },// 币种的最小价格
    RECONNECT_ATTEMPTS: 5, // 最大重连次数
    RECONNECT_DELAY: 5000, // 重连延迟时间（毫秒）
    WECHAT_WEBHOOK_KEY: 'your-webhook-key-here', // 微信机器人Webhook Key
    PRICE_CHANGE_ALERT_THRESHOLD: 0.01 //价格变化超过1%时发送预警
};

// 主服务类
class CryptoMonitorService {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0; // 用于记录重连次数
        this.cryptoData = new Map();// 用于存储加密货币数据
        this.subscribers = new Set();// 用于存储订阅的币种
        this.isConnected = false;// 用于记录是否连接成功
        this.sentAlerts = new Map(); // 用于记录已发送的预警，避免重复发送
        this.init();  // 启动服务
    }

    async init() {
        console.log('启动加密货币价格监控服务...');
        // 连接WebSocket
        await this.connect();
        // 订阅默认币种
        CONFIG.DEFAULT_SYMBOLS.forEach(symbol => {
            this.subscribeTicker(symbol);
        });
        // 启动定时任务
        this.startScheduledTasks();
        console.log('服务启动完成！');
    }

    // 连接OKX WebSocket
    async connect() {
        return new Promise((resolve, reject) => {
            console.log('🔗 正在连接OKX WebSocket...');
            this.ws = new WebSocket(CONFIG.OKX_WEBSOCKET_URL);
            this.ws.on('open', () => {
                console.log('OKX WebSocket连接成功');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                // 重新订阅所有币种
                setTimeout(() => {
                    this.resubscribeAll();
                }, 100);
                resolve();
            });
            this.ws.on('message', (data) => {
                try {
                    const parsedData = JSON.parse(data.toString());
                    this.handleMessage(parsedData);
                } catch (error) {
                    console.error('解析WebSocket消息失败:', error);
                }
            });
            this.ws.on('close', () => {
                console.log('OKX WebSocket连接断开');
                this.isConnected = false;
                this.attemptReconnect();
            });
            this.ws.on('error', (error) => {
                console.error('OKX WebSocket错误:', error);
                this.isConnected = false;
                reject(error);
            });
        });
    }

    // 处理WebSocket消息
    handleMessage(data) {
        if (data.data && Array.isArray(data.data)) {
            data.data.forEach((item) => {
                if (data.arg?.channel === 'tickers') {
                    const symbol = this.convertOKXSymbolBack(item.instId);

                    const cryptoData = {
                        symbol,
                        price: parseFloat(item.last),
                        priceChange: parseFloat(item.last) - parseFloat(item.open24h),
                        priceChangePercent: ((parseFloat(item.last) - parseFloat(item.open24h)) / parseFloat(item.open24h)) * 100,
                        volume: parseFloat(item.vol24h),
                        high24h: parseFloat(item.high24h),
                        low24h: parseFloat(item.low24h),
                        lastUpdate: new Date(parseInt(item.ts))
                    };

                    // 更新当前数据
                    this.updateCryptoData(symbol, cryptoData);
                }
            });
        }
    }

    // 更新加密货币数据
    updateCryptoData(symbol, data) {
        this.cryptoData.set(symbol, data);
        // 检查价格是否超过MAX_PRICE
        if (data.price > CONFIG.MAX_PRICE[symbol]) {
            CONFIG.MIN_PRICE[symbol] = data.price * (1 - CONFIG.PRICE_CHANGE_ALERT_THRESHOLD)
            CONFIG.MAX_PRICE[symbol] = data.price * (1 + CONFIG.PRICE_CHANGE_ALERT_THRESHOLD);
            const alertKey = `${symbol}_max_price_exceeded`;
            // 检查是否已发送过该警报
            if (!this.sentAlerts.has(alertKey)) {
                const message = `警告! ${symbol} 价格已超过最大设定值! 当前: $${data.price.toFixed(4)}, 最大设定: $${CONFIG.MAX_PRICE[symbol]}，最小设定：$${CONFIG.MIN_PRICE[symbol]}`;
                console.log(message);
                // 发送微信预警
                this.sendWechatAlert(message);
                // 记录已发送警报
                this.sentAlerts.set(alertKey, Date.now());
                // 1分钟后可再次发送同类型警报
                setTimeout(() => {
                    this.sentAlerts.delete(alertKey);
                }, 60 * 1000);
            }
        }
        // 检查价格是否低于MIN_PRICE
        if (data.price < CONFIG.MIN_PRICE[symbol]) {
            CONFIG.MAX_PRICE[symbol] = data.price * (1 + CONFIG.PRICE_CHANGE_ALERT_THRESHOLD)
            CONFIG.MIN_PRICE[symbol] = data.price * (1 - CONFIG.PRICE_CHANGE_ALERT_THRESHOLD);
            const alertKey = `${symbol}_min_price_exceeded`;
            // 检查是否已发送过该警报
            if (!this.sentAlerts.has(alertKey)) {
                const message = `警告! ${symbol} 价格已低于最小设定值! 当前: $${data.price.toFixed(4)}, 最小设定: $${CONFIG.MIN_PRICE[symbol]}，最大设定：$${CONFIG.MAX_PRICE[symbol]}`;
                console.log(message);
                // 发送微信预警
                this.sendWechatAlert(message);
                // 记录已发送警报
                this.sentAlerts.set(alertKey, Date.now());
                // 1分钟后可再次发送同类型警报
                setTimeout(() => {
                    this.sentAlerts.delete(alertKey);
                }, 60 * 1000);
            }
        }
    }

    // 发送微信机器人预警消息
    sendWechatAlert(content) {
        const webhookUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${CONFIG.WECHAT_WEBHOOK_KEY}`;
        const postData = JSON.stringify({
            msgtype: 'text',
            text: {
                content: content
            }
        });
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        const req = https.request(webhookUrl, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.errcode === 0) {
                        console.log(`微信预警发送成功: ${new Date()}`);
                    } else {
                        console.error(`微信预警发送失败:${new Date()}, ${response.errmsg}`);
                    }
                } catch (error) {
                    console.error('解析微信响应失败:', error);
                }
            });
        });
        req.on('error', (e) => {
            console.error(`发送微信预警失败: ${e.message}`);
        });
        req.write(postData);
        req.end();
    }

    // 订阅币种
    subscribeTicker(symbol) {
        if (!this.subscribers.has(symbol)) {
            this.subscribers.add(symbol);
            console.log(`订阅币种: ${symbol}`);
        }

        if (this.isConnected) {
            this.sendTickerSubscription(symbol);
        }
    }

    // 发送订阅请求
    sendTickerSubscription(symbol) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const message = {
            op: 'subscribe',
            args: [{
                channel: 'tickers',
                instId: this.convertSymbolForOKX(symbol)
            }]
        };

        this.ws.send(JSON.stringify(message));
    }

    // 重新订阅所有币种
    resubscribeAll() {
        this.subscribers.forEach(symbol => {
            this.sendTickerSubscription(symbol);
        });
    }

    // 转换币种符号格式
    convertSymbolForOKX(symbol) {
        if (symbol.endsWith('USDT')) {
            const base = symbol.replace('USDT', '');
            return `${base}-USDT`;
        }
        return symbol;
    }

    convertOKXSymbolBack(okxSymbol) {
        return okxSymbol.replace('-', '');
    }

    // 重连机制
    attemptReconnect() {
        if (this.reconnectAttempts < CONFIG.RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            console.log(`尝试重连... (${this.reconnectAttempts}/${CONFIG.RECONNECT_ATTEMPTS})`);
            setTimeout(async () => {
                try {
                    await this.connect();
                } catch (error) {
                    console.error('重连失败:', error);
                }
            }, CONFIG.RECONNECT_DELAY * this.reconnectAttempts);
        } else {
            console.error('达到最大重连次数，停止重连');
        }
    }

    // 启动定时任务
    startScheduledTasks() {
        // 定期清理过期的警报记录
        setInterval(() => {
            const now = Date.now();
            this.sentAlerts.forEach((timestamp, key) => {
                if (now - timestamp > 60 * 60 * 1000) { // 1小时以上的旧警报记录
                    this.sentAlerts.delete(key);
                }
            });
        }, 15 * 60 * 1000); // 每15分钟清理一次
    }

    // 关闭服务
    async shutdown() {
        console.log('正在关闭服务...');
        if (this.ws) {
            this.ws.close();
        }
        console.log('服务已关闭');
        process.exit(0);
    }
}

// 启动服务
const service = new CryptoMonitorService();

// 处理进程信号
process.on('SIGINT', () => service.shutdown());
process.on('SIGTERM', () => service.shutdown());

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    service.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    service.shutdown();
});

module.exports = CryptoMonitorService;