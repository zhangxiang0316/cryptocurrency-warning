# Docker 部署指南

## 快速开始

### 方式一：使用脚本部署（推荐）

**Linux/macOS:**
```bash
chmod +x docker-run.sh
./docker-run.sh
```

**Windows:**
```cmd
docker-run.bat
```

### 方式二：手动部署

1. **构建镜像**
```bash
docker-compose build
```

2. **启动服务**
```bash
docker-compose up -d
```

3. **查看日志**
```bash
docker-compose logs -f
```

## 配置说明

### 环境变量配置

在 `docker-compose.yml` 中可以配置以下环境变量：

```yaml
environment:
  - NODE_ENV=production
  - LOG_LEVEL=info
  - WECHAT_WEBHOOK_KEY=your-actual-webhook-key  # 微信机器人密钥
```

### 微信预警配置

如果需要启用微信预警功能，请：

1. 获取企业微信机器人 Webhook Key
2. 在 `docker-compose.yml` 中设置 `WECHAT_WEBHOOK_KEY` 环境变量
3. 或者直接修改 `config.js` 文件中的配置

## 常用命令

| 命令 | 说明 |
|------|------|
| `docker-compose up -d` | 后台启动服务 |
| `docker-compose down` | 停止并删除容器 |
| `docker-compose restart` | 重启服务 |
| `docker-compose logs -f` | 实时查看日志 |
| `docker-compose ps` | 查看容器状态 |
| `docker-compose exec price-monitor sh` | 进入容器 |

## 资源配置

默认资源限制：
- 内存限制：256MB
- CPU 限制：0.5 核心
- 内存预留：128MB
- CPU 预留：0.25 核心

可以在 `docker-compose.yml` 中调整这些限制。

## 健康检查

容器包含健康检查功能：
- 检查间隔：30秒
- 超时时间：10秒
- 重试次数：3次
- 启动等待：40秒

## 故障排除

### 1. 容器启动失败
```bash
# 查看详细日志
docker-compose logs price-monitor

# 检查容器状态
docker-compose ps
```

### 2. WebSocket 连接问题
- 检查网络连接
- 确认防火墙设置
- 查看应用日志中的错误信息

### 3. 内存不足
```bash
# 增加内存限制
# 在 docker-compose.yml 中修改 memory 配置
```

### 4. 重新构建镜像
```bash
# 清理并重新构建
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 数据持久化

如果需要持久化日志或配置：

1. 创建本地目录：
```bash
mkdir -p ./logs
```

2. 容器会自动将日志写入 `./logs` 目录

## 安全建议

1. **不要在镜像中硬编码敏感信息**
2. **使用环境变量传递配置**
3. **定期更新基础镜像**
4. **限制容器资源使用**
5. **使用非 root 用户运行应用**

## 监控和维护

### 查看资源使用情况
```bash
docker stats crypto-price-monitor
```

### 查看容器详细信息
```bash
docker inspect crypto-price-monitor
```

### 备份配置
```bash
# 备份配置文件
cp config.js config.js.backup
```

## 更新应用

1. **停止服务**
```bash
docker-compose down
```

2. **更新代码**
```bash
git pull  # 如果使用 Git
```

3. **重新构建并启动**
```bash
docker-compose build --no-cache
docker-compose up -d
```