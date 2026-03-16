"use client";

/**
 * 时间同步 Hook
 * 从后端获取 UTC 时间，计算偏移量，提供同步后的时间
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface TimeSyncState {
  serverTime: Date | null;
  timeOffset: number; // 本地时间与服务器时间的偏移量（毫秒）
  isSynced: boolean;
  isLoading: boolean;
  error: Error | null;
}

interface UseTimeSyncReturn extends TimeSyncState {
  getSyncedTime: () => Date;
  refresh: () => Promise<void>;
}

// 缓存时间同步状态，避免多个组件重复请求
let globalTimeOffset: number | null = null;
let globalLastSync: number | null = null;
const SYNC_INTERVAL = 5 * 60 * 1000; // 5分钟重新同步一次

async function fetchServerTime(): Promise<Date> {
  const response = await fetch("/api/v1/public/time");
  if (!response.ok) {
    throw new Error("Failed to fetch server time");
  }
  const data = await response.json();
  return new Date(data.data.timestamp * 1000);
}

export function useTimeSync(): UseTimeSyncReturn {
  const [state, setState] = useState<TimeSyncState>({
    serverTime: null,
    timeOffset: 0,
    isSynced: false,
    isLoading: false,
    error: null,
  });

  const syncTime = useCallback(async () => {
    // 检查全局缓存
    if (
      globalTimeOffset !== null &&
      globalLastSync !== null &&
      Date.now() - globalLastSync < SYNC_INTERVAL
    ) {
      setState({
        serverTime: new Date(Date.now() + globalTimeOffset),
        timeOffset: globalTimeOffset,
        isSynced: true,
        isLoading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const startTime = Date.now();
      const serverTime = await fetchServerTime();
      const endTime = Date.now();
      
      // 考虑网络延迟，取中间值
      const networkDelay = (endTime - startTime) / 2;
      const adjustedServerTime = new Date(serverTime.getTime() + networkDelay);
      
      const timeOffset = adjustedServerTime.getTime() - endTime;
      
      // 更新全局缓存
      globalTimeOffset = timeOffset;
      globalLastSync = endTime;

      setState({
        serverTime: adjustedServerTime,
        timeOffset,
        isSynced: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error("Unknown error"),
      }));
    }
  }, []);

  const getSyncedTime = useCallback((): Date => {
    if (globalTimeOffset !== null) {
      return new Date(Date.now() + globalTimeOffset);
    }
    // 如果未同步，返回本地时间（降级）
    return new Date();
  }, []);

  // 组件挂载时同步时间
  useEffect(() => {
    syncTime();
  }, [syncTime]);

  return {
    ...state,
    getSyncedTime,
    refresh: syncTime,
  };
}

/**
 * 获取同步后的 UTC 时间（非 Hook 版本，用于非 React 上下文）
 * @returns 同步后的 Date 对象
 */
export function getSyncedUTCTime(): Date {
  if (globalTimeOffset !== null) {
    return new Date(Date.now() + globalTimeOffset);
  }
  return new Date();
}
