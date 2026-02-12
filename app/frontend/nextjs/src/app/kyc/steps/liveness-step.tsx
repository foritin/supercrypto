'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKycContext } from '@/contexts/kyc-context';
import { ArrowLeft, ArrowRight, Shield, AlertCircle, ChevronLeft, Loader2, CheckCircle2, XCircle, Camera, RefreshCw, Upload, Video } from 'lucide-react';
import { toast } from 'sonner';
import { useLivenessDetection, ActionType } from '@/hooks/use-liveness-detection';
import { uploadBase64Image, uploadLivenessVideo } from '@/services/kyc';

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
type ActiveMode = 'none' | 'photo' | 'liveness' | 'selfie';

// 上传状态类型 (Task 5.1)
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

// 视频上传状态类型
type VideoUploadStatus = 'idle' | 'recording' | 'uploading' | 'success' | 'error';

export function LivenessStep() {
  const { t } = useTranslation();
  const { formData, updateFormData, showLandingPage, nextStep, prevStep, saveDraft } = useKycContext();

  // 两个独立的完成状态
  const [capturedImage, setCapturedImage] = React.useState<string | null>(formData.faceImage || null);
  const [livenessVerified, setLivenessVerified] = React.useState(false);
  
  // 手持证照状态 (Task 7.1)
  const [selfieImage, setSelfieImage] = React.useState<string | null>(formData.selfie || null);
  const [selfieUploadStatus, setSelfieUploadStatus] = React.useState<UploadStatus>(() => {
    if (formData.selfiePath) return 'success';
    return 'idle';
  });
  
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

  // 上传状态管理 (Task 5.1)
  const [uploadStatus, setUploadStatus] = React.useState<UploadStatus>(() => {
    // 如果已有 faceImagePath，说明之前上传成功
    if (formData.faceImagePath) return 'success';
    return 'idle';
  });
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  // 保留 base64 图片用于重试 (Task 5.3)
  const [pendingUploadImage, setPendingUploadImage] = React.useState<string | null>(null);

  // 活体检测视频录制状态
  const [videoUploadStatus, setVideoUploadStatus] = React.useState<VideoUploadStatus>(() => {
    // 如果已有 livenessVideoPath，说明之前上传成功
    if (formData.livenessVideoPath) return 'success';
    return 'idle';
  });
  const [videoUploadError, setVideoUploadError] = React.useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordedChunksRef = React.useRef<Blob[]>([]);
  const [pendingVideoBlob, setPendingVideoBlob] = React.useState<Blob | null>(null);
  // 保存录制时使用的 MIME 类型
  const recordingMimeTypeRef = React.useRef<string>('video/webm');

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
    
    // 停止视频录制并上传
    stopVideoRecording();
    
    stopCamera();
    toast.success(t('kyc.liveness.success', '活体检测通过'));
  }, [updateFormData, t]);

  // 开始视频录制
  const startVideoRecording = React.useCallback(() => {
    if (!streamRef.current) {
      console.log('[LivenessStep] ⚠️ No stream available for recording');
      return;
    }

    try {
      // 检查浏览器是否支持 WebM 格式（后端只接受 WebM）
      const webmSupported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        || MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        || MediaRecorder.isTypeSupported('video/webm');
      
      if (!webmSupported) {
        console.log('[LivenessStep] ⚠️ Browser does not support WebM recording, skipping video capture');
        toast.warning(t('kyc.liveness.webmNotSupported', '您的浏览器不支持 WebM 视频录制，活体检测视频将不会被保存'));
        return;
      }

      // 选择最佳的 WebM 编码
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

      console.log('[LivenessStep] 🎬 Starting video recording with MIME type:', mimeType);
      
      // 保存 MIME 类型供上传时使用
      recordingMimeTypeRef.current = mimeType;
      recordedChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 1000000, // 1 Mbps
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log('[LivenessStep] 📹 Recorded chunk:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[LivenessStep] 🛑 Recording stopped, total chunks:', recordedChunksRef.current.length);
        
        if (recordedChunksRef.current.length > 0) {
          // 使用保存的 MIME 类型创建 Blob
          const videoBlob = new Blob(recordedChunksRef.current, { type: recordingMimeTypeRef.current });
          console.log('[LivenessStep] 📦 Video blob created:', videoBlob.size, 'bytes, type:', recordingMimeTypeRef.current);
          
          // 上传视频
          await uploadVideoToMinIO(videoBlob);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('[LivenessStep] ❌ MediaRecorder error:', event);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // 每秒收集一次数据
      setVideoUploadStatus('recording');
      console.log('[LivenessStep] ✅ Video recording started');
    } catch (error) {
      console.error('[LivenessStep] ❌ Failed to start video recording:', error);
      // 录制失败不阻止活体检测
    }
  }, [t]);

  // 停止视频录制
  const stopVideoRecording = React.useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('[LivenessStep] 🛑 Stopping video recording...');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  // 上传视频到 MinIO
  const uploadVideoToMinIO = React.useCallback(async (videoBlob: Blob): Promise<string | null> => {
    setVideoUploadStatus('uploading');
    setVideoUploadError(null);
    setPendingVideoBlob(videoBlob);

    try {
      console.log('[LivenessStep] 📤 Uploading liveness video to MinIO...');
      const response = await uploadLivenessVideo(videoBlob);
      console.log('[LivenessStep] ✅ Liveness video uploaded successfully:', response.file_path);
      
      setVideoUploadStatus('success');
      setPendingVideoBlob(null);
      
      // 更新 Context 状态
      updateFormData({ livenessVideoPath: response.file_path });
      
      return response.file_path;
    } catch (error) {
      console.error('[LivenessStep] ❌ Liveness video upload failed:', error);
      
      let errorMessage = t('kyc.liveness.videoUploadError', '视频上传失败，请重试');
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setVideoUploadStatus('error');
      setVideoUploadError(errorMessage);
      // 视频上传失败不阻止流程，只显示警告
      toast.warning(t('kyc.liveness.videoUploadWarning', '活体检测视频上传失败，但不影响验证结果'));
      
      return null;
    }
  }, [t, updateFormData]);

  // 重试视频上传
  const handleRetryVideoUpload = React.useCallback(async () => {
    if (!pendingVideoBlob) {
      toast.error(t('kyc.liveness.noVideoToRetry', '没有待上传的视频'));
      return;
    }

    const filePath = await uploadVideoToMinIO(pendingVideoBlob);
    if (filePath) {
      toast.success(t('kyc.liveness.videoUploadSuccess', '视频上传成功'));
    }
  }, [pendingVideoBlob, uploadVideoToMinIO, t]);

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
      // 同时开始视频录制
      startVideoRecording();
    }
  }, [activeMode, cameraReady, livenessLoading, startLivenessDetection, startVideoRecording]);

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
      stopVideoRecording();
    };
  }, [stopCamera, stopLivenessDetection, stopVideoRecording]);

  const canCapture = faceDetected && faceInFrame;

  // 上传人脸图片到 MinIO (Task 5.2)
  const uploadFaceImage = React.useCallback(async (imageData: string): Promise<string | null> => {
    setUploadStatus('uploading');
    setUploadError(null);
    setPendingUploadImage(imageData); // 保留用于重试

    try {
      console.log('[LivenessStep] 📤 Uploading face image to MinIO...');
      const response = await uploadBase64Image(imageData, 'face_image');
      console.log('[LivenessStep] ✅ Face image uploaded successfully:', response.file_path);
      
      setUploadStatus('success');
      setPendingUploadImage(null); // 清除待上传图片
      return response.file_path;
    } catch (error) {
      console.error('[LivenessStep] ❌ Face image upload failed:', error);
      
      // 提取错误信息 (Task 5.3)
      let errorMessage = t('kyc.liveness.uploadError', '上传失败，请重试');
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setUploadStatus('error');
      setUploadError(errorMessage);
      toast.error(errorMessage);
      
      return null;
    }
  }, [t]);

  // 重试上传 (Task 5.3)
  const handleRetryUpload = React.useCallback(async () => {
    if (!pendingUploadImage) {
      toast.error(t('kyc.liveness.noImageToRetry', '没有待上传的图片'));
      return;
    }

    const filePath = await uploadFaceImage(pendingUploadImage);
    if (filePath) {
      // 上传成功，更新 Context 状态 (Task 5.4)
      updateFormData({ 
        faceImage: pendingUploadImage, 
        faceImagePath: filePath 
      });
      toast.success(t('kyc.liveness.uploadSuccess', '图片上传成功'));
    }
  }, [pendingUploadImage, uploadFaceImage, updateFormData, t]);

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
  const capturePhoto = React.useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    // 先设置本地状态显示预览
    setCapturedImage(imageData);
    setActiveMode('none');
    stopCamera();
    
    // 立即上传到 MinIO (Task 5.2)
    const filePath = await uploadFaceImage(imageData);
    
    if (filePath) {
      // 上传成功，同时存储 base64 和 MinIO 路径 (Task 5.4)
      updateFormData({ 
        faceImage: imageData, 
        faceImagePath: filePath 
      });
      toast.success(t('kyc.liveness.photoSuccess', '照片拍摄并上传成功'));
    } else {
      // 上传失败，只保存 base64 用于预览和重试 (Task 5.3)
      updateFormData({ faceImage: imageData });
      // toast.error 已在 uploadFaceImage 中调用
    }
  }, [updateFormData, stopCamera, t, uploadFaceImage]);

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
    // 重置上传状态 (Task 5.1)
    setUploadStatus('idle');
    setUploadError(null);
    setPendingUploadImage(null);
    updateFormData({ faceImage: undefined, faceImagePath: undefined });
    setActiveMode('photo');
    requestCameraAccess();
  }, [updateFormData, requestCameraAccess]);

  // 重新进行活体检测
  const handleRetryLiveness = React.useCallback(() => {
    setLivenessVerified(false);
    // 重置视频上传状态
    setVideoUploadStatus('idle');
    setVideoUploadError(null);
    setPendingVideoBlob(null);
    updateFormData({ livenessVerified: false, livenessVideoPath: undefined });
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

  // 开始手持证照拍摄 (Task 7.2)
  const handleStartSelfie = React.useCallback(() => {
    setActiveMode('selfie');
  }, []);

  // 重新拍摄手持证照 (Task 7.2)
  const handleRetakeSelfie = React.useCallback(() => {
    setSelfieImage(null);
    setSelfieUploadStatus('idle');
    updateFormData({ selfie: undefined, selfiePath: undefined });
    setActiveMode('selfie');
    if (!streamRef.current) {
      requestCameraAccess();
    }
  }, [updateFormData, requestCameraAccess]);

  // 重试手持证照上传 (Task 7.2)
  const handleRetrySelfieUpload = React.useCallback(async () => {
    if (!selfieImage) {
      toast.error(t('kyc.liveness.noImageToRetry', '没有待上传的图片'));
      return;
    }

    setSelfieUploadStatus('uploading');
    try {
      const response = await uploadBase64Image(selfieImage, 'selfie');
      setSelfieUploadStatus('success');
      updateFormData({ selfie: selfieImage, selfiePath: response.file_path });
      toast.success(t('kyc.liveness.uploadSuccess', '图片上传成功'));
    } catch (error) {
      console.error('[LivenessStep] ❌ Selfie upload retry failed:', error);
      setSelfieUploadStatus('error');
      toast.error(t('kyc.liveness.uploadError', '上传失败，请重试'));
    }
  }, [selfieImage, updateFormData, t]);

  // 拍摄手持证照 (Task 7.2)
  const handleCaptureSelfie = React.useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    // 先设置本地状态显示预览
    setSelfieImage(imageData);
    setActiveMode('none');
    stopCamera();
    
    // 立即上传到 MinIO
    setSelfieUploadStatus('uploading');
    try {
      console.log('[LivenessStep] 📤 Uploading selfie to MinIO...');
      const response = await uploadBase64Image(imageData, 'selfie');
      console.log('[LivenessStep] ✅ Selfie uploaded successfully:', response.file_path);
      
      setSelfieUploadStatus('success');
      updateFormData({ selfie: imageData, selfiePath: response.file_path });
      toast.success(t('kyc.liveness.selfieSuccess', '手持证照拍摄并上传成功'));
    } catch (error) {
      console.error('[LivenessStep] ❌ Selfie upload failed:', error);
      setSelfieUploadStatus('error');
      // 保存 base64 用于预览和重试
      updateFormData({ selfie: imageData });
      toast.error(t('kyc.liveness.uploadError', '上传失败，请重试'));
    }
  }, [updateFormData, stopCamera, t]);

  // 继续下一步 (Task 7.4: 更新验证逻辑，包含手持证照)
  const handleContinue = () => {
    if (!capturedImage || !livenessVerified || !selfieImage) {
      toast.error(t('kyc.liveness.allThreeRequired', '请完成照片拍摄、活体检测和手持证照'));
      return;
    }
    if (uploadStatus !== 'success') {
      toast.error(t('kyc.liveness.uploadRequired', '请等待照片上传完成'));
      return;
    }
    if (selfieUploadStatus !== 'success') {
      toast.error(t('kyc.liveness.selfieUploadRequired', '请等待手持证照上传完成'));
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
    return 'border-primary';
  };

  // 三个步骤都完成了 (包括上传成功) (Task 7.4: 更新完成条件)
  // 注意：视频上传失败不阻止流程，因为活体检测本身已通过
  const isAllComplete = capturedImage && uploadStatus === 'success' && livenessVerified && selfieImage && selfieUploadStatus === 'success';

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
      <Card className="p-8 glass border-primary/20">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 照片步骤 */}
          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              capturedImage && uploadStatus === 'success'
                ? 'border-green-500/50 bg-green-500/10' 
                : capturedImage && uploadStatus === 'error'
                  ? 'border-red-500/50 bg-red-500/10'
                  : capturedImage && uploadStatus === 'uploading'
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : activeMode === 'photo' 
                      ? 'border-primary bg-primary/10' 
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
                  activeMode === 'photo' ? 'bg-primary/20' : 'bg-white/10'
                }`}>
                  <Camera className={`h-6 w-6 ${activeMode === 'photo' ? 'text-primary' : 'text-white/60'}`} />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{t('kyc.liveness.step1Title', '拍摄照片')}</span>
                  {capturedImage && uploadStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  {capturedImage && uploadStatus === 'uploading' && <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />}
                  {capturedImage && uploadStatus === 'error' && <XCircle className="h-4 w-4 text-red-400" />}
                </div>
                <p className="text-sm text-white/60">
                  {capturedImage && uploadStatus === 'success'
                    ? t('kyc.liveness.photoComplete', '照片已上传') 
                    : capturedImage && uploadStatus === 'uploading'
                      ? t('kyc.liveness.photoUploading', '上传中...')
                      : capturedImage && uploadStatus === 'error'
                        ? t('kyc.liveness.photoUploadFailed', '上传失败')
                        : activeMode === 'photo' 
                          ? t('kyc.liveness.photoInProgress', '拍摄中...') 
                          : t('kyc.liveness.photoWaiting', '点击开始')}
                </p>
              </div>
              {/* 重试按钮 (Task 5.3) */}
              {capturedImage && uploadStatus === 'error' && activeMode !== 'photo' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRetryUpload(); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-amber-400 hover:text-amber-300"
                  title={t('kyc.liveness.retryUpload', '重新上传')}
                >
                  <Upload className="h-4 w-4" />
                </button>
              )}
              {capturedImage && uploadStatus !== 'uploading' && activeMode !== 'photo' && (
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
              livenessVerified && videoUploadStatus === 'success'
                ? 'border-green-500/50 bg-green-500/10' 
                : livenessVerified && videoUploadStatus === 'error'
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : livenessVerified && videoUploadStatus === 'uploading'
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : activeMode === 'liveness' 
                      ? 'border-primary bg-primary/10' 
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
                    ? 'bg-primary/20' 
                    : 'bg-white/10'
              }`}>
                {livenessVerified ? (
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                ) : videoUploadStatus === 'recording' ? (
                  <Video className="h-6 w-6 text-red-400 animate-pulse" />
                ) : (
                  <Shield className={`h-6 w-6 ${activeMode === 'liveness' ? 'text-primary' : 'text-white/60'}`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{t('kyc.liveness.step2Title', '活体检测')}</span>
                  {livenessVerified && videoUploadStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  {livenessVerified && videoUploadStatus === 'uploading' && <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />}
                  {livenessVerified && videoUploadStatus === 'error' && <AlertCircle className="h-4 w-4 text-amber-400" />}
                  {videoUploadStatus === 'recording' && <span className="text-xs text-red-400 animate-pulse">● REC</span>}
                </div>
                <p className="text-sm text-white/60">
                  {livenessVerified && videoUploadStatus === 'success'
                    ? t('kyc.liveness.livenessComplete', '检测已通过') 
                    : livenessVerified && videoUploadStatus === 'uploading'
                      ? t('kyc.liveness.videoUploading', '视频上传中...')
                      : livenessVerified && videoUploadStatus === 'error'
                        ? t('kyc.liveness.videoUploadFailed', '视频上传失败')
                        : activeMode === 'liveness' 
                          ? t('kyc.liveness.livenessInProgress', '检测中...') 
                          : t('kyc.liveness.livenessWaiting', '点击开始')}
                </p>
              </div>
              {/* 重试视频上传按钮 */}
              {livenessVerified && videoUploadStatus === 'error' && activeMode !== 'liveness' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRetryVideoUpload(); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-amber-400 hover:text-amber-300"
                  title={t('kyc.liveness.retryVideoUpload', '重新上传视频')}
                >
                  <Upload className="h-4 w-4" />
                </button>
              )}
              {livenessVerified && videoUploadStatus !== 'uploading' && activeMode !== 'liveness' && (
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

          {/* 手持证照步骤 (Task 7.2) */}
          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selfieImage && selfieUploadStatus === 'success'
                ? 'border-green-500/50 bg-green-500/10' 
                : selfieImage && selfieUploadStatus === 'error'
                  ? 'border-red-500/50 bg-red-500/10'
                  : selfieImage && selfieUploadStatus === 'uploading'
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : activeMode === 'selfie' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-white/20 bg-white/5 hover:border-white/40'
            }`}
            onClick={() => {
              if (activeMode === 'none' || activeMode === 'photo' || activeMode === 'liveness') {
                if (selfieImage) {
                  // 已有照片，点击重新拍照
                  handleRetakeSelfie();
                } else {
                  handleStartSelfie();
                }
              }
            }}
          >
            <div className="flex items-center gap-3">
              {selfieImage ? (
                <img src={selfieImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                  activeMode === 'selfie' ? 'bg-primary/20' : 'bg-white/10'
                }`}>
                  <Camera className={`h-6 w-6 ${activeMode === 'selfie' ? 'text-primary' : 'text-white/60'}`} />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{t('kyc.liveness.step3Title', '手持证照')}</span>
                  {selfieImage && selfieUploadStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  {selfieImage && selfieUploadStatus === 'uploading' && <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />}
                  {selfieImage && selfieUploadStatus === 'error' && <XCircle className="h-4 w-4 text-red-400" />}
                </div>
                <p className="text-sm text-white/60">
                  {selfieImage && selfieUploadStatus === 'success'
                    ? t('kyc.liveness.selfieComplete', '照片已上传') 
                    : selfieImage && selfieUploadStatus === 'uploading'
                      ? t('kyc.liveness.selfieUploading', '上传中...')
                      : selfieImage && selfieUploadStatus === 'error'
                        ? t('kyc.liveness.selfieUploadFailed', '上传失败')
                        : activeMode === 'selfie' 
                          ? t('kyc.liveness.selfieInProgress', '拍摄中...') 
                          : t('kyc.liveness.selfieWaiting', '点击开始')}
                </p>
              </div>
              {/* 重试上传按钮 */}
              {selfieImage && selfieUploadStatus === 'error' && activeMode !== 'selfie' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRetrySelfieUpload(); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-amber-400 hover:text-amber-300"
                  title={t('kyc.liveness.retryUpload', '重新上传')}
                >
                  <Upload className="h-4 w-4" />
                </button>
              )}
              {selfieImage && selfieUploadStatus !== 'uploading' && activeMode !== 'selfie' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRetakeSelfie(); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
                  title={t('kyc.liveness.retakeSelfie', '重新拍照')}
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
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-full" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-full" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-full" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-full" />
                      </>
                    )}
                  </div>
                  <div className="absolute bottom-20 left-0 right-0 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm ${canCapture ? 'bg-primary/20 text-primary' : faceDetected ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/80'}`}>
                      {faceDetectionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <p className="text-sm font-medium">{getInstructionText()}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button 
                    onClick={handleManualCapture} 
                    disabled={!canCapture} 
                    className={`relative w-16 h-16 rounded-full transition-all flex items-center justify-center shadow-lg ${canCapture ? 'bg-primary hover:bg-primary-dark shadow-primary/30 cursor-pointer' : 'bg-white/30 cursor-not-allowed'}`}
                  >
                    {autoCountdown > 0 && (
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="4" />
                        <circle cx="32" cy="32" r="30" fill="none" stroke="#0A0F0D" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 30}`} strokeDashoffset={`${2 * Math.PI * 30 * (1 - countdownProgress / 100)}`} className="transition-all duration-100" />
                      </svg>
                    )}
                    {autoCountdown > 0 ? <span className="text-bg-dark text-xl font-bold z-10">{autoCountdown}</span> : <div className={`w-12 h-12 rounded-full border-2 ${canCapture ? 'border-bg-dark' : 'border-white/50'}`} />}
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
                      <div className="px-6 py-3 rounded-full bg-primary/20 backdrop-blur-sm">
                        <p className="text-primary text-lg font-semibold">{getActionName(livenessState.currentAction)}</p>
                      </div>
                    </div>
                  </div>
                )}
                {(livenessLoading || !livenessState.isReady) && !livenessState.allCompleted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
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
                      <div key={action.type} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isCurrent ? 'bg-primary/10 border border-primary/30' : isCompleted ? 'bg-green-500/10 border border-green-500/30' : isFailed ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5 border border-white/10'}`}>
                        <span className="text-2xl">{getActionIcon(action.type)}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-green-400' : isFailed ? 'text-red-400' : 'text-white/60'}`}>{getActionName(action.type)}</p>
                          {isCurrent && result && (
                            <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-100" style={{ width: `${result.progress ?? 0}%` }} />
                            </div>
                          )}
                        </div>
                        {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                        {isFailed && <XCircle className="h-5 w-5 text-red-400" />}
                        {isCurrent && !isCompleted && !isFailed && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                      </div>
                    );
                  })}
                </div>
              )}

              <button 
                onClick={() => { stopLivenessDetection(); stopVideoRecording(); stopCamera(); setActiveMode('none'); }}
                className="w-full text-sm text-white/60 hover:text-white py-2"
              >
                {t('common.cancel', '取消')}
              </button>
            </div>
          )}

          {/* 手持证照拍摄模式 (Task 7.2) */}
          {activeMode === 'selfie' && (
            <div className="space-y-4">
              {/* 拍摄指引 */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 mb-4">
                <div className="flex items-start gap-3">
                  <Camera className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm text-primary/90">
                    <p className="font-medium text-primary mb-1">{t('kyc.liveness.selfieGuide.title', '拍摄指引')}:</p>
                    <p>{t('kyc.liveness.selfieGuide.instruction', '请手持证件拍摄照片')}</p>
                    <ul className="mt-2 space-y-1 list-disc list-inside text-primary/70">
                      <li>{t('kyc.liveness.selfieGuide.tip1', '将证件正面朝向摄像头')}</li>
                      <li>{t('kyc.liveness.selfieGuide.tip2', '确保证件和面部都清晰可见')}</li>
                      <li>{t('kyc.liveness.selfieGuide.tip3', '避免遮挡证件上的信息')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-black">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full aspect-[4/3] object-cover" 
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* 手持证照框架 - 更大的矩形框 */}
                  <div className="relative w-72 h-56 rounded-xl border-2 border-dashed border-white/50">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
                  </div>
                  <div className="absolute bottom-20 left-0 right-0 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/10 text-white/80">
                      <p className="text-sm font-medium">{t('kyc.liveness.selfieReady', '请手持证件，点击拍照')}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button 
                    onClick={handleCaptureSelfie} 
                    className="relative w-16 h-16 rounded-full transition-all flex items-center justify-center shadow-lg bg-primary hover:bg-primary-dark shadow-primary/30 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-bg-dark" />
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
