'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 人脸检测结果
 */
export interface FaceDetectionResult {
  /** 是否检测到人脸 */
  detected: boolean;
  /** 人脸是否在椭圆框内 */
  isInFrame: boolean;
  /** 人脸边界框 */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /** 检测置信度 */
  confidence: number;
  /** 人脸大小状态 */
  sizeStatus: 'ok' | 'too_small' | 'too_large' | 'unknown';
}

// 全局事件发射器 - 用于跨组件通信
type FaceDetectionListener = (result: FaceDetectionResult) => void;
const globalListeners = new Map<string, Set<FaceDetectionListener>>();

export function subscribeFaceDetection(instanceId: string, listener: FaceDetectionListener): () => void {
  if (!globalListeners.has(instanceId)) {
    globalListeners.set(instanceId, new Set());
  }
  globalListeners.get(instanceId)!.add(listener);
  console.log('[FaceDetection] [' + instanceId + '] Subscriber added, total:', globalListeners.get(instanceId)!.size);
  
  return () => {
    globalListeners.get(instanceId)?.delete(listener);
    console.log('[FaceDetection] [' + instanceId + '] Subscriber removed');
  };
}

function emitFaceDetection(instanceId: string, result: FaceDetectionResult) {
  const listeners = globalListeners.get(instanceId);
  if (listeners) {
    console.log('[FaceDetection] [' + instanceId + '] Emitting to', listeners.size, 'listeners');
    listeners.forEach(listener => {
      try {
        listener(result);
      } catch (e) {
        console.error('[FaceDetection] Listener error:', e);
      }
    });
  }
}

/**
 * 椭圆框边界配置
 */
export interface OvalBounds {
  /** 椭圆中心 X (相对于视频宽度的比例 0-1) */
  centerX: number;
  /** 椭圆中心 Y (相对于视频高度的比例 0-1) */
  centerY: number;
  /** 椭圆 X 半径 (相对于视频宽度的比例) */
  radiusX: number;
  /** 椭圆 Y 半径 (相对于视频高度的比例) */
  radiusY: number;
}

// 默认椭圆框配置
const DEFAULT_OVAL_BOUNDS: OvalBounds = {
  centerX: 0.5,
  centerY: 0.45,  // 稍微下移，更符合人脸自然位置
  radiusX: 0.25,  // 缩小水平半径，要求人脸更居中
  radiusY: 0.35,  // 缩小垂直半径
};

// 人脸大小阈值
const FACE_SIZE_THRESHOLDS = {
  minWidth: 0.15,
  maxWidth: 0.55,
  minHeight: 0.18,
  maxHeight: 0.65,
};

/**
 * 人脸检测 Hook
 * 使用 MediaPipe Face Detection 实时检测人脸位置
 * 使用全局事件发射器确保状态变化能被组件接收
 */
export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  ovalBounds: OvalBounds = DEFAULT_OVAL_BOUNDS
) {
  // 生成唯一 ID 用于调试
  const hookIdRef = useRef(Math.random().toString(36).slice(2, 11));
  const hookId = hookIdRef.current;
  
  // 使用 useState 管理结果
  const [result, setResult] = useState<FaceDetectionResult>({
    detected: false,
    isInFrame: false,
    boundingBox: null,
    confidence: 0,
    sizeStatus: 'unknown',
  });
  
  // 订阅全局事件
  useEffect(() => {
    console.log('[FaceDetection] [' + hookId + '] Setting up subscription');
    const unsubscribe = subscribeFaceDetection(hookId, (newResult) => {
      console.log('[FaceDetection] [' + hookId + '] Received event, calling setResult');
      setResult(newResult);
    });
    return unsubscribe;
  }, [hookId]);
  
  // 保存上一次结果用于比较
  const lastResultRef = useRef({ detected: false, isInFrame: false, sizeStatus: 'unknown' as string });
  
  console.log('[FaceDetection] Hook render, instance:', hookId, 'result.detected:', result.detected, 'result.isInFrame:', result.isInFrame);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 使用 any 类型避免 TypeScript 类型问题
  const detectorRef = useRef<unknown>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  
  // 保存 checkFaceInOval 的最新引用 - 初始化为 null，稍后设置
  const checkFaceInOvalRef = useRef<((
    bbox: { originX: number; originY: number; width: number; height: number },
    videoWidth: number,
    videoHeight: number
  ) => { isInFrame: boolean; sizeStatus: 'ok' | 'too_small' | 'too_large' }) | null>(null);

  // 检查人脸大小状态
  const checkFaceSize = useCallback(
    (faceWidthRatio: number, faceHeightRatio: number): 'ok' | 'too_small' | 'too_large' => {
      if (
        faceWidthRatio < FACE_SIZE_THRESHOLDS.minWidth ||
        faceHeightRatio < FACE_SIZE_THRESHOLDS.minHeight
      ) {
        return 'too_small';
      }
      if (
        faceWidthRatio > FACE_SIZE_THRESHOLDS.maxWidth ||
        faceHeightRatio > FACE_SIZE_THRESHOLDS.maxHeight
      ) {
        return 'too_large';
      }
      return 'ok';
    },
    []
  );

  // 检查人脸是否在椭圆框内
  const checkFaceInOval = useCallback(
    (
      bbox: { originX: number; originY: number; width: number; height: number },
      videoWidth: number,
      videoHeight: number
    ): { isInFrame: boolean; sizeStatus: 'ok' | 'too_small' | 'too_large' } => {
      // 计算人脸中心点 (归一化到 0-1)
      const faceCenterX = (bbox.originX + bbox.width / 2) / videoWidth;
      const faceCenterY = (bbox.originY + bbox.height / 2) / videoHeight;

      // 椭圆方程: (x-h)²/a² + (y-k)²/b² <= 1
      const { centerX, centerY, radiusX, radiusY } = ovalBounds;
      const normalized =
        Math.pow(faceCenterX - centerX, 2) / Math.pow(radiusX, 2) +
        Math.pow(faceCenterY - centerY, 2) / Math.pow(radiusY, 2);

      // 检查人脸大小
      const faceWidthRatio = bbox.width / videoWidth;
      const faceHeightRatio = bbox.height / videoHeight;
      const sizeStatus = checkFaceSize(faceWidthRatio, faceHeightRatio);

      // 人脸中心在椭圆内且大小合适
      // normalized <= 0.7 表示人脸中心必须在椭圆内部 70% 区域内
      const isInFrame = normalized <= 0.7 && sizeStatus === 'ok';

      return { isInFrame, sizeStatus };
    },
    [ovalBounds, checkFaceSize]
  );
  
  // 保持 checkFaceInOval ref 更新
  useEffect(() => {
    checkFaceInOvalRef.current = checkFaceInOval;
  }, [checkFaceInOval]);

  // 初始化 Face Detector - 始终加载模型，不依赖 enabled
  useEffect(() => {
    let mounted = true;

    async function initDetector() {
      try {
        setIsLoading(true);
        // 动态导入 MediaPipe
        const vision = await import('@mediapipe/tasks-vision');
        const { FaceDetector, FilesetResolver } = vision;

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const detector = await FaceDetector.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        });

        if (mounted) {
          detectorRef.current = detector;
          setIsLoading(false);
          setError(null);
          console.log('[FaceDetection] Model loaded successfully');
        }
      } catch (err) {
        console.error('Failed to load face detection model:', err);
        if (mounted) {
          setError('Failed to load face detection model');
          setIsLoading(false);
        }
      }
    }

    initDetector();

    return () => {
      mounted = false;
      if (detectorRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (detectorRef.current as any).close?.();
        detectorRef.current = null;
      }
    };
  }, []); // 只在组件挂载时加载一次

  // 实时检测循环 - 使用 setState 更新状态
  const detectFaces = useCallback(() => {
    if (!isRunningRef.current) return;

    const video = videoRef.current;
    const detector = detectorRef.current;

    if (!video || !detector || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detections = (detector as any).detectForVideo(video, performance.now());

      if (detections.detections && detections.detections.length > 0) {
        const face = detections.detections[0];
        const bbox = face.boundingBox;

        if (bbox) {
          // 使用 ref 获取最新的 checkFaceInOval 函数
          if (!checkFaceInOvalRef.current) {
            animationFrameRef.current = requestAnimationFrame(detectFaces);
            return;
          }
          
          const { isInFrame, sizeStatus } = checkFaceInOvalRef.current(
            bbox,
            video.videoWidth,
            video.videoHeight
          );

          // 检查是否有变化
          const hasChanged = 
            lastResultRef.current.detected !== true ||
            lastResultRef.current.isInFrame !== isInFrame ||
            lastResultRef.current.sizeStatus !== sizeStatus;

          if (hasChanged) {
            console.log('[FaceDetection] [' + hookId + '] State CHANGED:', {
              from: lastResultRef.current,
              to: { detected: true, isInFrame, sizeStatus }
            });
            
            lastResultRef.current = { detected: true, isInFrame, sizeStatus };
            
            const newResult: FaceDetectionResult = {
              detected: true,
              isInFrame,
              boundingBox: {
                x: bbox.originX,
                y: bbox.originY,
                width: bbox.width,
                height: bbox.height,
              },
              confidence: face.categories?.[0]?.score || 0,
              sizeStatus,
            };
            
            // 通过全局事件发射器通知
            emitFaceDetection(hookId, newResult);
          }
        }
      } else {
        // 没有检测到人脸
        if (lastResultRef.current.detected !== false) {
          console.log('[FaceDetection] [' + hookId + '] No face detected (was detected before)');
          lastResultRef.current = { detected: false, isInFrame: false, sizeStatus: 'unknown' };
          
          emitFaceDetection(hookId, {
            detected: false,
            isInFrame: false,
            boundingBox: null,
            confidence: 0,
            sizeStatus: 'unknown',
          });
        }
      }
    } catch (err) {
      console.error('Face detection error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(detectFaces);
  }, [videoRef, hookId]); // 依赖 videoRef 和 hookId

  // 启动检测
  const startDetection = useCallback(() => {
    console.log('[FaceDetection] startDetection called', {
      isRunning: isRunningRef.current,
      hasDetector: !!detectorRef.current,
      isLoading,
    });
    if (!isRunningRef.current && detectorRef.current) {
      isRunningRef.current = true;
      detectFaces();
    } else if (!detectorRef.current && !isLoading) {
      console.warn('[FaceDetection] Detector not ready yet');
    }
  }, [detectFaces, isLoading]);

  // 停止检测
  const stopDetection = useCallback(() => {
    isRunningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    result,
    isLoading,
    error,
    startDetection,
    stopDetection,
  };
}
