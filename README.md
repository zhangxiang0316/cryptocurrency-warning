# 加密货币价格监控预警系统

一个基于 Node.js 的实时加密货币价格监控系统，通过 OKX WebSocket API 监控多种加密货币价格变动，并在价格突破预设阈值时通过微信机器人发送预警通知。

## 功能特性

- 🔄 **实时价格监控**: 通过 OKX WebSocket API 实时获取加密货币价格数据
- 📊 **多币种支持**: 支持监控 BTC、ETH、SOL、DOGE、OKB、BNB、APT 等主流加密货币
- 🚨 **智能预警**: 价格突破设定的最大/最小阈值时自动发送预警
- 📱 **微信通知**: 集成企业微信机器人，实时推送价格预警消息
- 🔄 **自动重连**: 网络断开时自动重连，确保监控服务稳定运行
- ⚡ **防重复预警**: 智能防重复机制，避免短时间内重复发送相同预警
- 🎯 **动态阈值**: 价格突破后自动调整监控阈值，适应市场波动

## 技术栈

- **Node.js**: 运行环境
- **WebSocket**: 实时数据通信
- **OKX API**: 加密货币数据源
- **企业微信机器人**: 消息推送

## 安装与配置

### 1. 克隆项目

```bash
git clone <repository-url>
cd cryptocurrency-warning
```

### 2. 安装依赖

```bash
npm install
# 或使用 pnpm
pnpm install
```

### 3. 配置参数

编辑 `index.js` 文件中的 `CONFIG` 对象：

```javascript
const CONFIG = {
    // WebSocket 连接地址
    OKX_WEBSOCKET_URL: 'wss://ws.okx.com:8443/ws/v5/public',
    
    // 监控的币种列表
    DEFAULT_SYMBOLS: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'OKBUSDT', 'BNBUSDT', 'APTUSDT'],
    
    // 价格上限阈值
    MAX_PRICE: {
        SOLUSDT: 143,
        ETHUSDT: 2400,
        BTCUSDT: 108000,
        // ... 其他币种
    },
    
    // 价格下限阈值
    MIN_PRICE: {
        SOLUSDT: 143,
        ETHUSDT: 2400,
        BTCUSDT: 108000,
        // ... 其他币种
    },
    
    // 微信机器人 Webhook Key
    WECHAT_WEBHOOK_KEY: 'your-webhook-key-here',
    
    // 价格变化预警阈值（1% = 0.01）
    PRICE_CHANGE_ALERT_THRESHOLD: 0.01
};
```

### 4. 配置微信机器人

1. 在企业微信群中添加机器人
2. 获取 Webhook Key
3. 将 Key 配置到 `CONFIG.WECHAT_WEBHOOK_KEY`

## 使用方法

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm start
```

### 使用 PM2 部署

```bash
npm run prod
```

## 项目结构

```
cryptocurrency-warning/
├── index.js           # 主程序文件
├── package.json       # 项目配置
├── pnpm-lock.yaml    # 依赖锁定文件
└── README.md         # 项目说明
```

## 核心功能说明

### 价格监控机制

- 系统通过 WebSocket 连接到 OKX 交易所获取实时价格数据
- 当价格超过设定的 `MAX_PRICE` 或低于 `MIN_PRICE` 时触发预警
- 预警触发后，系统会自动调整阈值以适应新的价格水平

### 预警防重复机制

- 每种类型的预警在 1 分钟内只会发送一次
- 系统维护预警记录，避免频繁推送相同消息
- 过期的预警记录会定期清理

### 自动重连机制

- WebSocket 连接断开时自动尝试重连
- 最多重连 5 次，每次重连间隔递增
- 重连成功后自动恢复所有币种的订阅

## 环境要求

- Node.js >= 14.0.0
- 稳定的网络连接
- 企业微信群机器人权限

## 依赖包

- `ws`: WebSocket 客户端库
- `nodemon`: 开发时自动重启工具

## 注意事项

1. **网络稳定性**: 确保服务器网络稳定，避免频繁断线重连
2. **微信机器人限制**: 注意企业微信机器人的消息发送频率限制
3. **价格阈值设置**: 根据市场波动合理设置价格阈值，避免过于频繁的预警
4. **资源监控**: 长期运行时注意监控内存使用情况

## 许可证

MIT License

## 作者

zx

---

**免责声明**: 本系统仅用于价格监控和预警，不构成任何投资建议。加密货币投资存在风险，请谨慎决策。