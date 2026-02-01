'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKycContext } from '@/contexts/kyc-context';
import { Camera, ArrowLeft, ArrowRight, Shield, AlertCircle, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export function LivenessStep() {
  const { t } = useTranslation();
  const { 
    formData, 
    updateFormData, 
    showLandingPage,
    nextStep, 
    prevStep,
    saveDraft,
  } = useKycContext();

  const [cameraPermission, setCameraPermission] = React.useState<'pending' | 'granted' | 'denied'>('pending');
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(formData.faceImage || null);
  const [instruction, setInstruction] = React.useState<string>('center');
  
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Request camera permission
  React.useEffect(() => {
    requestCameraAccess();
    return () => {
      // Cleanup stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const requestCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraPermission('granted');
    } catch (err) {
      console.error('Camera access denied:', err);
      setCameraPermission('denied');
      toast.error(t('kyc.liveness.cameraDenied', 'Camera access is required for face verification'));
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    updateFormData({ faceImage: imageData });

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    toast.success(t('kyc.liveness.captured', 'Photo captured successfully'));
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    updateFormData({ faceImage: undefined });
    requestCameraAccess();
  };

  const handleContinue = () => {
    if (!capturedImage) {
      toast.error(t('kyc.liveness.required', 'Please take a photo to continue'));
      return;
    }
    saveDraft();
    nextStep();
  };

  if (cameraPermission === 'denied') {
    return (
      <Card className="p-8 glass border-red-500/30">
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {t('kyc.liveness.cameraRequired', 'Camera Access Required')}
          </h3>
          <p className="text-white/60 max-w-md mx-auto mb-6">
            {t('kyc.liveness.cameraRequiredDesc', 'Please enable camera access in your browser settings to complete the face verification step.')}
          </p>
          <Button variant="primary" onClick={requestCameraAccess}>
            {t('kyc.liveness.retryCamera', 'Retry Camera Access')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-8 glass border-[#00D4AA]/20">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={showLandingPage}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title={t('kyc.backToOverview', 'Back to Overview')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
            <Shield className="h-8 w-8 text-[#00D4AA]" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {t('kyc.liveness.title', 'Face Verification')}
          </h3>
          <p className="text-white/60 max-w-md mx-auto">
            {t('kyc.liveness.desc', 'Please take a clear photo of your face. This helps us verify your identity matches your documents.')}
          </p>
        </div>

        {/* Camera Preview */}
        <div className="max-w-md mx-auto">
          {!capturedImage ? (
            <div className="relative rounded-2xl overflow-hidden bg-black">
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] object-cover"
              />

              {/* Face Frame Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-64 border-2 border-dashed border-[#00D4AA]/50 rounded-2xl">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00D4AA]" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00D4AA]" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00D4AA]" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00D4AA]" />
                  
                  {/* Instruction text */}
                  <div className="absolute -bottom-10 left-0 right-0 text-center">
                    <p className="text-[#00D4AA] text-sm font-medium">
                      {t('kyc.liveness.centerFace', 'Center your face')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Capture Button */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button
                  onClick={captureImage}
                  className="w-16 h-16 rounded-full bg-[#00D4AA] hover:bg-[#00B896] transition-colors flex items-center justify-center shadow-lg shadow-[#00D4AA]/30"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-[#0A0F0D]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#00D4AA] flex items-center justify-center">
                    <Camera className="h-6 w-6 text-[#0A0F0D]" />
                  </div>
                  <p className="text-white font-medium mb-4">Photo Captured</p>
                  <button
                    onClick={retakePhoto}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Retake Photo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Tips */}
        <div className="mt-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-400/80">
              <p className="font-medium text-amber-400 mb-1">Tips for best results:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Ensure good lighting on your face</li>
                <li>Remove glasses, hats, or face coverings</li>
                <li>Keep a neutral expression</li>
                <li>Make sure your face is fully visible</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={prevStep}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', 'Back')}
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={!capturedImage}
          className="gap-2"
        >
          {t('common.continue', 'Continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
