@echo off
chcp 65001 >nul

echo 🚀 开始部署加密货币价格监控服务...

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未安装，请先安装 Docker
    pause
    exit /b 1
)

REM 检查 Docker Compose 是否安装
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose 未安装，请先安装 Docker Compose
    pause
    exit /b 1
)

REM 停止并删除现有容器
echo 🛑 停止现有容器...
docker-compose down

REM 构建镜像
echo 🔨 构建 Docker 镜像...
docker-compose build --no-cache

REM 启动服务
echo ▶️ 启动服务...
docker-compose up -d

REM 检查服务状态
echo 📊 检查服务状态...
timeout /t 5 /nobreak >nul
docker-compose ps

REM 显示日志
echo 📋 显示最近日志...
docker-compose logs --tail=20

echo ✅ 部署完成！
echo.
echo 📝 常用命令：
echo   查看日志: docker-compose logs -f
echo   停止服务: docker-compose down
echo   重启服务: docker-compose restart
echo   查看状态: docker-compose ps

pause