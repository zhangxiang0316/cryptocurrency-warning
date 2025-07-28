/**
 * 应用配置文件
 * 包含所有系统配置参数
 */

module.exports = {
    // WebSocket 连接配置
    websocket: {
        url: 'wss://ws.okx.com:8443/ws/v5/public',
        reconnectAttempts: 5,
        reconnectDelay: 5000, // 毫秒
        subscriptionDelay: 100 // 订阅延迟
    },

    // 监控币种配置
    symbols: {
        default: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'OKBUSDT', 'BNBUSDT', 'APTUSDT'],

        // 价格阈值配置
        thresholds: {
            SOLUSDT: { min: 143, max: 143 },
            ETHUSDT: { min: 2400, max: 2400 },
            BTCUSDT: { min: 108000, max: 108000 },
            DOGEUSDT: { min: 0.165, max: 0.165 },
            OKBUSDT: { min: 51, max: 51 },
            BNBUSDT: { min: 630, max: 630 },
            APTUSDT: { min: 4.5, max: 4.5 }
        }
    },

    // 预警配置
    alerts: {
        priceChangeThreshold: 0.01, // 1%
        cooldownPeriod: 60 * 1000, // 1分钟
        cleanupInterval: 15 * 60 * 1000, // 15分钟
        maxAlertAge: 60 * 60 * 1000 // 1小时
    },

    // 微信机器人配置
    wechat: {
        webhookKey: 'your-webhook-key-here',
        apiUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send'
    },

    // 日志配置
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: true
    }
};