'use client';

import type { LivenessAction as ActionType } from '@sssxyd/face-liveness-detector';
import { useRef, useEffect, useState, useCallback } from 'react';

// Re-export types for convenience
export type { LivenessAction as ActionType } from '@sssxyd/face-liveness-detector';

/**
 * 检测状态码
 */
export type DetectionCode =
  | 'VIDEO_NO_FACE'
  | 'MULTIPLE_FACE'
  | 'FACE_TOO_SMALL'
  | 'FACE_TOO_LARGE'
  | 'FACE_NOT_FRONTAL'
  | 'FACE_LOW_QUALITY'
  | 'FACE_IMAGE_CAPTURED'
  | 'FACE_NOT_MOVING'
  | 'PHOTO_ATTACK_DETECTED'
  | 'READY';

/**
 * 静默活体检测状态
 */
export interface SilentLivenessState {
  isReady: boolean;
  isLoading: boolean;
  isDetecting: boolean;
  allCompleted: boolean;
  hasFailed: boolean;
  error: string | null;
  
  // 实时检测信息
  detectionCode: DetectionCode | null;
  detectionMessage: string;
  faceRatio: number;
  faceFrontal: number;
  imageQuality: number;
  motionScore: number;
  
  // 当前动作（如果启用动作检测）
  currentAction: ActionType | null;
  actionStatus: 'started' | 'completed' | 'timeout' | null;
  
  // 结果
  bestFrameImage: string | null;
  bestFaceImage: string | null;
  bestQualityScore: number;
  totalTime: number;
}

/**
 * Hook 配置选项
 */
export interface SilentLivenessOptions {
  /** 动作数量，0 = 纯静默检测 */
  actionCount?: number;
  /** 单个动作超时时间 */
  actionTimeout?: number;
  /** 启用照片攻击检测 */
  enablePhotoAttackDetection?: boolean;
  /** 照片攻击检测通过所需帧数 */
  photoAttackPassedFrameCount?: number;
  /** 最小人脸占比 */
  minFaceRatio?: number;
  /** 最大人脸占比 */
  maxFaceRatio?: number;
  /** 最小正对度 */
  minFaceFrontal?: number;
  /** 最小图像质量 */
  minImageQuality?: number;
  /** 模型路径 */
  modelPath?: string;
  /** WASM 路径 */
  wasmPath?: string;
  /** 视频宽度 */
  videoWidth?: number;
  /** 视频高度 */
  videoHeight?: number;
}

const DEFAULT_OPTIONS: Required<SilentLivenessOptions> = {
  actionCount: 0, // 默认纯静默检测
  actionTimeout: 15000,
  enablePhotoAttackDetection: true,
  photoAttackPassedFrameCount: 10,
  minFaceRatio: 0.3,
  maxFaceRatio: 0.9,
  minFaceFrontal: 0.7,
  minImageQuality: 0.4,
  modelPath: '/models',
  wasmPath: '/wasm',
  videoWidth: 1280,
  videoHeight: 720,
};

const INITIAL_STATE: SilentLivenessState = {
  isReady: false,
  isLoading: true,
  isDetecting: false,
  allCompleted: false,
  hasFailed: false,
  error: null,
  detectionCode: null,
  detectionMessage: '',
  faceRatio: 0,
  faceFrontal: 0,
  imageQuality: 0,
  motionScore: 0,
  currentAction: null,
  actionStatus: null,
  bestFrameImage: null,
  bestFaceImage: null,
  bestQualityScore: 0,
  totalTime: 0,
};

/**
 * 静默活体检测 Hook
 * 基于 @sssxyd/face-liveness-detector
 */
export function useSilentLiveness(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: SilentLivenessOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<SilentLivenessState>(INITIAL_STATE);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engineRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const mountedRef = useRef(true);

  // 初始化引擎
  const initializeEngine = useCallback(async () => {
    if (isInitializedRef.current || engineRef.current) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // 动态导入以支持 SSR
      const { default: FaceDetectionEngine } = await import('@sssxyd/face-liveness-detector');
      
      const engine = new FaceDetectionEngine({
        human_model_path: opts.modelPath,
        tensorflow_wasm_path: opts.wasmPath,
        
        detect_video_ideal_width: opts.videoWidth,
        detect_video_ideal_height: opts.videoHeight,
        detect_video_mirror: true,
        
        // 静默活体检测配置
        action_liveness_action_count: opts.actionCount,
        action_liveness_verify_timeout: opts.actionTimeout,
        
        // 照片攻击检测
        enable_photo_attack_detection: opts.enablePhotoAttackDetection,
        photo_attack_passed_frame_count: opts.photoAttackPassedFrameCount,
        
        // 人脸采集质量要求（放宽条件提高成功率）
        collect_min_face_ratio: opts.minFaceRatio,
        collect_max_face_ratio: opts.maxFaceRatio,
        collect_min_face_frontal: opts.minFaceFrontal,
        collect_min_image_quality: opts.minImageQuality,
        collect_min_collect_count: 3,
        
        // 调试模式
        debug_mode: process.env.NODE_ENV === 'development',
      });

      // 监听事件
      engine.on('detector-loaded', (data: { success: boolean; error?: string; opencv_version?: string; human_version?: string }) => {
        if (!mountedRef.current) return;
        
        if (data.success) {
          console.log('[SilentLiveness] Engine loaded:', { opencv: data.opencv_version, human: data.human_version });
          setState(prev => ({ ...prev, isReady: true, isLoading: false }));
        } else {
          console.error('[SilentLiveness] Engine load failed:', data.error);
          setState(prev => ({ ...prev, isLoading: false, error: data.error || 'Failed to load detection engine' }));
        }
      });

      engine.on('detector-info', (data: {
        passed: boolean;
        code: DetectionCode;
        message: string;
        faceRatio: number;
        faceFrontal: number;
        imageQuality: number;
        motionScore: number;
      }) => {
        if (!mountedRef.current) return;
        
        setState(prev => ({
          ...prev,
          detectionCode: data.code,
          detectionMessage: data.message,
          faceRatio: data.faceRatio,
          faceFrontal: data.faceFrontal,
          imageQuality: data.imageQuality,
          motionScore: data.motionScore,
        }));
      });

      engine.on('detector-action', (data) => {
        if (!mountedRef.current) return;

        const actionStatus =
          data.status === 'started' || data.status === 'completed' || data.status === 'timeout'
            ? data.status
            : null;
        
        console.log('[SilentLiveness] Action:', data);
        setState(prev => ({
          ...prev,
          currentAction: data.action,
          actionStatus,
        }));
      });

      engine.on('detector-finish', (data: {
        success: boolean;
        silentPassedCount: number;
        actionPassedCount: number;
        totalTime: number;
        bestQualityScore: number;
        bestFrameImage: string | null;
        bestFaceImage: string | null;
      }) => {
        if (!mountedRef.current) return;
        
        console.log('[SilentLiveness] Finish:', { success: data.success, quality: data.bestQualityScore });
        setState(prev => ({
          ...prev,
          isDetecting: false,
          allCompleted: true,
          hasFailed: !data.success,
          bestFrameImage: data.bestFrameImage,
          bestFaceImage: data.bestFaceImage,
          bestQualityScore: data.bestQualityScore,
          totalTime: data.totalTime,
        }));
      });

      engine.on('detector-error', (error: { code: string; message: string }) => {
        if (!mountedRef.current) return;
        
        console.error('[SilentLiveness] Error:', error);
        setState(prev => ({
          ...prev,
          isDetecting: false,
          hasFailed: true,
          error: error.message,
        }));
      });

      // 初始化
      await engine.initialize();
      
      if (mountedRef.current) {
        engineRef.current = engine;
        isInitializedRef.current = true;
      }
    } catch (err) {
      console.error('[SilentLiveness] Init error:', err);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to initialize detection engine',
        }));
      }
    }
  }, [opts.modelPath, opts.wasmPath, opts.videoWidth, opts.videoHeight, opts.actionCount, opts.actionTimeout, opts.enablePhotoAttackDetection, opts.photoAttackPassedFrameCount, opts.minFaceRatio, opts.maxFaceRatio, opts.minFaceFrontal, opts.minImageQuality]);

  // 开始检测
  const startDetection = useCallback(async () => {
    if (!engineRef.current || !videoRef.current) {
      console.warn('[SilentLiveness] Cannot start: engine or video not ready');
      return;
    }

    if (state.isDetecting) {
      console.warn('[SilentLiveness] Already detecting');
      return;
    }

    try {
      console.log('[SilentLiveness] Starting detection...');
      setState(prev => ({
        ...prev,
        isDetecting: true,
        allCompleted: false,
        hasFailed: false,
        error: null,
        currentAction: null,
        actionStatus: null,
        bestFrameImage: null,
        bestFaceImage: null,
      }));
      
      await engineRef.current.startDetection(videoRef.current);
    } catch (err) {
      console.error('[SilentLiveness] Start error:', err);
      setState(prev => ({
        ...prev,
        isDetecting: false,
        error: err instanceof Error ? err.message : 'Failed to start detection',
      }));
    }
  }, [videoRef, state.isDetecting]);

  // 停止检测
  const stopDetection = useCallback((success: boolean = false) => {
    if (engineRef.current) {
      try {
        engineRef.current.stopDetection(success);
      } catch (e) {
        console.error('[SilentLiveness] Stop error:', e);
      }
    }
    setState(prev => ({ ...prev, isDetecting: false }));
  }, []);

  // 重置
  const reset = useCallback(() => {
    stopDetection(false);
    setState(INITIAL_STATE);
    // 保持引擎就绪状态
    if (engineRef.current && isInitializedRef.current) {
      setState(prev => ({ ...prev, isReady: true, isLoading: false }));
    }
  }, [stopDetection]);

  // 组件挂载时初始化
  useEffect(() => {
    mountedRef.current = true;
    initializeEngine();
    
    return () => {
      mountedRef.current = false;
      stopDetection(false);
    };
  }, [initializeEngine, stopDetection]);

  return {
    state,
    isLoading: state.isLoading,
    isReady: state.isReady,
    startDetection,
    stopDetection,
    reset,
  };
}

/**
 * 获取检测状态的中文描述
 */
export function getDetectionMessage(code: DetectionCode | null): string {
  const messages: Record<DetectionCode, string> = {
    VIDEO_NO_FACE: 'No face detected',
    MULTIPLE_FACE: 'Multiple faces detected',
    FACE_TOO_SMALL: 'Move closer',
    FACE_TOO_LARGE: 'Move back a little',
    FACE_NOT_FRONTAL: 'Look at the camera',
    FACE_LOW_QUALITY: 'Low light detected, please adjust',
    FACE_IMAGE_CAPTURED: 'Verifying...',
    FACE_NOT_MOVING: 'Move slightly',
    PHOTO_ATTACK_DETECTED: 'Non-live face detected',
    READY: 'Detecting...',
  };
  return code ? messages[code] || 'Detecting...' : 'Preparing...';
}

/**
 * 获取动作的中文名称
 */
export function getActionName(action: ActionType | null): string {
  if (!action) return '';
  const names: Record<ActionType, string> = {
    blink: 'Blink your eyes',
    mouth_open: 'Open your mouth',
    nod_down: 'Nod down',
    nod_up: 'Lift your head',
  };
  return names[action] || action;
}

/**
 * 获取动作图标
 */
export function getActionIcon(action: ActionType | null): string {
  if (!action) return '';
  const icons: Record<ActionType, string> = {
    blink: '👁️',
    mouth_open: '👄',
    nod_down: '👇',
    nod_up: '👆',
  };
  return icons[action] || '👤';
}
