'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, CheckCircle, FileImage } from 'lucide-react';

interface DocumentUploadProps {
  side: 'front' | 'back';
  documentType: string;
  onUpload: (file: File) => void;
  uploadedFile?: File;
}

export function DocumentUpload({ side, documentType, onUpload, uploadedFile }: DocumentUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(uploadedFile);
    } else {
      setPreview(null);
    }
  }, [uploadedFile]);

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
      onUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleClear = () => {
    onUpload(null as unknown as File);
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const getDocumentLabel = () => {
    switch (documentType) {
      case 'passport':
        return side === 'front' ? 'Passport Data Page' : '';
      case 'national_id':
        return side === 'front' ? 'ID Front Side' : 'ID Back Side';
      case 'drivers_license':
        return side === 'front' ? 'License Front' : 'License Back';
      default:
        return side === 'front' ? 'Front Side' : 'Back Side';
    }
  };

  if (side === 'back' && documentType === 'passport') {
    return null;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-2">
        {getDocumentLabel()}
      </label>

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-[#00D4AA]">
          <img
            src={preview}
            alt={`${side} preview`}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <CheckCircle className="h-8 w-8 text-[#00D4AA] mb-2" />
            <p className="text-white text-sm font-medium">{uploadedFile?.name}</p>
            <button
              onClick={handleClear}
              className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#00D4AA] bg-[#00D4AA]/10'
              : 'border-white/20 hover:border-white/40 hover:bg-white/5'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="h-10 w-10 text-white/40 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">
            {t('kyc.upload.dragDrop', 'Drag & drop or click to upload')}
          </p>
          <p className="text-white/40 text-sm">
            {t('kyc.upload.supportedFormats', 'Supports: JPG, PNG, PDF (max 5MB)')}
          </p>
        </div>
      )}
    </div>
  );
}
