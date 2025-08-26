#!/bin/bash

# 加密货币价格监控 Docker 部署脚本

echo "🚀 开始部署加密货币价格监控服务..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 停止并删除现有容器
echo "🛑 停止现有容器..."
docker-compose down

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build --no-cache

# 启动服务
echo "▶️ 启动服务..."
docker-compose up -d

# 检查服务状态
echo "📊 检查服务状态..."
sleep 5
docker-compose ps

# 显示日志
echo "📋 显示最近日志..."
docker-compose logs --tail=20

echo "✅ 部署完成！"
echo ""
echo "📝 常用命令："
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  查看状态: docker-compose ps"