'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 动作类型
 */
export type ActionType = 'blink' | 'open_mouth' | 'turn_left' | 'turn_right' | 'nod';

/**
 * 动作配置
 */
export interface ActionConfig {
  type: ActionType;
  nameKey: string;
  icon: string;
  threshold: number;
  duration: number;
}

/**
 * 动作检测结果
 */
export interface ActionResult {
  type: ActionType;
  completed: boolean;
  progress: number;
  failed: boolean;
}

/**
 * 活体检测状态
 */
export interface LivenessState {
  isReady: boolean;
  currentAction: ActionType | null;
  currentActionIndex: number;
  actions: ActionConfig[];
  results: ActionResult[];
  allCompleted: boolean;
  hasFailed: boolean;  // 新增：是否有失败的动作
  error: string | null;
}

// 动作配置 - 合理阈值，确保安全性和用户体验的平衡
// 注意：阈值需要配合持续检测使用，防止误检测
const ACTION_CONFIGS: Record<ActionType, Omit<ActionConfig, 'type'>> = {
  blink: {
    nameKey: 'kyc.liveness.actions.blink',
    icon: '👁️',
    threshold: 0.35, // 眨眼阈值：需要明显闭眼 (MediaPipe eyeBlink 范围 0-1)
    duration: 15000, // 15秒超时
  },
  open_mouth: {
    nameKey: 'kyc.liveness.actions.openMouth',
    icon: '👄',
    threshold: 0.25, // 张嘴阈值：需要明显张嘴 (MediaPipe jawOpen 范围 0-1)
    duration: 15000,
  },
  turn_left: {
    nameKey: 'kyc.liveness.actions.turnLeft',
    icon: '👈',
    threshold: 0.08, // 转头阈值：约 15 度
    duration: 15000,
  },
  turn_right: {
    nameKey: 'kyc.liveness.actions.turnRight',
    icon: '👉',
    threshold: 0.08,
    duration: 15000,
  },
  nod: {
    nameKey: 'kyc.liveness.actions.nod',
    icon: '👇',
    threshold: 0.06, // 点头阈值：约 10 度
    duration: 15000,
  },
};

// 动作需要持续检测到的帧数才算通过（防止误检测）
const REQUIRED_CONSECUTIVE_FRAMES = 3;

/**
 * 从 blendshapes 数组中获取指定名称的值
 * MediaPipe 返回的 blendshapes 可能有多种结构:
 * 1. Array<{ categoryName: string; score: number }>
 * 2. Array<{ categoryName: string; score: number; index: number; displayName: string }>
 */
function getBlendshapeValue(
  blendshapes: Array<{ categoryName?: string; score?: number; [key: string]: unknown }> | undefined,
  name: string
): number {
  if (!blendshapes || !Array.isArray(blendshapes) || blendshapes.length === 0) {
    return 0;
  }
  
  // 查找匹配的 blendshape
  const shape = blendshapes.find(b => {
    // 支持多种属性名
    const catName = b.categoryName || b.name || '';
    return catName === name;
  });
  
  if (!shape) return 0;
  
  // 支持多种分数属性名
  const score = shape.score ?? shape.value ?? 0;
  return typeof score === 'number' ? score : 0;
}

/**
 * 从变换矩阵计算头部旋转角度
 */
function calculateHeadPoseFromMatrix(
  matrix: number[][] | undefined
): { yaw: number; pitch: number; roll: number } {
  if (!matrix || !Array.isArray(matrix) || matrix.length < 3) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  try {
    const r02 = matrix[0]?.[2] ?? 0;
    const r10 = matrix[1]?.[0] ?? 0;
    const r11 = matrix[1]?.[1] ?? 0;
    const r12 = matrix[1]?.[2] ?? 0;
    const r22 = matrix[2]?.[2] ?? 0;

    const pitch = Math.asin(Math.max(-1, Math.min(1, -r12)));
    const yaw = Math.atan2(r02, r22);
    const roll = Math.atan2(r10, r11);

    return {
      yaw: yaw / Math.PI,
      pitch: pitch / Math.PI,
      roll: roll / Math.PI,
    };
  } catch {
    return { yaw: 0, pitch: 0, roll: 0 };
  }
}

/**
 * 随机选择动作 - 只选择最容易完成的动作
 */
function selectRandomActions(count: number = 1): ActionConfig[] {
  // 只选择最容易完成的动作：眨眼和张嘴
  // 排除转头和点头，因为这些容易受光线和角度影响
  const easyTypes: ActionType[] = ['blink', 'open_mouth'];
  const shuffled = [...easyTypes].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, easyTypes.length));

  return selected.map((type) => ({
    type,
    ...ACTION_CONFIGS[type],
  }));
}

/**
 * 活体检测 Hook - 简化版本
 */
export function useLivenessDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  _enabled: boolean = false,
  actionCount: number = 2,
  onComplete?: () => void  // 添加完成回调
) {
  const [state, setState] = useState<LivenessState>({
    isReady: false,
    currentAction: null,
    currentActionIndex: -1,
    actions: [],
    results: [],
    allCompleted: false,
    hasFailed: false,
    error: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  const landmarkerRef = useRef<unknown>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  
  // 使用 ref 存储当前动作的状态，避免闭包问题
  const currentStateRef = useRef({
    actionIndex: -1,
    actionStartTime: 0,
    actionDetected: false,
    baselinePose: null as { yaw: number; pitch: number } | null,
    consecutiveDetections: 0, // 连续检测到动作的帧数
  });

  // 初始化 Face Landmarker
  useEffect(() => {
    let mounted = true;

    async function initLandmarker() {
      try {
        setIsLoading(true);
        console.log('[LivenessDetection] Loading Face Landmarker...');
        
        const vision = await import('@mediapipe/tasks-vision');
        const { FaceLandmarker, FilesetResolver } = vision;

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });

        if (mounted) {
          landmarkerRef.current = landmarker;
          setIsLoading(false);
          console.log('[LivenessDetection] Face Landmarker loaded successfully');
        }
      } catch (err) {
        console.error('[LivenessDetection] Failed to load Face Landmarker:', err);
        if (mounted) {
          setState((prev) => ({ ...prev, error: 'Failed to load face detection model' }));
          setIsLoading(false);
        }
      }
    }

    initLandmarker();

    return () => {
      mounted = false;
      if (landmarkerRef.current) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (landmarkerRef.current as any).close?.();
        } catch (e) {
          console.error('[LivenessDetection] Error closing landmarker:', e);
        }
        landmarkerRef.current = null;
      }
    };
  }, []);

  // 检测单个动作
  const detectAction = useCallback((
    blendshapes: Array<{ categoryName: string; score: number }> | undefined,
    headPose: { yaw: number; pitch: number },
    action: ActionType,
    baseline: { yaw: number; pitch: number } | null
  ): { detected: boolean; debugInfo: string } => {
    switch (action) {
      case 'blink': {
        const leftBlink = getBlendshapeValue(blendshapes, 'eyeBlinkLeft');
        const rightBlink = getBlendshapeValue(blendshapes, 'eyeBlinkRight');
        const avgBlink = (leftBlink + rightBlink) / 2;
        const threshold = ACTION_CONFIGS.blink.threshold;
        const detected = avgBlink > threshold;
        return {
          detected,
          debugInfo: `blink: L=${leftBlink.toFixed(2)} R=${rightBlink.toFixed(2)} avg=${avgBlink.toFixed(2)} th=${threshold}`,
        };
      }

      case 'open_mouth': {
        const jawOpen = getBlendshapeValue(blendshapes, 'jawOpen');
        const mouthOpen = getBlendshapeValue(blendshapes, 'mouthOpen');
        const maxOpen = Math.max(jawOpen, mouthOpen);
        const threshold = ACTION_CONFIGS.open_mouth.threshold;
        const detected = maxOpen > threshold;
        return {
          detected,
          debugInfo: `mouth: jaw=${jawOpen.toFixed(2)} mouth=${mouthOpen.toFixed(2)} max=${maxOpen.toFixed(2)} th=${threshold}`,
        };
      }

      case 'turn_left': {
        if (!baseline) return { detected: false, debugInfo: 'turn_left: no baseline' };
        const yawDiff = headPose.yaw - baseline.yaw;
        const threshold = ACTION_CONFIGS.turn_left.threshold;
        const detected = yawDiff < -threshold;
        return {
          detected,
          debugInfo: `turn_left: yaw=${headPose.yaw.toFixed(3)} base=${baseline.yaw.toFixed(3)} diff=${yawDiff.toFixed(3)} th=-${threshold}`,
        };
      }

      case 'turn_right': {
        if (!baseline) return { detected: false, debugInfo: 'turn_right: no baseline' };
        const yawDiff = headPose.yaw - baseline.yaw;
        const threshold = ACTION_CONFIGS.turn_right.threshold;
        const detected = yawDiff > threshold;
        return {
          detected,
          debugInfo: `turn_right: yaw=${headPose.yaw.toFixed(3)} base=${baseline.yaw.toFixed(3)} diff=${yawDiff.toFixed(3)} th=${threshold}`,
        };
      }

      case 'nod': {
        if (!baseline) return { detected: false, debugInfo: 'nod: no baseline' };
        const pitchDiff = Math.abs(headPose.pitch - baseline.pitch);
        const threshold = ACTION_CONFIGS.nod.threshold;
        const detected = pitchDiff > threshold;
        return {
          detected,
          debugInfo: `nod: pitch=${headPose.pitch.toFixed(3)} base=${baseline.pitch.toFixed(3)} diff=${pitchDiff.toFixed(3)} th=${threshold}`,
        };
      }

      default:
        return { detected: false, debugInfo: 'unknown action' };
    }
  }, []);

  // 检测循环 - 使用 setInterval 而不是 requestAnimationFrame
  const runDetectionLoop = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    // 详细打印检测状态
    if (!video) {
      console.log('[LivenessDetection] ⚠️ No video element');
      return;
    }
    if (!landmarker) {
      console.log('[LivenessDetection] ⚠️ No landmarker');
      return;
    }
    if (video.readyState < 2) {
      console.log('[LivenessDetection] ⚠️ Video not ready, readyState=' + video.readyState);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = (landmarker as any).detectForVideo(video, performance.now());

      const hasBlendshapes = results.faceBlendshapes?.length > 0;
      const hasMatrix = results.facialTransformationMatrixes?.length > 0;

      if (!hasBlendshapes) {
        return;
      }

      // MediaPipe 返回的 blendshapes 结构是:
      // results.faceBlendshapes[0] = { categories: Array<{ categoryName: string; score: number; index: number }> }
      const rawBlendshapes = results.faceBlendshapes[0];
      const blendshapes = rawBlendshapes?.categories || (Array.isArray(rawBlendshapes) ? rawBlendshapes : []);
      
      // 调试：首次打印完整 blendshapes 结构和眨眼相关数据
      if (!currentStateRef.current.baselinePose) {
        console.log('[LivenessDetection] 🔍 Blendshapes raw:', rawBlendshapes);
        console.log('[LivenessDetection] 🔍 Blendshapes length:', blendshapes.length);
        if (blendshapes.length > 0) {
          console.log('[LivenessDetection] 🔍 Sample blendshape:', blendshapes[0]);
          // 查找眨眼相关的 blendshape
          const eyeBlinkLeft = blendshapes.find((b: { categoryName?: string }) => 
            b.categoryName === 'eyeBlinkLeft'
          );
          const eyeBlinkRight = blendshapes.find((b: { categoryName?: string }) => 
            b.categoryName === 'eyeBlinkRight'
          );
          console.log('[LivenessDetection] 🔍 eyeBlinkLeft:', eyeBlinkLeft);
          console.log('[LivenessDetection] 🔍 eyeBlinkRight:', eyeBlinkRight);
        }
      }

      const transformMatrix = hasMatrix ? results.facialTransformationMatrixes[0] : undefined;
      const headPose = calculateHeadPoseFromMatrix(transformMatrix);

      // 收集基线
      if (!currentStateRef.current.baselinePose) {
        currentStateRef.current.baselinePose = {
          yaw: headPose.yaw,
          pitch: headPose.pitch,
        };
        console.log('[LivenessDetection] Baseline collected:', currentStateRef.current.baselinePose);
        setState(prev => ({ ...prev, isReady: true }));
      }

      // 获取当前状态
      setState(prev => {
        // 如果已完成，直接返回不更新
        if (prev.allCompleted || currentStateRef.current.actionIndex === -999) {
          return prev;
        }
        
        const { actionIndex, actionStartTime, actionDetected, baselinePose } = currentStateRef.current;
        
        if (actionIndex < 0 || actionIndex >= prev.actions.length) {
          return prev;
        }

        const currentAction = prev.actions[actionIndex];
        if (!currentAction) return prev;

        const elapsed = performance.now() - actionStartTime;
        const progress = Math.min((elapsed / currentAction.duration) * 100, 100);

        // 检测动作
        const { detected, debugInfo } = detectAction(
          blendshapes,
          headPose,
          currentAction.type,
          baselinePose
        );

        // 更新连续检测计数
        if (detected) {
          currentStateRef.current.consecutiveDetections++;
        } else {
          currentStateRef.current.consecutiveDetections = 0;
        }

        const consecutiveCount = currentStateRef.current.consecutiveDetections;

        // 打印调试信息（降低频率）
        if (currentAction.type === 'blink' && consecutiveCount > 0) {
          console.log(`[LivenessDetection] 👁️ ${debugInfo} | consecutive: ${consecutiveCount}/${REQUIRED_CONSECUTIVE_FRAMES}`);
        } else if (Math.random() < 0.05) {
          // 其他情况每秒约打印 1-2 次
          console.log(`[LivenessDetection] ${debugInfo} | consecutive: ${consecutiveCount}/${REQUIRED_CONSECUTIVE_FRAMES}`);
        }

        // 动作检测成功：需要连续检测到指定帧数
        if (consecutiveCount >= REQUIRED_CONSECUTIVE_FRAMES && !actionDetected) {
          console.log(`[LivenessDetection] ✅ Action ${currentAction.type} CONFIRMED! (${consecutiveCount} consecutive frames)`);
          currentStateRef.current.actionDetected = true;
          currentStateRef.current.consecutiveDetections = 0;

          const newResults = [...prev.results];
          newResults[actionIndex] = {
            type: currentAction.type,
            completed: true,
            progress: 100,
            failed: false,
          };

          const nextIndex = actionIndex + 1;
          const allCompleted = nextIndex >= prev.actions.length;

          if (!allCompleted) {
            // 准备下一个动作
            currentStateRef.current.actionIndex = nextIndex;
            currentStateRef.current.actionStartTime = performance.now();
            currentStateRef.current.actionDetected = false;
            currentStateRef.current.consecutiveDetections = 0; // 重置连续计数
            console.log(`[LivenessDetection] Moving to action ${nextIndex}: ${prev.actions[nextIndex]?.type}`);
          } else {
            console.log('[LivenessDetection] 🎉 All actions completed! Stopping detection...');
            // 标记为完成，防止后续 setState 覆盖
            currentStateRef.current.actionIndex = -999; // 特殊值表示已完成
            // 立即停止检测循环
            isRunningRef.current = false;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            // 调用完成回调
            if (onComplete) {
              console.log('[LivenessDetection] 📞 Calling onComplete callback');
              setTimeout(() => onComplete(), 0);
            }
          }

          const newState = {
            ...prev,
            results: newResults,
            currentActionIndex: allCompleted ? actionIndex : nextIndex,
            currentAction: allCompleted ? null : (prev.actions[nextIndex]?.type ?? null),
            allCompleted,
            hasFailed: false,
          };
          
          console.log('[LivenessDetection] 📊 New state:', { allCompleted: newState.allCompleted, hasFailed: newState.hasFailed });
          return newState;
        }

        // 如果已经完成，不要更新状态
        if (prev.allCompleted || currentStateRef.current.actionIndex === -999) {
          return prev;
        }

        // 更新进度
        const newResults = [...prev.results];
        newResults[actionIndex] = {
          ...newResults[actionIndex],
          type: currentAction.type,
          progress,
          completed: newResults[actionIndex]?.completed ?? false,
          failed: newResults[actionIndex]?.failed ?? false,
        };

        // 超时检查
        if (progress >= 100 && !actionDetected) {
          console.log(`[LivenessDetection] ❌ Action ${currentAction.type} TIMEOUT!`);
          
          newResults[actionIndex] = {
            type: currentAction.type,
            completed: false,
            progress: 100,
            failed: true,
          };

          const nextIndex = actionIndex + 1;
          const allCompleted = nextIndex >= prev.actions.length;

          if (!allCompleted) {
            currentStateRef.current.actionIndex = nextIndex;
            currentStateRef.current.actionStartTime = performance.now();
            currentStateRef.current.actionDetected = false;
            console.log(`[LivenessDetection] Moving to action ${nextIndex}: ${prev.actions[nextIndex]?.type}`);
          } else {
            console.log('[LivenessDetection] All actions processed (with failures)');
            isRunningRef.current = false;
          }

          return {
            ...prev,
            results: newResults,
            currentActionIndex: allCompleted ? actionIndex : nextIndex,
            currentAction: allCompleted ? null : (prev.actions[nextIndex]?.type ?? null),
            allCompleted,
            hasFailed: true,
          };
        }

        return {
          ...prev,
          results: newResults,
        };
      });
    } catch (err) {
      console.error('[LivenessDetection] Detection error:', err);
    }
  }, [videoRef, detectAction]);

  // 开始检测
  const startDetection = useCallback(() => {
    console.log('[LivenessDetection] startDetection called');
    
    if (isRunningRef.current) {
      console.log('[LivenessDetection] Already running, ignoring');
      return;
    }
    
    if (!landmarkerRef.current) {
      console.log('[LivenessDetection] Landmarker not ready');
      return;
    }

    // 清理之前的 interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const actions = selectRandomActions(actionCount);
    const results: ActionResult[] = actions.map((a) => ({
      type: a.type,
      completed: false,
      progress: 0,
      failed: false,
    }));

    console.log('[LivenessDetection] Starting with actions:', actions.map(a => a.type));
    
    // 重置状态
    currentStateRef.current = {
      actionIndex: 0,
      actionStartTime: performance.now(),
      actionDetected: false,
      baselinePose: null,
      consecutiveDetections: 0,
    };

    setState({
      isReady: false,
      currentAction: actions[0]?.type ?? null,
      currentActionIndex: 0,
      actions,
      results,
      allCompleted: false,
      hasFailed: false,
      error: null,
    });

    isRunningRef.current = true;

    // 使用 setInterval 进行检测，每 100ms 一次
    intervalRef.current = setInterval(() => {
      if (isRunningRef.current) {
        runDetectionLoop();
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 100);
  }, [actionCount, runDetectionLoop]);

  // 停止检测
  const stopDetection = useCallback(() => {
    console.log('[LivenessDetection] stopDetection called');
    isRunningRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 重置
  const reset = useCallback(() => {
    console.log('[LivenessDetection] 🔄 reset called - clearing all state');
    stopDetection();
    currentStateRef.current = {
      actionIndex: -1,
      actionStartTime: 0,
      actionDetected: false,
      baselinePose: null,
    };
    setState({
      isReady: false,
      currentAction: null,
      currentActionIndex: -1,
      actions: [],
      results: [],
      allCompleted: false,
      hasFailed: false,
      error: null,
    });
    console.log('[LivenessDetection] 🔄 reset complete');
  }, [stopDetection]);

  // 清理
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    state,
    isLoading,
    startDetection,
    stopDetection,
    reset,
  };
}
