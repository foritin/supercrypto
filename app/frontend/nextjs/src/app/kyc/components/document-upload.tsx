'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadKycDocument, getKycDocumentUrl, type KycDocumentType } from '@/services/kyc';

interface DocumentUploadProps {
  side: 'front' | 'back';
  documentType: string;
  onUpload: (file: File, filePath: string) => void;
  onRemove?: () => void;
  uploadedFile?: File;
  uploadedPath?: string;
}

/**
 * 将前端的 documentType + side 转换为后端 API 的 document_type
 */
function getApiDocumentType(documentType: string, side: 'front' | 'back'): KycDocumentType {
  const mapping: Record<string, Record<string, KycDocumentType>> = {
    passport: { front: 'passport_front' },
    national_id: { front: 'id_card_front', back: 'id_card_back' },
    drivers_license: { front: 'drivers_license_front', back: 'drivers_license_back' },
  };
  return mapping[documentType]?.[side] || 'id_card_front';
}

export function DocumentUpload({ 
  side, 
  documentType, 
  onUpload, 
  onRemove, 
  uploadedFile,
  uploadedPath,
}: DocumentUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 当 documentType 或 side 改变时，重置预览状态
  // 这确保切换证件类型时不会显示其他类型的图片
  React.useEffect(() => {
    setPreview(null);
    setUploadError(null);
  }, [documentType, side]);

  // 当有 uploadedFile 时，从 File 对象生成预览
  React.useEffect(() => {
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(uploadedFile);
    }
  }, [uploadedFile]);

  // 当有 uploadedPath 但没有 uploadedFile 时（从其他步骤返回），从后端获取预签名 URL
  React.useEffect(() => {
    // 确保只在有 uploadedPath 时才加载预览
    if (uploadedPath && !uploadedFile) {
      setIsLoadingPreview(true);
      getKycDocumentUrl(uploadedPath)
        .then((result) => {
          setPreview(result.url);
        })
        .catch((error) => {
          console.error('Failed to load preview:', error);
          // 加载失败时不显示错误，保持"上传成功"状态
        })
        .finally(() => {
          setIsLoadingPreview(false);
        });
    } else if (!uploadedPath && !uploadedFile) {
      // 如果没有文件也没有路径，清除预览
      setPreview(null);
    }
  }, [uploadedPath, uploadedFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    // 前端预检查文件大小 (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = t('kyc.upload.fileTooLarge', 'File size exceeds 10MB limit');
      setUploadError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      const apiDocType = getApiDocumentType(documentType, side);
      const response = await uploadKycDocument(apiDocType, file);
      onUpload(file, response.file_path);
      toast.success(t('kyc.upload.uploadSuccess', 'Upload successful'));
    } catch (error) {
      console.error('Upload failed:', error);
      // 解析后端返回的错误信息
      const errorMessage = error instanceof Error ? error.message : String(error);
      let errorMsg: string;
      if (errorMessage.includes('10MB') || errorMessage.includes('文件大小')) {
        errorMsg = t('kyc.upload.fileTooLarge', 'File size exceeds 10MB limit');
      } else if (errorMessage.includes('文件格式') || errorMessage.includes('不支持')) {
        errorMsg = t('kyc.upload.invalidFormat', 'Invalid file format. Supports: JPG, PNG, PDF');
      } else {
        errorMsg = t('kyc.upload.error', 'Upload failed, please try again');
      }
      setUploadError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    if (onRemove) {
      onRemove();
    }
    setPreview(null);
    setUploadError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const getDocumentLabel = () => {
    switch (documentType) {
      case 'passport':
        return side === 'front' ? t('kyc.upload.passportDataPage', 'Passport Data Page') : '';
      case 'national_id':
        return side === 'front' 
          ? t('kyc.upload.idFront', 'ID Front Side') 
          : t('kyc.upload.idBack', 'ID Back Side');
      case 'drivers_license':
        return side === 'front' 
          ? t('kyc.upload.licenseFront', 'License Front') 
          : t('kyc.upload.licenseBack', 'License Back');
      default:
        return side === 'front' 
          ? t('kyc.upload.frontSide', 'Front Side') 
          : t('kyc.upload.backSide', 'Back Side');
    }
  };

  if (side === 'back' && documentType === 'passport') {
    return null;
  }

  // 判断是否已上传（有预览图或有已保存的路径）
  const hasUpload = preview || uploadedPath;

  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-2">
        {getDocumentLabel()}
      </label>

      {hasUpload ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-[#00D4AA]">
          {isLoadingPreview ? (
            // 正在加载预览图
            <div className="w-full h-48 bg-[#00D4AA]/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-[#00D4AA] animate-spin" />
            </div>
          ) : preview ? (
            // 有预览图时显示图片
            <img
              src={preview}
              alt={`${side} preview`}
              className="w-full h-48 object-cover"
            />
          ) : (
            // 没有预览图但有路径时（加载失败），显示占位符
            <div className="w-full h-48 bg-[#00D4AA]/10 flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-[#00D4AA]/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <CheckCircle className="h-8 w-8 text-[#00D4AA] mb-2" />
            <p className="text-white text-sm font-medium">
              {uploadedFile?.name || t('kyc.upload.uploadSuccess', 'Upload successful')}
            </p>
            <button
              onClick={handleClear}
              className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              {t('common.remove', 'Remove')}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isUploading
              ? 'border-[#00D4AA]/50 bg-[#00D4AA]/5 cursor-wait'
              : isDragging
                ? 'border-[#00D4AA] bg-[#00D4AA]/10 cursor-pointer'
                : 'border-white/20 hover:border-white/40 hover:bg-white/5 cursor-pointer'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-[#00D4AA] mx-auto mb-3 animate-spin" />
              <p className="text-white font-medium mb-1">
                {t('kyc.upload.uploading', 'Uploading...')}
              </p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-white/40 mx-auto mb-3" />
              <p className="text-white font-medium mb-1">
                {t('kyc.upload.dragDrop', 'Drag & drop or click to upload')}
              </p>
              <p className="text-white/40 text-sm">
                {t('kyc.upload.supportedFormats', 'Supports: JPG, PNG, PDF (max 10MB)')}
              </p>
            </>
          )}
          {uploadError && (
            <p className="mt-2 text-sm text-red-400">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
}
