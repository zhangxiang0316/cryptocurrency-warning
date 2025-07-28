/**
 * 加密货币价格监控预警系统
 * 重构版本 - 模块化架构
 * 
 * @author zx
 * @version 2.0.0
 */

const config = require('./config');
const WebSocketService = require('./services/WebSocketService');
const PriceMonitorService = require('./services/PriceMonitorService');
const { formatTime, isValidSymbol, retry } = require('./utils/helpers');

/**
 * 主服务类 - 重构版本
 * 协调各个服务模块的工作
 */
class CryptoMonitorService {
    constructor() {
        this.webSocketService = new WebSocketService();
        this.priceMonitorService = new PriceMonitorService();
        this.isRunning = false;
        this.startTime = null;
        
        // 绑定事件处理器
        this._bindEventHandlers();
    }

    /**
     * 绑定事件处理器
     */
    _bindEventHandlers() {
        // WebSocket 连接成功事件
        this.webSocketService.on('connected', () => {
            console.log('🎉 WebSocket 服务已连接');
        });

        // WebSocket 断开连接事件
        this.webSocketService.on('disconnected', ({ code, reason }) => {
            console.log(`⚠️ WebSocket 服务断开: [${code}] ${reason}`);
        });

        // WebSocket 错误事件
        this.webSocketService.on('error', (error) => {
            console.error('❌ WebSocket 服务错误:', error.message);
        });

        // 价格更新事件
        this.webSocketService.on('priceUpdate', (cryptoData) => {
            this.priceMonitorService.updateCryptoData(cryptoData.symbol, cryptoData);
        });

        // 达到最大重连次数事件
        this.webSocketService.on('maxReconnectAttemptsReached', () => {
            console.error('🚫 WebSocket 达到最大重连次数，服务将停止');
            this.shutdown();
        });
    }

    /**
     * 初始化并启动服务
     */
    async init() {
        try {
            console.log('🚀 启动加密货币价格监控服务...');
            console.log(`📅 启动时间: ${formatTime(new Date())}`);
            
            this.startTime = new Date();
            
            // 验证配置
            this._validateConfig();
            
            // 连接 WebSocket
            await retry(() => this.webSocketService.connect(), 3, 2000);
            
            // 订阅默认币种
            this._subscribeDefaultSymbols();
            
            this.isRunning = true;
            console.log('✅ 服务启动完成！');
            console.log(`📊 监控币种: ${config.symbols.default.join(', ')}`);
            
        } catch (error) {
            console.error('❌ 服务启动失败:', error.message);
            throw error;
        }
    }

    /**
     * 验证配置
     */
    _validateConfig() {
        // 验证微信 Webhook Key
        if (!config.wechat.webhookKey || config.wechat.webhookKey === 'your-webhook-key-here') {
            console.warn('⚠️ 微信 Webhook Key 未配置，预警功能将无法正常工作');
        }

        // 验证币种配置
        config.symbols.default.forEach(symbol => {
            if (!isValidSymbol(symbol)) {
                throw new Error(`无效的币种符号: ${symbol}`);
            }
            if (!config.symbols.thresholds[symbol]) {
                console.warn(`⚠️ 币种 ${symbol} 未配置价格阈值`);
            }
        });

        console.log('✅ 配置验证通过');
    }

    /**
     * 订阅默认币种
     */
    _subscribeDefaultSymbols() {
        console.log(`📡 订阅 ${config.symbols.default.length} 个默认币种...`);
        
        config.symbols.default.forEach(symbol => {
            const success = this.webSocketService.subscribe(symbol);
            if (!success) {
                console.warn(`⚠️ 订阅 ${symbol} 失败`);
            }
        });
    }

    /**
     * 添加新的币种监控
     * @param {string} symbol - 币种符号
     * @param {Object} thresholds - 价格阈值 {min, max}
     * @returns {boolean} 是否成功添加
     */
    addSymbol(symbol, thresholds = null) {
        if (!isValidSymbol(symbol)) {
            console.error(`❌ 无效的币种符号: ${symbol}`);
            return false;
        }

        const success = this.webSocketService.subscribe(symbol);
        if (success && thresholds) {
            this.priceMonitorService.setThresholds(symbol, thresholds.min, thresholds.max);
        }

        console.log(`➕ 添加币种监控: ${symbol}`);
        return success;
    }

    /**
     * 移除币种监控
     * @param {string} symbol - 币种符号
     * @returns {boolean} 是否成功移除
     */
    removeSymbol(symbol) {
        const success = this.webSocketService.unsubscribe(symbol);
        console.log(`➖ 移除币种监控: ${symbol}`);
        return success;
    }

    /**
     * 获取服务状态信息
     * @returns {Object} 状态信息
     */
    getStatus() {
        const wsStatus = this.webSocketService.getStatus();
        const monitorStats = this.priceMonitorService.getStats();
        
        return {
            isRunning: this.isRunning,
            startTime: this.startTime,
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
            websocket: wsStatus,
            monitor: monitorStats
        };
    }

    /**
     * 获取所有币种的当前价格数据
     * @returns {Object} 价格数据
     */
    getAllPrices() {
        const allData = this.priceMonitorService.getAllCryptoData();
        const result = {};
        
        allData.forEach((data, symbol) => {
            result[symbol] = {
                price: data.price,
                change: data.priceChangePercent,
                lastUpdate: data.lastUpdate
            };
        });
        
        return result;
    }

    /**
     * 获取指定币种的详细信息
     * @param {string} symbol - 币种符号
     * @returns {Object|null} 币种详细信息
     */
    getSymbolInfo(symbol) {
        const data = this.priceMonitorService.getCryptoData(symbol);
        const thresholds = this.priceMonitorService.getThresholds(symbol);
        
        if (!data) {
            return null;
        }
        
        return {
            ...data,
            thresholds
        };
    }

    /**
     * 关闭服务
     */
    async shutdown() {
        console.log('🛑 正在关闭服务...');
        
        this.isRunning = false;
        
        try {
            // 断开 WebSocket 连接
            this.webSocketService.disconnect();
            
            // 清理资源
            this.webSocketService.removeAllListeners();
            
            const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
            console.log(`📊 服务运行时长: ${Math.floor(uptime / 1000)} 秒`);
            console.log('✅ 服务已安全关闭');
            
        } catch (error) {
            console.error('❌ 关闭服务时发生错误:', error.message);
        }
        
        process.exit(0);
    }
}


// 主函数 - 启动服务
async function main() {
    let service = null;
    
    try {
        service = new CryptoMonitorService();
        await service.init();
        
        // 定期输出状态信息
        setInterval(() => {
            const status = service.getStatus();
            console.log(`📈 监控状态: ${status.monitor.monitoredSymbols} 个币种, 运行时长: ${Math.floor(status.uptime / 1000)}s`);
        }, 5 * 60 * 1000); // 每5分钟输出一次
        
    } catch (error) {
        console.error('❌ 启动服务失败:', error.message);
        process.exit(1);
    }
    
    // 优雅关闭处理
    const gracefulShutdown = async (signal) => {
        console.log(`\n📡 收到 ${signal} 信号，开始优雅关闭...`);
        if (service) {
            await service.shutdown();
        } else {
            process.exit(0);
        }
    };
    
    // 处理进程信号
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
        console.error('❌ 未捕获的异常:', error);
        if (service) {
            service.shutdown();
        } else {
            process.exit(1);
        }
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ 未处理的Promise拒绝:', reason);
        console.error('Promise:', promise);
        if (service) {
            service.shutdown();
        } else {
            process.exit(1);
        }
    });
}

// 如果直接运行此文件，则启动服务
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 应用启动失败:', error);
        process.exit(1);
    });
}

module.exports = CryptoMonitorService;