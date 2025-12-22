import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

// Mock API service - 替换为实际API
const apiService = {
  async getStats() {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      totalValue: 125430.50,
      totalValueChange: { value: 12.5, trend: 'up' as const },
      todayEarnings: 1250.30,
      todayEarningsChange: { value: 8.3, trend: 'up' as const },
      stakingRewards: 245.8,
      apy: 18.5,
      claimableRewards: 245.8
    };
  },

  async getPortfolio() {
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      totalValue: 125430.50,
      assets: [
        {
          id: '1',
          name: 'RWA-房产-001',
          value: 85000,
          progress: 80,
          type: 'rwa' as const,
          apy: 15.5
        },
        {
          id: '2',
          name: 'RWA-房产-002',
          value: 40430.50,
          progress: 30,
          type: 'rwa' as const,
          apy: 18.0
        }
      ],
      reinvestableAssets: [
        { id: '2', name: 'RWA-房产-002', expiresIn: '2天' }
      ]
    };
  },

  async getActivities() {
    await new Promise(resolve => setTimeout(resolve, 600));

    return [
      {
        id: '1',
        type: 'subscribe',
        description: '认购 RWA-房产-001',
        amount: '¥50,000',
        time: '2小时前',
        status: 'success'
      },
      {
        id: '2',
        type: 'claim',
        description: '领取质押奖励',
        amount: '125.3 PLT',
        time: '5小时前',
        status: 'success'
      },
      {
        id: '3',
        type: 'redeem',
        description: 'RWA-房产-002 到期赎回',
        amount: '¥30,000',
        time: '昨天',
        status: 'success'
      }
    ];
  }
};

export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 使用 React Query 进行数据获取和缓存
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: apiService.getStats,
    refetchInterval: 30000, // 每30秒刷新
    staleTime: 10000 // 10秒内数据被认为是最新的
  });

  const {
    data: portfolio,
    isLoading: portfolioLoading,
    error: portfolioError
  } = useQuery({
    queryKey: ['portfolio'],
    queryFn: apiService.getPortfolio,
    refetchInterval: 60000, // 每分钟刷新
    staleTime: 30000
  });

  const {
    data: activities,
    isLoading: activitiesLoading,
    error: activitiesError
  } = useQuery({
    queryKey: ['activities'],
    queryFn: apiService.getActivities,
    refetchInterval: 120000, // 每2分钟刷新
    staleTime: 60000
  });

  // 实时数据更新模拟
  useEffect(() => {
    const interval = setInterval(() => {
      // 这里可以连接 WebSocket 进行真实的数据更新
      console.log('Checking for real-time updates...');
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 计算总体加载状态
  useEffect(() => {
    setLoading(statsLoading || portfolioLoading || activitiesLoading);
  }, [statsLoading, portfolioLoading, activitiesLoading]);

  // 处理错误
  useEffect(() => {
    if (statsError || portfolioError || activitiesError) {
      setError(statsError || portfolioError || activitiesError || null);
    }
  }, [statsError, portfolioError, activitiesError]);

  // 默认值
  const defaultStats = {
    totalValue: 0,
    totalValueChange: { value: 0, trend: 'neutral' as const },
    todayEarnings: 0,
    todayEarningsChange: { value: 0, trend: 'neutral' as const },
    stakingRewards: 0,
    apy: 0,
    claimableRewards: 0
  };

  const defaultPortfolio = {
    totalValue: 0,
    assets: [],
    reinvestableAssets: []
  };

  const defaultActivities = [];

  return {
    stats: stats || defaultStats,
    portfolio: portfolio || defaultPortfolio,
    activities: activities || defaultActivities,
    loading,
    error,
    refetch: () => {
      // 手动刷新所有数据
      window.location.reload();
    }
  };
};

// 实时数据 Hook
export const useRealTimePrice = (assetId: string) => {
  const [price, setPrice] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // 模拟实时价格更新
    const updatePrice = () => {
      const newPrice = Math.random() * 1000 + 90000;
      setPrice(newPrice);
      setLastUpdate(new Date());
    };

    updatePrice();
    const interval = setInterval(updatePrice, 3000);

    return () => clearInterval(interval);
  }, [assetId]);

  return { price, lastUpdate };
};

// WebSocket 连接 Hook（用于真实环境）
export const useWebSocket = (url: string) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const websocket = new WebSocket(url);

    websocket.onopen = () => {
      setConnected(true);
      setWs(websocket);
    };

    websocket.onclose = () => {
      setConnected(false);
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    return () => {
      websocket.close();
    };
  }, [url]);

  const sendMessage = useCallback((message: any) => {
    if (ws && connected) {
      ws.send(JSON.stringify(message));
    }
  }, [ws, connected]);

  return { ws, connected, sendMessage };
};