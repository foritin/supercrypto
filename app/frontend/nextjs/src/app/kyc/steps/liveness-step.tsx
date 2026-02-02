'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKycContext } from '@/contexts/kyc-context';
import { ArrowLeft, ArrowRight, Shield, AlertCircle, ChevronLeft, Loader2, CheckCircle2, XCircle, Camera, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useLivenessDetection, ActionType } from '@/hooks/use-liveness-detection';

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

// 当前操作模式
type ActiveMode = 'none' | 'photo' | 'liveness';

export function LivenessStep() {
  const { t } = useTranslation();
  const { formData, updateFormData, showLandingPage, nextStep, prevStep, saveDraft } = useKycContext();

  // 两个独立的完成状态
  const [capturedImage, setCapturedImage] = React.useState<string | null>(formData.faceImage || null);
  const [livenessVerified, setLivenessVerified] = React.useState(false);
  
  // 当前激活的模式（拍照或活体检测）
  const [activeMode, setActiveMode] = React.useState<ActiveMode>(() => {
    // 如果都没完成，默认进入拍照模式
    if (!formData.faceImage) return 'photo';
    return 'none';
  });

  const [cameraPermission, setCameraPermission] = React.useState<'pending' | 'granted' | 'denied'>('pending');
  const [cameraReady, setCameraReady] = React.useState(false);

  // 人脸检测状态
  const [faceDetected, setFaceDetected] = React.useState(false);
  const [faceInFrame, setFaceInFrame] = React.useState(false);
  const [faceSizeStatus, setFaceSizeStatus] = React.useState<'ok' | 'too_small' | 'too_large' | 'unknown'>('unknown');
  const [faceDetectionLoading, setFaceDetectionLoading] = React.useState(true);

  // 自动拍照倒计时
  const [autoCountdown, setAutoCountdown] = React.useState(0);
  const [countdownProgress, setCountdownProgress] = React.useState(0);
  const autoTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const detectorRef = React.useRef<unknown>(null);
  const detectionIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // 活体检测完成回调
  const handleLivenessComplete = React.useCallback(() => {
    console.log('[LivenessStep] 🎉 Liveness detection completed!');
    setLivenessVerified(true);
    updateFormData({ livenessVerified: true });
    setActiveMode('none');
    stopCamera();
    toast.success(t('kyc.liveness.success', '活体检测通过'));
  }, [updateFormData, t]);

  const { 
    state: livenessState, 
    isLoading: livenessLoading, 
    startDetection: startLivenessDetection, 
    stopDetection: stopLivenessDetection, 
    reset: resetLiveness 
  } = useLivenessDetection(videoRef, activeMode === 'liveness', 1, handleLivenessComplete);

  // 摄像头相关函数
  const requestCameraAccess = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
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

  // 初始化人脸检测器
  React.useEffect(() => {
    let mounted = true;
    async function initDetector() {
      try {
        setFaceDetectionLoading(true);
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
          setFaceDetectionLoading(false);
        }
      } catch (err) {
        console.error('Failed to load face detection model:', err);
        if (mounted) setFaceDetectionLoading(false);
      }
    }
    initDetector();
    return () => {
      mounted = false;
      if (detectorRef.current) {
        (detectorRef.current as { close?: () => void }).close?.();
      }
    };
  }, []);

  // 人脸检测循环
  const detectFaces = React.useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) return;

    try {
      const detections = (detector as any).detectForVideo(video, performance.now());
      if (detections.detections?.length > 0) {
        const bbox = detections.detections[0]?.boundingBox;
        if (bbox) {
          const faceCenterX = (bbox.originX + bbox.width / 2) / video.videoWidth;
          const faceCenterY = (bbox.originY + bbox.height / 2) / video.videoHeight;
          const { centerX, centerY, radiusX, radiusY } = OVAL_BOUNDS;
          const normalized = Math.pow(faceCenterX - centerX, 2) / Math.pow(radiusX, 2) +
            Math.pow(faceCenterY - centerY, 2) / Math.pow(radiusY, 2);
          
          const faceWidthRatio = bbox.width / video.videoWidth;
          const faceHeightRatio = bbox.height / video.videoHeight;
          
          let sizeStatus: 'ok' | 'too_small' | 'too_large' = 'ok';
          if (faceWidthRatio < FACE_SIZE_THRESHOLDS.minWidth || faceHeightRatio < FACE_SIZE_THRESHOLDS.minHeight) {
            sizeStatus = 'too_small';
          } else if (faceWidthRatio > FACE_SIZE_THRESHOLDS.maxWidth || faceHeightRatio > FACE_SIZE_THRESHOLDS.maxHeight) {
            sizeStatus = 'too_large';
          }
          
          const isInFrame = normalized <= 0.7 && sizeStatus === 'ok';
          setFaceDetected(true);
          setFaceInFrame(isInFrame);
          setFaceSizeStatus(sizeStatus);
        }
      } else {
        setFaceDetected(false);
        setFaceInFrame(false);
        setFaceSizeStatus('unknown');
      }
    } catch (err) {
      console.error('Face detection error:', err);
    }
  }, []);

  // 启动/停止人脸检测
  React.useEffect(() => {
    if (activeMode === 'photo' && cameraReady && !faceDetectionLoading) {
      detectionIntervalRef.current = setInterval(detectFaces, 100);
    }
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [activeMode, cameraReady, faceDetectionLoading, detectFaces]);

  // 启动/停止活体检测
  React.useEffect(() => {
    if (activeMode === 'liveness' && cameraReady && !livenessLoading) {
      startLivenessDetection();
    }
  }, [activeMode, cameraReady, livenessLoading, startLivenessDetection]);

  // 请求摄像头（当进入拍照或活体检测模式时）
  React.useEffect(() => {
    if (activeMode !== 'none' && !streamRef.current) {
      requestCameraAccess();
    }
  }, [activeMode, requestCameraAccess]);

  // 清理
  React.useEffect(() => {
    return () => {
      stopCamera();
      stopLivenessDetection();
    };
  }, [stopCamera, stopLivenessDetection]);

  const canCapture = faceDetected && faceInFrame;

  // 自动拍照
  const resetAutoCountdown = React.useCallback(() => {
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
    setAutoCountdown(0);
    setCountdownProgress(0);
  }, []);

  const startAutoCountdown = React.useCallback(() => {
    const totalSeconds = 3;
    setAutoCountdown(totalSeconds);
    setCountdownProgress(0);
    
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / (totalSeconds * 1000)) * 100, 100);
      setCountdownProgress(progress);
      const remaining = Math.ceil((totalSeconds * 1000 - elapsed) / 1000);
      setAutoCountdown(remaining > 0 ? remaining : 0);
    }, 50);
    
    autoTimerRef.current = setTimeout(() => {
      resetAutoCountdown();
      capturePhoto();
    }, totalSeconds * 1000);
  }, []);

  React.useEffect(() => {
    if (activeMode === 'photo' && canCapture && !autoTimerRef.current) {
      startAutoCountdown();
    } else if (!canCapture && autoTimerRef.current) {
      resetAutoCountdown();
    }
  }, [activeMode, canCapture, startAutoCountdown, resetAutoCountdown]);

  // 拍照
  const capturePhoto = React.useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    setCapturedImage(imageData);
    updateFormData({ faceImage: imageData });
    setActiveMode('none');
    stopCamera();
    toast.success(t('kyc.liveness.photoSuccess', '照片拍摄成功'));
  }, [updateFormData, stopCamera, t]);

  const handleManualCapture = React.useCallback(() => {
    if (!canCapture) {
      toast.error(t('kyc.liveness.faceDetection.positionFace'));
      return;
    }
    resetAutoCountdown();
    capturePhoto();
  }, [canCapture, t, resetAutoCountdown, capturePhoto]);

  // 重新拍照
  const handleRetakePhoto = React.useCallback(() => {
    setCapturedImage(null);
    updateFormData({ faceImage: undefined });
    setActiveMode('photo');
    requestCameraAccess();
  }, [updateFormData, requestCameraAccess]);

  // 重新进行活体检测
  const handleRetryLiveness = React.useCallback(() => {
    setLivenessVerified(false);
    updateFormData({ livenessVerified: false });
    resetLiveness();
    setActiveMode('liveness');
    if (!streamRef.current) {
      requestCameraAccess();
    } else {
      setTimeout(() => startLivenessDetection(), 200);
    }
  }, [updateFormData, resetLiveness, requestCameraAccess, startLivenessDetection]);

  // 开始拍照
  const handleStartPhoto = React.useCallback(() => {
    setActiveMode('photo');
  }, []);

  // 开始活体检测
  const handleStartLiveness = React.useCallback(() => {
    setActiveMode('liveness');
  }, []);

  // 继续下一步
  const handleContinue = () => {
    if (!capturedImage || !livenessVerified) {
      toast.error(t('kyc.liveness.bothRequired', '请完成照片拍摄和活体检测'));
      return;
    }
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

  const getInstructionText = () => {
    if (faceDetectionLoading) return t('kyc.liveness.faceDetection.loading', '加载中...');
    if (!faceDetected) return t('kyc.liveness.faceDetection.noFace', '未检测到人脸');
    if (faceSizeStatus === 'too_small') return t('kyc.liveness.faceDetection.tooFar', '请靠近一点');
    if (faceSizeStatus === 'too_large') return t('kyc.liveness.faceDetection.tooClose', '请远离一点');
    if (!faceInFrame) return t('kyc.liveness.faceDetection.notInFrame', '请将脸部移入框内');
    if (autoCountdown > 0) return `${autoCountdown} 秒后自动拍照...`;
    return t('kyc.liveness.faceDetection.ready', '准备就绪');
  };

  const getFrameColor = () => {
    if (!faceDetected) return 'border-white/50';
    if (!faceInFrame) return 'border-amber-400';
    return 'border-[#00D4AA]';
  };

  // 两个步骤都完成了
  const isAllComplete = capturedImage && livenessVerified;

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
        <div className="flex items-center gap-3 mb-6">
          <button onClick={showLandingPage} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title={t('kyc.backToOverview')}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h3 className="text-xl font-semibold text-white">{t('kyc.liveness.title', '人脸验证')}</h3>
            <p className="text-sm text-white/60">{t('kyc.liveness.subtitle', '请完成以下两个步骤以验证身份')}</p>
          </div>
        </div>

        {/* 步骤状态卡片 - 始终显示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* 照片步骤 */}
          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              capturedImage 
                ? 'border-green-500/50 bg-green-500/10' 
                : activeMode === 'photo' 
                  ? 'border-[#00D4AA] bg-[#00D4AA]/10' 
                  : 'border-white/20 bg-white/5 hover:border-white/40'
            }`}
            onClick={() => {
              if (activeMode === 'none' || activeMode === 'liveness') {
                if (capturedImage) {
                  // 已有照片，点击重新拍照
                  handleRetakePhoto();
                } else {
                  handleStartPhoto();
                }
              }
            }}
          >
            <div className="flex items-center gap-3">
              {capturedImage ? (
                <img src={capturedImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                  activeMode === 'photo' ? 'bg-[#00D4AA]/20' : 'bg-white/10'
                }`}>
                  <Camera className={`h-6 w-6 ${activeMode === 'photo' ? 'text-[#00D4AA]' : 'text-white/60'}`} />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{t('kyc.liveness.step1Title', '拍摄照片')}</span>
                  {capturedImage && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                </div>
                <p className="text-sm text-white/60">
                  {capturedImage 
                    ? t('kyc.liveness.photoComplete', '照片已拍摄') 
                    : activeMode === 'photo' 
                      ? t('kyc.liveness.photoInProgress', '拍摄中...') 
                      : t('kyc.liveness.photoWaiting', '点击开始')}
                </p>
              </div>
              {capturedImage && activeMode !== 'photo' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRetakePhoto(); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
                  title={t('kyc.liveness.retake', '重新拍照')}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* 活体检测步骤 */}
          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              livenessVerified 
                ? 'border-green-500/50 bg-green-500/10' 
                : activeMode === 'liveness' 
                  ? 'border-[#00D4AA] bg-[#00D4AA]/10' 
                  : 'border-white/20 bg-white/5 hover:border-white/40'
            }`}
            onClick={() => {
              if (activeMode === 'none' || activeMode === 'photo') {
                if (livenessVerified) {
                  handleRetryLiveness();
                } else {
                  handleStartLiveness();
                }
              }
            }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                livenessVerified 
                  ? 'bg-green-500/20' 
                  : activeMode === 'liveness' 
                    ? 'bg-[#00D4AA]/20' 
                    : 'bg-white/10'
              }`}>
                {livenessVerified ? (
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                ) : (
                  <Shield className={`h-6 w-6 ${activeMode === 'liveness' ? 'text-[#00D4AA]' : 'text-white/60'}`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{t('kyc.liveness.step2Title', '活体检测')}</span>
                  {livenessVerified && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                </div>
                <p className="text-sm text-white/60">
                  {livenessVerified 
                    ? t('kyc.liveness.livenessComplete', '检测已通过') 
                    : activeMode === 'liveness' 
                      ? t('kyc.liveness.livenessInProgress', '检测中...') 
                      : t('kyc.liveness.livenessWaiting', '点击开始')}
                </p>
              </div>
              {livenessVerified && activeMode !== 'liveness' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRetryLiveness(); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
                  title={t('kyc.liveness.retry', '重新检测')}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 操作区域 */}
        <div className="max-w-lg mx-auto">
          {/* 拍照模式 */}
          {activeMode === 'photo' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full aspect-[4/3] object-cover" 
                />
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
                  <button 
                    onClick={handleManualCapture} 
                    disabled={!canCapture} 
                    className={`relative w-16 h-16 rounded-full transition-all flex items-center justify-center shadow-lg ${canCapture ? 'bg-[#00D4AA] hover:bg-[#00B896] shadow-[#00D4AA]/30 cursor-pointer' : 'bg-white/30 cursor-not-allowed'}`}
                  >
                    {autoCountdown > 0 && (
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="4" />
                        <circle cx="32" cy="32" r="30" fill="none" stroke="#0A0F0D" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 30}`} strokeDashoffset={`${2 * Math.PI * 30 * (1 - countdownProgress / 100)}`} className="transition-all duration-100" />
                      </svg>
                    )}
                    {autoCountdown > 0 ? <span className="text-[#0A0F0D] text-xl font-bold z-10">{autoCountdown}</span> : <div className={`w-12 h-12 rounded-full border-2 ${canCapture ? 'border-[#0A0F0D]' : 'border-white/50'}`} />}
                  </button>
                </div>
              </div>
              <button 
                onClick={() => { stopCamera(); setActiveMode('none'); }}
                className="w-full text-sm text-white/60 hover:text-white py-2"
              >
                {t('common.cancel', '取消')}
              </button>
            </div>
          )}

          {/* 活体检测模式 */}
          {activeMode === 'liveness' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full aspect-[4/3] object-cover" 
                />
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
              
              {/* 动作进度 */}
              {livenessState.actions.length > 0 && (
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
              )}

              <button 
                onClick={() => { stopLivenessDetection(); stopCamera(); setActiveMode('none'); }}
                className="w-full text-sm text-white/60 hover:text-white py-2"
              >
                {t('common.cancel', '取消')}
              </button>
            </div>
          )}

          {/* 空闲模式 - 显示提示 */}
          {activeMode === 'none' && !isAllComplete && (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/60">
                {!capturedImage && !livenessVerified 
                  ? t('kyc.liveness.clickToStart', '点击上方卡片开始验证')
                  : !capturedImage 
                    ? t('kyc.liveness.needPhoto', '请完成照片拍摄')
                    : t('kyc.liveness.needLiveness', '请完成活体检测')}
              </p>
            </div>
          )}

          {/* 全部完成 */}
          {isAllComplete && activeMode === 'none' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">{t('kyc.liveness.allComplete', '验证完成')}</h4>
              <p className="text-white/60">{t('kyc.liveness.allCompleteDesc', '您已完成所有验证步骤，可以继续下一步')}</p>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* 提示信息 */}
        {activeMode !== 'none' && (
          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-400/80">
                <p className="font-medium text-amber-400 mb-1">{t('kyc.liveness.tips.title', '提示')}:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>{t('kyc.liveness.tips.lighting', '确保光线充足，避免背光')}</li>
                  <li>{t('kyc.liveness.tips.noObstruction', '摘下眼镜、帽子等遮挡物')}</li>
                  <li>{t('kyc.liveness.tips.face', '正对摄像头，保持面部清晰')}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" size="lg" onClick={prevStep} className="gap-2">
          <ArrowLeft className="h-4 w-4" />{t('common.back', '返回')}
        </Button>
        <Button 
          variant="primary" 
          size="lg" 
          onClick={handleContinue} 
          disabled={!isAllComplete} 
          className="gap-2"
        >
          {t('common.continue', '继续')}<ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
