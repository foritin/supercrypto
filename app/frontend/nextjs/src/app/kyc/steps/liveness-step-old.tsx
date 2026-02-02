'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKycContext } from '@/contexts/kyc-context';
import { ArrowLeft, ArrowRight, Shield, AlertCircle, ChevronLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLivenessDetection, ActionType } from '@/hooks/use-liveness-detection';

type VerificationPhase = 'photo' | 'liveness' | 'complete';

// 椭圆框配置
const OVAL_BOUNDS = {
  centerX: 0.5,
  centerY: 0.45,
  radiusX: 0.25,
  radiusY: 0.35,
};

// 人脸大小阈值
const FACE_SIZE_THRESHOLDS = {
  minWidth: 0.15,
  maxWidth: 0.55,
  minHeight: 0.18,
  maxHeight: 0.65,
};

// 人脸检测状态类型
interface FaceDetectionState {
  detected: boolean;
  inFrame: boolean;
  sizeStatus: 'ok' | 'too_small' | 'too_large' | 'unknown';
  loading: boolean;
  error: string | null;
}

// 人脸检测 reducer action
type FaceDetectionAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'UPDATE_DETECTION'; detected: boolean; inFrame: boolean; sizeStatus: 'ok' | 'too_small' | 'too_large' | 'unknown' }
  | { type: 'RESET' };

// 人脸检测 reducer
function faceDetectionReducer(state: FaceDetectionState, action: FaceDetectionAction): FaceDetectionState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'UPDATE_DETECTION':
      return { ...state, detected: action.detected, inFrame: action.inFrame, sizeStatus: action.sizeStatus };
    case 'RESET':
      return { detected: false, inFrame: false, sizeStatus: 'unknown', loading: false, error: null };
    default:
      return state;
  }
}

export function LivenessStep() {
  // 标记新代码版本
  React.useEffect(() => {
    console.log('🚀🚀🚀 NEW LIVENESS STEP CODE v5 - Fixed detection 🚀🚀🚀');
  }, []);

  const { t } = useTranslation();
  const { formData, updateFormData, showLandingPage, nextStep, prevStep, saveDraft } = useKycContext();

  // 活体检测不缓存，每次都需要重新验证
  // 只有照片可以缓存
  const [phase, setPhase] = React.useState<VerificationPhase>(() => {
    // 如果有照片，直接进入活体检测阶段（不管之前是否验证过）
    if (formData.faceImage) return 'liveness';
    return 'photo';
  });

  const [cameraPermission, setCameraPermission] = React.useState<'pending' | 'granted' | 'denied'>('pending');
  const [capturedImage, setCapturedImage] = React.useState<string | null>(formData.faceImage || null);
  const [cameraReady, setCameraReady] = React.useState(false);
  // 活体检测状态不从缓存读取，每次都需要重新验证
  const [livenessVerified, setLivenessVerified] = React.useState(false);

  // 自动拍照倒计时状态
  const [autoCountdown, setAutoCountdown] = React.useState<number>(0);
  const [countdownProgress, setCountdownProgress] = React.useState<number>(0);
  const autoTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // 视频元素回调 - 确保流正确绑定
  const setVideoRef = React.useCallback((node: HTMLVideoElement | null) => {
    if (node && streamRef.current) {
      console.log('[LivenessStep] Video ref callback - binding stream v3');
      node.srcObject = streamRef.current;
      node.play().catch(e => console.error('Video play error:', e));
    }
    // 更新 ref
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
  }, []);

  // 使用 useReducer 管理人脸检测状态
  const [faceState, dispatchFace] = React.useReducer(faceDetectionReducer, {
    detected: false, inFrame: false, sizeStatus: 'unknown', loading: true, error: null,
  });

  const detectorRef = React.useRef<unknown>(null);
  const detectionIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const isDetectionRunningRef = React.useRef(false);
  const lastDetectionRef = React.useRef({ detected: false, isInFrame: false, sizeStatus: 'unknown' });

  const { detected: faceDetected, inFrame: faceInFrame, sizeStatus: faceSizeStatus, loading: faceDetectionLoading, error: faceDetectionError } = faceState;

  console.log('[LivenessStep] RENDER v3 - faceDetected=' + faceDetected + ' faceInFrame=' + faceInFrame);

  // 初始化人脸检测器
  React.useEffect(() => {
    let mounted = true;
    async function initDetector() {
      try {
        dispatchFace({ type: 'SET_LOADING', loading: true });
        const vision = await import('@mediapipe/tasks-vision');
        const { FaceDetector, FilesetResolver } = vision;
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const detector = await FaceDetector.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        });
        if (mounted) {
          detectorRef.current = detector;
          dispatchFace({ type: 'SET_LOADING', loading: false });
          console.log('[LivenessStep] Face detection model loaded v3');
        }
      } catch (err) {
        console.error('Failed to load face detection model:', err);
        if (mounted) dispatchFace({ type: 'SET_ERROR', error: 'Failed to load face detection model' });
      }
    }
    initDetector();
    return () => {
      mounted = false;
      if (detectorRef.current) {
        (detectorRef.current as { close?: () => void }).close?.();
        detectorRef.current = null;
      }
    };
  }, []);

  // 检查人脸是否在椭圆框内
  const checkFaceInOval = React.useCallback((
    bbox: { originX: number; originY: number; width: number; height: number },
    videoWidth: number, videoHeight: number
  ) => {
    const faceCenterX = (bbox.originX + bbox.width / 2) / videoWidth;
    const faceCenterY = (bbox.originY + bbox.height / 2) / videoHeight;
    const { centerX, centerY, radiusX, radiusY } = OVAL_BOUNDS;
    const normalized = Math.pow(faceCenterX - centerX, 2) / Math.pow(radiusX, 2) +
      Math.pow(faceCenterY - centerY, 2) / Math.pow(radiusY, 2);
    const faceWidthRatio = bbox.width / videoWidth;
    const faceHeightRatio = bbox.height / videoHeight;
    let sizeStatus: 'ok' | 'too_small' | 'too_large' = 'ok';
    if (faceWidthRatio < FACE_SIZE_THRESHOLDS.minWidth || faceHeightRatio < FACE_SIZE_THRESHOLDS.minHeight) {
      sizeStatus = 'too_small';
    } else if (faceWidthRatio > FACE_SIZE_THRESHOLDS.maxWidth || faceHeightRatio > FACE_SIZE_THRESHOLDS.maxHeight) {
      sizeStatus = 'too_large';
    }
    const isInFrame = normalized <= 0.7 && sizeStatus === 'ok';
    return { isInFrame, sizeStatus };
  }, []);

  // 人脸检测函数
  const detectFaces = React.useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) return;
    try {
      const detections = (detector as { detectForVideo: (v: HTMLVideoElement, t: number) => { detections: Array<{ boundingBox?: { originX: number; originY: number; width: number; height: number } }> } }).detectForVideo(video, performance.now());
      if (detections.detections && detections.detections.length > 0) {
        const face = detections.detections[0];
        if (!face) return;
        const bbox = face.boundingBox;
        if (bbox) {
          const { isInFrame, sizeStatus } = checkFaceInOval(bbox, video.videoWidth, video.videoHeight);
          const hasChanged = lastDetectionRef.current.detected !== true ||
            lastDetectionRef.current.isInFrame !== isInFrame ||
            lastDetectionRef.current.sizeStatus !== sizeStatus;
          if (hasChanged) {
            console.log('[LivenessStep] Face CHANGED v3:', { detected: true, isInFrame, sizeStatus });
            lastDetectionRef.current = { detected: true, isInFrame, sizeStatus };
            dispatchFace({ type: 'UPDATE_DETECTION', detected: true, inFrame: isInFrame, sizeStatus });
          }
        }
      } else {
        if (lastDetectionRef.current.detected !== false) {
          console.log('[LivenessStep] No face v3');
          lastDetectionRef.current = { detected: false, isInFrame: false, sizeStatus: 'unknown' };
          dispatchFace({ type: 'UPDATE_DETECTION', detected: false, inFrame: false, sizeStatus: 'unknown' });
        }
      }
    } catch (err) {
      console.error('Face detection error:', err);
    }
  }, [checkFaceInOval]);

  const startFaceDetection = React.useCallback(() => {
    console.log('[LivenessStep] startFaceDetection v3');
    if (!isDetectionRunningRef.current && detectorRef.current) {
      isDetectionRunningRef.current = true;
      detectionIntervalRef.current = setInterval(detectFaces, 100);
    }
  }, [detectFaces]);

  const stopFaceDetection = React.useCallback(() => {
    isDetectionRunningRef.current = false;
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  // 活体检测完成的处理函数
  const handleLivenessComplete = React.useCallback(() => {
    console.log('[LivenessStep] 🎉 handleLivenessComplete called!');
    setLivenessVerified(true);
    updateFormData({ livenessVerified: true });
    setPhase('complete');
    // 停止摄像头
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    toast.success(t('kyc.liveness.success'));
  }, [updateFormData, t]);

  // 只需要完成 1 个简单动作（眨眼或张嘴），传入完成回调
  const { state: livenessState, isLoading: livenessLoading, startDetection: startLivenessDetection, stopDetection: stopLivenessDetection, reset: resetLiveness } = useLivenessDetection(videoRef, phase === 'liveness', 1, handleLivenessComplete);

  const requestCameraAccess = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
      setCameraPermission('granted');
    } catch (err) {
      console.error('Camera access denied:', err);
      setCameraPermission('denied');
      toast.error(t('kyc.liveness.cameraDenied'));
    }
  }, [t]);

  const stopCamera = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // 摄像头效果
  React.useEffect(() => {
    console.log('[LivenessStep] Camera effect v3:', { phase, capturedImage: !!capturedImage, hasStream: !!streamRef.current, cameraReady });
    if ((phase === 'photo' && !capturedImage) || phase === 'liveness') {
      if (!streamRef.current) {
        console.log('[LivenessStep] No stream, requesting camera v3');
        requestCameraAccess();
      } else {
        // 确保视频元素绑定到流
        if (videoRef.current) {
          if (videoRef.current.srcObject !== streamRef.current) {
            console.log('[LivenessStep] Rebinding video to stream v3');
            videoRef.current.srcObject = streamRef.current;
          }
          // 确保视频正在播放
          if (videoRef.current.paused) {
            console.log('[LivenessStep] Video paused, playing v3');
            videoRef.current.play().catch(e => console.error('Video play error:', e));
          }
        }
        if (!cameraReady) {
          console.log('[LivenessStep] Setting cameraReady true v3');
          setCameraReady(true);
        }
      }
    }
  }, [phase, capturedImage, requestCameraAccess, cameraReady]);

  // 组件卸载清理
  React.useEffect(() => {
    return () => { stopCamera(); stopFaceDetection(); stopLivenessDetection(); };
  }, [stopCamera, stopFaceDetection, stopLivenessDetection]);

  // 启动人脸检测
  React.useEffect(() => {
    if (phase === 'photo' && cameraReady && !capturedImage && !faceDetectionLoading) {
      console.log('[LivenessStep] Starting face detection v3');
      startFaceDetection();
    }
  }, [phase, cameraReady, capturedImage, faceDetectionLoading, startFaceDetection]);

  // 活体检测阶段
  React.useEffect(() => {
    console.log('[LivenessStep] Liveness effect v3:', { phase, cameraReady, livenessLoading, allCompleted: livenessState.allCompleted, isReady: livenessState.isReady });
    if (phase === 'liveness' && cameraReady && !livenessLoading && !livenessState.allCompleted) {
      console.log('[LivenessStep] Starting liveness detection v3');
      startLivenessDetection();
    }
  }, [phase, cameraReady, livenessLoading, livenessState.allCompleted, startLivenessDetection]);

  // 活体检测完成
  React.useEffect(() => {
    console.log('[LivenessStep] 🔔 Completion check:', { 
      allCompleted: livenessState.allCompleted, 
      hasFailed: livenessState.hasFailed,
      results: livenessState.results,
    });
    
    if (livenessState.allCompleted && !livenessState.hasFailed) {
      console.log('[LivenessStep] ✅ All actions completed successfully! Transitioning to complete phase...');
      // 所有动作都成功完成
      setLivenessVerified(true);
      updateFormData({ livenessVerified: true });
      setPhase('complete');
      stopCamera();
      toast.success(t('kyc.liveness.success'));
    }
  }, [livenessState.allCompleted, livenessState.hasFailed, livenessState.results, updateFormData, stopCamera, t]);

  const getFrameColor = () => {
    if (!faceDetected) return 'border-white/50';
    if (!faceInFrame) return 'border-amber-400';
    return 'border-[#00D4AA]';
  };

  const getInstructionText = () => {
    if (faceDetectionLoading) return t('kyc.liveness.faceDetection.loading');
    if (faceDetectionError) return t('kyc.liveness.centerFace');
    if (!faceDetected) return t('kyc.liveness.faceDetection.noFace');
    if (faceSizeStatus === 'too_small') return t('kyc.liveness.faceDetection.tooFar');
    if (faceSizeStatus === 'too_large') return t('kyc.liveness.faceDetection.tooClose');
    if (!faceInFrame) return t('kyc.liveness.faceDetection.notInFrame');
    if (autoCountdown > 0) return t('kyc.liveness.faceDetection.autoCapture', '{{seconds}} 秒后自动拍照...').replace('{{seconds}}', String(autoCountdown));
    return t('kyc.liveness.faceDetection.ready');
  };

  const canCapture = faceDetected && faceInFrame;

  // 状态变化日志
  React.useEffect(() => {
    console.log('[LivenessStep] ★ State v3:', { faceDetected, faceInFrame, faceSizeStatus, canCapture, phase });
  }, [faceDetected, faceInFrame, faceSizeStatus, canCapture, phase]);

  // 拍照函数
  const capturePhoto = React.useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    console.log('[LivenessStep] Photo captured v3');
    setCapturedImage(imageData);
    updateFormData({ faceImage: imageData });
    stopFaceDetection();
    toast.success(t('kyc.liveness.captured'));
    setPhase('liveness');
  }, [t, updateFormData, stopFaceDetection]);

  // 自动拍照倒计时
  const startAutoCountdown = React.useCallback(() => {
    if (autoTimerRef.current) return;
    console.log('[LivenessStep] ★★★ STARTING COUNTDOWN v3 ★★★');
    const startTime = Date.now();
    setAutoCountdown(3);
    setCountdownProgress(0);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / 3000) * 100, 100);
      setCountdownProgress(progress);
      const remaining = Math.ceil((3000 - elapsed) / 1000);
      if (remaining >= 0 && remaining <= 3) setAutoCountdown(remaining);
    }, 50);
    autoTimerRef.current = setTimeout(() => {
      console.log('[LivenessStep] ★★★ TIMER FIRED v3 ★★★');
      if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = canvas.toDataURL('image/jpeg', 0.9);
          setCapturedImage(imageData);
          updateFormData({ faceImage: imageData });
          stopFaceDetection();
          toast.success(t('kyc.liveness.captured'));
          setPhase('liveness');
        }
      }
      autoTimerRef.current = null;
      setAutoCountdown(0);
      setCountdownProgress(0);
    }, 3000);
  }, [t, updateFormData, stopFaceDetection]);

  const resetAutoCountdown = React.useCallback(() => {
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
    setAutoCountdown(0);
    setCountdownProgress(0);
  }, []);

  // 监听人脸状态，控制自动拍照
  React.useEffect(() => {
    console.log('[LivenessStep] ★ Auto-capture check v3:', { phase, canCapture, hasTimer: !!autoTimerRef.current });
    if (phase !== 'photo' || capturedImage) { resetAutoCountdown(); return; }
    if (canCapture && !autoTimerRef.current) {
      console.log('[LivenessStep] ★★★ TRIGGERING COUNTDOWN v3 ★★★');
      startAutoCountdown();
    } else if (!canCapture && autoTimerRef.current) {
      resetAutoCountdown();
    }
  }, [phase, capturedImage, canCapture, startAutoCountdown, resetAutoCountdown]);

  // 清理定时器
  React.useEffect(() => { return () => { resetAutoCountdown(); }; }, [resetAutoCountdown]);

  const handleManualCapture = React.useCallback(() => {
    if (!canCapture && !faceDetectionError) { toast.error(t('kyc.liveness.faceDetection.positionFace')); return; }
    resetAutoCountdown();
    capturePhoto();
  }, [canCapture, faceDetectionError, t, resetAutoCountdown, capturePhoto]);

  const retakePhoto = () => {
    setCapturedImage(null);
    updateFormData({ faceImage: undefined, livenessVerified: false });
    setLivenessVerified(false);
    resetLiveness();
    setPhase('photo');
    requestCameraAccess();
  };

  const retryLiveness = React.useCallback(() => {
    console.log('[LivenessStep] 🔄 retryLiveness called');
    // 先停止当前检测
    stopLivenessDetection();
    // 重置状态
    resetLiveness();
    // 确保摄像头已启动，然后重新开始检测
    if (cameraReady) {
      console.log('[LivenessStep] 🔄 Camera ready, starting detection after delay');
      // 使用 setTimeout 确保状态已经重置
      setTimeout(() => {
        console.log('[LivenessStep] 🔄 Now starting liveness detection');
        startLivenessDetection();
      }, 200);
    } else {
      console.log('[LivenessStep] 🔄 Camera not ready, requesting access');
      requestCameraAccess();
    }
  }, [stopLivenessDetection, resetLiveness, cameraReady, startLivenessDetection, requestCameraAccess]);

  const handleContinue = () => {
    if (!capturedImage || !livenessVerified) { toast.error(t('kyc.liveness.required')); return; }
    saveDraft();
    nextStep();
  };

  const getActionName = (type: ActionType): string => {
    const names: Record<ActionType, string> = {
      blink: t('kyc.liveness.actions.blink', '请眨眼'),
      open_mouth: t('kyc.liveness.actions.openMouth', '请张嘴'),
      turn_left: t('kyc.liveness.actions.turnLeft', '请向左转头'),
      turn_right: t('kyc.liveness.actions.turnRight', '请向右转头'),
      nod: t('kyc.liveness.actions.nod', '请点头'),
    };
    return names[type];
  };

  const getActionIcon = (type: ActionType): string => {
    const icons: Record<ActionType, string> = { blink: '👁️', open_mouth: '👄', turn_left: '👈', turn_right: '👉', nod: '👇' };
    return icons[type];
  };

  if (cameraPermission === 'denied') {
    return (
      <Card className="p-8 glass border-red-500/30">
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{t('kyc.liveness.cameraRequired')}</h3>
          <p className="text-white/60 max-w-md mx-auto mb-6">{t('kyc.liveness.cameraRequiredDesc')}</p>
          <Button variant="primary" onClick={requestCameraAccess}>{t('kyc.liveness.retryCamera')}</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-8 glass border-[#00D4AA]/20">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={showLandingPage} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title={t('kyc.backToOverview')}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${phase === 'photo' ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : capturedImage ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>
            {capturedImage ? <CheckCircle2 className="h-4 w-4" /> : <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs">1</span>}
            <span className="text-sm font-medium">{t('kyc.liveness.step1Title', '拍照')}</span>
          </div>
          <div className="w-8 h-0.5 bg-white/20" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${phase === 'liveness' ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : livenessVerified ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>
            {livenessVerified ? <CheckCircle2 className="h-4 w-4" /> : <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs">2</span>}
            <span className="text-sm font-medium">{t('kyc.liveness.step2Title', '活体检测')}</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
            <Shield className="h-8 w-8 text-[#00D4AA]" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {phase === 'photo' ? t('kyc.liveness.photoTitle', '拍摄照片') : phase === 'liveness' ? t('kyc.liveness.livenessTitle', '活体检测') : t('kyc.liveness.completeTitle', '验证完成')}
          </h3>
          <p className="text-white/60 max-w-md mx-auto">
            {phase === 'photo' ? t('kyc.liveness.photoDesc', '请将脸部置于框内，拍摄清晰的正面照片') : phase === 'liveness' ? t('kyc.liveness.livenessDesc', '请按提示完成以下动作以验证身份') : t('kyc.liveness.completeDesc', '您已完成所有验证步骤')}
          </p>
        </div>

        <div className="max-w-md mx-auto">
          {/* 拍照阶段 */}
          {phase === 'photo' && !capturedImage && (
            <div className="relative rounded-2xl overflow-hidden bg-black">
              <video ref={setVideoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`relative w-48 h-64 rounded-[50%] border-2 transition-colors duration-300 ${getFrameColor()}`} style={{ borderStyle: canCapture ? 'solid' : 'dashed' }}>
                  {canCapture && (
                    <>
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#00D4AA] rounded-tl-full" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#00D4AA] rounded-tr-full" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#00D4AA] rounded-bl-full" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#00D4AA] rounded-br-full" />
                    </>
                  )}
                </div>
                <div className="absolute bottom-20 left-0 right-0 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm ${canCapture ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : faceDetected ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/80'}`}>
                    {faceDetectionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <p className="text-sm font-medium">{getInstructionText()}</p>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button onClick={handleManualCapture} disabled={!canCapture && !faceDetectionError} className={`relative w-16 h-16 rounded-full transition-all flex items-center justify-center shadow-lg ${canCapture || faceDetectionError ? 'bg-[#00D4AA] hover:bg-[#00B896] shadow-[#00D4AA]/30 cursor-pointer' : 'bg-white/30 cursor-not-allowed'}`}>
                  {autoCountdown > 0 && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="4" />
                      <circle cx="32" cy="32" r="30" fill="none" stroke="#0A0F0D" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 30}`} strokeDashoffset={`${2 * Math.PI * 30 * (1 - countdownProgress / 100)}`} className="transition-all duration-100" />
                    </svg>
                  )}
                  {autoCountdown > 0 ? <span className="text-[#0A0F0D] text-xl font-bold z-10">{autoCountdown}</span> : <div className={`w-12 h-12 rounded-full border-2 ${canCapture || faceDetectionError ? 'border-[#0A0F0D]' : 'border-white/50'}`} />}
                </button>
              </div>
            </div>
          )}

          {/* 活体检测阶段 */}
          {phase === 'liveness' && (
            <div className="space-y-4">
              {capturedImage && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                  <img src={capturedImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1"><p className="text-green-400 text-sm font-medium">{t('kyc.liveness.photoComplete', '照片已拍摄')}</p></div>
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
              )}
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <video ref={setVideoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover" />
                {livenessState.currentAction && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{getActionIcon(livenessState.currentAction)}</div>
                      <div className="px-6 py-3 rounded-full bg-[#00D4AA]/20 backdrop-blur-sm">
                        <p className="text-[#00D4AA] text-lg font-semibold">{getActionName(livenessState.currentAction)}</p>
                      </div>
                    </div>
                  </div>
                )}
                {(livenessLoading || !livenessState.isReady) && !livenessState.allCompleted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-[#00D4AA] mx-auto mb-2" />
                      <p className="text-white/80">{t('kyc.liveness.preparing', '准备中...')}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {livenessState.actions.map((action, index) => {
                  const result = livenessState.results[index];
                  const isCurrent = index === livenessState.currentActionIndex;
                  const isCompleted = result?.completed;
                  const isFailed = (result?.progress ?? 0) >= 100 && !result?.completed;
                  return (
                    <div key={action.type} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isCurrent ? 'bg-[#00D4AA]/10 border border-[#00D4AA]/30' : isCompleted ? 'bg-green-500/10 border border-green-500/30' : isFailed ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5 border border-white/10'}`}>
                      <span className="text-2xl">{getActionIcon(action.type)}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isCurrent ? 'text-[#00D4AA]' : isCompleted ? 'text-green-400' : isFailed ? 'text-red-400' : 'text-white/60'}`}>{getActionName(action.type)}</p>
                        {isCurrent && result && (
                          <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#00D4AA] transition-all duration-100" style={{ width: `${result.progress ?? 0}%` }} />
                          </div>
                        )}
                      </div>
                      {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                      {isFailed && <XCircle className="h-5 w-5 text-red-400" />}
                      {isCurrent && !isCompleted && !isFailed && <Loader2 className="h-5 w-5 text-[#00D4AA] animate-spin" />}
                    </div>
                  );
                })}
              </div>
              {/* 显示重试按钮：当所有动作完成但有失败的，或者检测出错时 */}
              {(livenessState.allCompleted && livenessState.hasFailed) && (
                <div className="text-center mt-4">
                  <p className="text-red-400 mb-3">{t('kyc.liveness.someFailed', '部分动作未完成，请重试')}</p>
                  <Button variant="outline" onClick={retryLiveness}>{t('kyc.liveness.retry', '重试')}</Button>
                </div>
              )}
              {/* 如果检测超过 30 秒还没完成，显示重试按钮 */}
              {!livenessState.allCompleted && livenessState.currentActionIndex >= 0 && (
                <div className="text-center mt-4 space-y-2">
                  <button 
                    onClick={retryLiveness} 
                    className="text-sm text-white/60 hover:text-white underline"
                  >
                    {t('kyc.liveness.restartDetection', '重新开始检测')}
                  </button>
                  {/* 开发调试按钮 - 跳过检测 */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="pt-2 border-t border-white/10 mt-2">
                      <button
                        onClick={() => {
                          console.log('[DEV] Manually passing liveness check');
                          setLivenessVerified(true);
                          updateFormData({ livenessVerified: true });
                          setPhase('complete');
                          stopCamera();
                          toast.success('DEV: 跳过活体检测');
                        }}
                        className="text-xs text-amber-400/60 hover:text-amber-400 underline"
                      >
                        [DEV] 跳过检测
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 完成状态 */}
          {phase === 'complete' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">{t('kyc.liveness.allComplete', '验证已完成')}</h4>
              <p className="text-white/60 mb-4">{t('kyc.liveness.allCompleteDesc', '您已成功完成照片拍摄和活体检测')}</p>
              {capturedImage && <div className="inline-block"><img src={capturedImage} alt="" className="w-32 h-32 rounded-xl object-cover mx-auto mb-4" /></div>}
              <button onClick={retakePhoto} className="text-sm text-white/60 hover:text-white underline">{t('kyc.liveness.redetect')}</button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {phase !== 'complete' && (
          <div className="mt-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-400/80">
                <p className="font-medium text-amber-400 mb-1">{t('kyc.liveness.tips.title')}:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>{t('kyc.liveness.tips.lighting')}</li>
                  <li>{t('kyc.liveness.tips.noObstruction')}</li>
                  <li>{t('kyc.liveness.tips.face')}</li>
                  <li>{t('kyc.photoTips.complete')}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" size="lg" onClick={prevStep} className="gap-2">
          <ArrowLeft className="h-4 w-4" />{t('common.back')}
        </Button>
        <Button variant="primary" size="lg" onClick={handleContinue} disabled={!capturedImage || !livenessVerified} className="gap-2">
          {t('common.continue')}<ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
