#!/bin/bash

# Hardhat节点管理脚本
# 用于启动、停止和检查hardhat测试节点状态

# 切换到脚本所在目录（执行完自动返回原目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# 确保node在PATH中（加载profile配置）
# export PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH"

PID_FILE=".hardhat-node.pid"
LOG_FILE="hardhat-node.log"

# Fork 模式配置
# 主网 Uniswap V2 地址（fork模式下可用）
export UNISWAP_V2_FACTORY="0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
export UNISWAP_V2_ROUTER="0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
export WETH_ADDRESS="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

# 默认 RPC 地址（可修改为你的 Alchemy/Infura API）
# Cloudflare 公共 RPC - 免费、稳定、快速
DEFAULT_FORK_RPC="https://cloudflare-eth.com"

function start_node() {
    local FORK_MODE=$1
    local FORK_RPC=${2:-$DEFAULT_FORK_RPC}
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "❌ Hardhat节点已经在运行中 (PID: $PID)"
            echo "💡 使用 './hardhat-node.sh stop' 来停止节点"
            return 1
        else
            echo "⚠️  发现旧的PID文件，正在清理..."
            rm -f "$PID_FILE"
        fi
    fi

    echo "🚀 正在启动Hardhat测试节点..."
    
    # 根据是否fork主网选择启动命令
    if [ "$FORK_MODE" == "fork" ]; then
        echo "🌐 模式: Fork 以太坊主网"
        echo "📡 RPC: $FORK_RPC"
        echo "⚙️  配置: 主网状态 + 本地测试环境"
        echo ""
        echo "📍 可用的主网合约:"
        echo "   Uniswap V2 Factory: $UNISWAP_V2_FACTORY"
        echo "   Uniswap V2 Router:  $UNISWAP_V2_ROUTER"
        echo "   WETH:               $WETH_ADDRESS"
        
        # 启动fork模式
        nohup npx hardhat node --fork "$FORK_RPC" > "$LOG_FILE" 2>&1 &
    else
        echo "⚙️  模式: 本地测试网络"
        echo "⚙️  配置: 自动挖矿间隔 1 秒"
        
        # 启动普通模式
        nohup npx hardhat node --network hardhat > "$LOG_FILE" 2>&1 &
    fi
    
    # 保存进程ID
    echo $! > "$PID_FILE"
    
    # 等待节点启动
    sleep 3
    
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo ""
        echo "✅ Hardhat节点已成功启动"
        echo "📋 进程ID: $PID"
        echo "📝 日志文件: $LOG_FILE"
        echo "🌐 RPC地址: http://127.0.0.1:8545"
        echo ""
        echo "💡 使用 './hardhat-node.sh logs' 查看日志"
        echo "💡 使用 './hardhat-node.sh stop' 停止节点"
    else
        echo "❌ 启动失败，请查看日志: $LOG_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
}

function stop_node() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚠️  未找到运行中的Hardhat节点"
        # 检查是否有遗留的hardhat进程
        if pgrep -f "hardhat node" > /dev/null; then
            echo "🔍 发现遗留的Hardhat进程，正在清理..."
            pkill -f "hardhat node"
            sleep 2
            echo "✅ 已清理遗留进程"
        fi
        return 1
    fi

    PID=$(cat "$PID_FILE")
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "🛑 正在停止Hardhat节点 (PID: $PID)..."
        
        # 杀死整个进程组（包括所有子进程）
        pkill -P "$PID" 2>/dev/null  # 先杀死子进程
        kill "$PID" 2>/dev/null      # 再杀死主进程
        
        # 等待进程结束
        for i in {1..5}; do
            if ! ps -p "$PID" > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # 如果进程还在运行，强制终止
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "⚠️  进程未响应，强制终止..."
            pkill -9 -P "$PID" 2>/dev/null
            kill -9 "$PID" 2>/dev/null
        fi
        
        # 清理所有可能遗留的hardhat进程
        pkill -f "hardhat node" 2>/dev/null
        sleep 1
        
        rm -f "$PID_FILE"
        echo "✅ Hardhat节点已停止"
    else
        echo "⚠️  进程不存在，清理PID文件..."
        rm -f "$PID_FILE"
        # 清理可能的遗留进程
        pkill -f "hardhat node" 2>/dev/null
    fi
}

function status_node() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚪ Hardhat节点未运行"
        return 1
    fi

    PID=$(cat "$PID_FILE")
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "🟢 Hardhat节点正在运行"
        echo "📋 进程ID: $PID"
        echo "🌐 RPC地址: http://127.0.0.1:8545"
        echo "📝 日志文件: $LOG_FILE"
    else
        echo "🔴 Hardhat节点已停止（但PID文件存在）"
        rm -f "$PID_FILE"
        return 1
    fi
}

function show_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        echo "⚠️  未找到日志文件"
        return 1
    fi
    
    echo "📝 显示最近的日志 (按Ctrl+C退出):"
    echo "----------------------------------------"
    tail -f "$LOG_FILE"
}


function show_help() {
    echo "Hardhat节点管理脚本"
    echo ""
    echo "用法: ./hardhat-node.sh [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  start [RPC]      - 启动Fork主网模式（默认，可选自定义RPC地址）"
    echo "  start-local      - 启动纯本地测试节点（不Fork）"
    echo "  stop             - 停止Hardhat测试节点"
    echo "  restart [RPC]    - 重启Fork模式"
    echo "  restart-local    - 重启本地模式"
    echo "  status           - 查看节点状态"
    echo "  logs             - 查看节点日志（实时）"
    echo "  help             - 显示此帮助信息"
    echo ""
    echo "Fork 模式说明:"
    echo "  默认启动Fork模式，复制以太坊主网状态到本地"
    echo "  可直接使用主网上已部署的合约，包括："
    echo "  - Uniswap V2 Factory: $UNISWAP_V2_FACTORY"
    echo "  - Uniswap V2 Router:  $UNISWAP_V2_ROUTER"
    echo "  - WETH:               $WETH_ADDRESS"
    echo ""
    echo "示例:"
    echo "  ./hardhat-node.sh start                    # Fork主网（默认，使用公共RPC）"
    echo "  ./hardhat-node.sh start <YOUR_RPC>         # Fork主网（使用自定义RPC）"
    echo "  ./hardhat-node.sh start-local              # 纯本地模式（不Fork）"
    echo "  ./hardhat-node.sh stop                     # 停止节点"
    echo "  ./hardhat-node.sh logs                     # 查看日志"
    echo ""
    echo "RPC 提供商:"
    echo "  - 默认: https://cloudflare-eth.com (免费、稳定)"
    echo "  - Alchemy: https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY (推荐)"
    echo "  - Infura: https://mainnet.infura.io/v3/YOUR_API_KEY"
    echo "  - Ankr: https://rpc.ankr.com/eth"
}

# 主逻辑
case "${1:-help}" in
    start)
        # 默认启动Fork模式，可选自定义RPC
        start_node "fork" "$2"
        ;;
    start-local)
        # 启动纯本地模式（不Fork）
        start_node
        ;;
    stop)
        stop_node
        ;;
    restart)
        # 默认重启为Fork模式
        stop_node
        sleep 1
        start_node "fork" "$2"
        ;;
    restart-local)
        # 重启为本地模式
        stop_node
        sleep 1
        start_node
        ;;
    status)
        status_node
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ 未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

