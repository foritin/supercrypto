'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { z } from 'zod';

import { applyKyc, kycService, type KycApplyRequest, type KycDocumentInfo, type KycIdType } from '@/services/kyc';

// 计算年龄的辅助函数
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return -1;
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// KYC Form Validation Schema (Zod 4 使用 message 参数)
export const kycSchema = z.object({
  // Basic Info
  firstName: z.string({ message: 'First name is required' }).min(2, 'First name must be at least 2 characters'),
  lastName: z.string({ message: 'Last name is required' }).min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string({ message: 'Date of birth is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date')
    .refine((val) => {
      const age = calculateAge(val);
      return age >= 18 && age <= 120;
    }, 'You must be at least 18 years old'),
  nationality: z.string({ message: 'Nationality is required' }).min(2, 'Please select nationality'),
  
  // Contact Info
  email: z.string({ message: 'Email is required' }).email('Invalid email address'),
  phone: z.string({ message: 'Phone number is required' }).regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (include country code, e.g. +1234567890)'),
  
  // Address
  addressLine1: z.string({ message: 'Address is required' }).min(5, 'Address must be at least 5 characters'),
  addressLine2: z.string().optional(),
  city: z.string({ message: 'City is required' }).min(2, 'City is required'),
  state: z.string({ message: 'State/Province is required' }).min(2, 'State/Province is required'),
  postalCode: z.string({ message: 'Postal code is required' }).min(3, 'Postal code is required'),
  country: z.string({ message: 'Country is required' }).min(2, 'Country is required'),
  
  // Identity Document
  documentType: z.enum(['passport', 'national_id', 'drivers_license'], { message: 'Please select document type' }),
  documentNumber: z.string({ message: 'Document number is required' }).min(5, 'Document number must be at least 5 characters'),
  documentExpiry: z.string({ message: 'Document expiry date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date')
    .refine((val) => {
      // 验证证件是否已过期
      const expiryDate = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 只比较日期部分
      return expiryDate >= today;
    }, 'Document has expired'),
  
  // Document Upload Paths (存储到 MinIO 的文件路径，用于持久化)
  passportFrontPath: z.string().optional(),
  idCardFrontPath: z.string().optional(),
  idCardBackPath: z.string().optional(),
  driversLicenseFrontPath: z.string().optional(),
  driversLicenseBackPath: z.string().optional(),
  
  // Liveness Check
  faceImage: z.string().optional(), // base64 image for preview
  faceImagePath: z.string().optional(), // MinIO path for face image (for submission)
  livenessVerified: z.boolean().optional(), // 活体检测是否通过
  livenessVideoPath: z.string().optional(), // MinIO path for liveness video (optional)
  
  // Selfie (手持证照)
  selfie: z.string().optional(), // base64 image for preview
  selfiePath: z.string().optional(), // MinIO path for selfie (for submission)
  
  // Terms
  agreeToTerms: z.boolean({ message: 'You must agree to the terms' }).refine((val) => val === true, 'You must agree to the terms'),
});

export type KycFormData = z.infer<typeof kycSchema>;

export type KycStatus = 
  | 'not_started' 
  | 'draft' 
  | 'submitted' 
  | 'pending_review' 
  | 'approved' 
  | 'rejected';

export interface KycState {
  // Form data
  formData: Partial<KycFormData>;
  
  // Current step (0-3)
  currentStep: number;
  
  // Show landing page
  showLanding: boolean;
  
  // Loading state (正在从后端获取状态)
  isLoading: boolean;
  
  // Submission status
  status: KycStatus;
  submissionId: string | null;
  submittedAt: number | null;
  reviewedAt: number | null;
  rejectionReason: string | null;
  onChainSyncStatus: string | null;
  
  // Draft
  lastSaved: number | null;
  isDirty: boolean;
  
  // Validation
  errors: Record<string, string>;
}

interface KycContextType extends KycState {
  // Form actions
  updateFormData: (data: Partial<KycFormData>) => void;
  validateField: (field: keyof KycFormData) => boolean;
  validateStep: (step: number) => boolean;
  clearErrors: () => void;
  
  // Landing page
  showLandingPage: () => void;
  hideLandingPage: () => void;
  
  // Step navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  // Draft management
  saveDraft: () => void;
  loadDraft: () => void;
  clearDraft: () => void;
  
  // Submission
  submitKyc: () => Promise<boolean>;
  
  // Reset (async - calls backend API)
  reset: () => Promise<void>;
}

const KycContext = React.createContext<KycContextType | undefined>(undefined);

const initialFormData: Partial<KycFormData> = {
  agreeToTerms: false,
};

const initialState: KycState = {
  formData: initialFormData,
  currentStep: 0,
  showLanding: true,
  isLoading: true, // 初始为 loading，等后端返回后再决定显示什么
  status: 'not_started',
  submissionId: null,
  submittedAt: null,
  reviewedAt: null,
  rejectionReason: null,
  onChainSyncStatus: null,
  lastSaved: null,
  isDirty: false,
  errors: {},
};

// 根据钱包地址生成存储 key
const getStorageKey = (address: string | undefined) => {
  if (!address) return null;
  return `supercrypto-kyc-draft-${address.toLowerCase()}`;
};

export function KycProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const [state, setState] = React.useState<KycState>(initialState);
  const formDataRef = React.useRef<Partial<KycFormData>>(initialState.formData);
  const currentAddressRef = React.useRef<string | undefined>(undefined);
  
  // Keep ref in sync with state
  React.useEffect(() => {
    formDataRef.current = state.formData;
  }, [state.formData]);

  // 当钱包地址变化时，先从后端获取 KYC 状态，再加载草稿
  React.useEffect(() => {
    // 如果地址没有变化，跳过
    if (currentAddressRef.current === address) return;
    
    console.log('[KYC] Wallet address changed:', currentAddressRef.current, '->', address);
    currentAddressRef.current = address;
    
    // 重置状态
    setState(initialState);
    formDataRef.current = initialFormData;
    
    // 如果没有钱包地址，不加载草稿
    if (!address) {
      console.log('[KYC] No wallet address, skipping draft load');
      return;
    }

    // 1. 先从后端获取 KYC 状态
    const fetchBackendStatus = async () => {
      try {
        console.log('[KYC] Fetching backend status for address:', address);
        const response = await kycService.getStatus(address);
        console.log('[KYC] Backend status response:', response);
        
        // 映射后端状态到前端状态（使用字符串值避免枚举比较问题）
        const statusMap: Record<string, KycStatus> = {
          'not_started': 'not_started',
          'pending': 'pending_review',
          'approved': 'approved',
          'rejected': 'rejected',
        };
        
        const mappedStatus = statusMap[response.status] || 'not_started';
        console.log('[KYC] Mapped status:', response.status, '->', mappedStatus);
        
        if (mappedStatus !== 'not_started') {
          // 如果已提交/审核中/已通过/已拒绝，直接设置状态，跳过草稿加载
          console.log('[KYC] Backend has KYC record, setting status:', mappedStatus);
          setState((prev) => ({
            ...prev,
            status: mappedStatus,
            showLanding: false, // 已提交的不显示 landing
            isLoading: false, // 加载完成
            submittedAt: response.submitted_at ? new Date(response.submitted_at).getTime() : null,
            reviewedAt: response.reviewed_at ? new Date(response.reviewed_at).getTime() : null,
            rejectionReason: response.reject_reason,
            onChainSyncStatus: response.on_chain_sync_status || null,
          }));
          return; // 不加载本地草稿
        }
      } catch {
        // 404 或其他错误表示没有 KYC 记录，继续加载草稿
        console.log('[KYC] No backend KYC record, will load draft if exists');
      }
      
      // 2. 如果后端没有记录，加载本地草稿
      const storageKey = getStorageKey(address);
      if (!storageKey) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      
      const saved = localStorage.getItem(storageKey);
      console.log('[KYC] Loading draft for address:', address, 'key:', storageKey, 'data:', saved);
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log('[KYC] Parsed draft:', parsed);
          
          // 过滤掉空字符串和 undefined 值，只保留有效数据
          const cleanedFormData: Partial<KycFormData> = {};
          if (parsed.formData) {
            for (const [key, value] of Object.entries(parsed.formData)) {
              // 只保留非空值（但保留 false 布尔值）
              if (value !== '' && value !== undefined && value !== null) {
                (cleanedFormData as Record<string, unknown>)[key] = value;
              }
            }
          }
          
          const loadedFormData = { ...initialFormData, ...cleanedFormData };
          console.log('[KYC] Cleaned and loaded formData:', loadedFormData);
          
          // 同时更新 ref 和 state，确保数据同步
          formDataRef.current = loadedFormData;
          setState((prev) => ({
            ...prev,
            formData: loadedFormData,
            status: parsed.status || 'draft',
            lastSaved: parsed.lastSaved,
            isLoading: false, // 加载完成
          }));
        } catch (e) {
          console.error('[KYC] Failed to parse draft:', e);
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } else {
        // 没有草稿，也要设置 isLoading: false
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchBackendStatus();
  }, [address]);

  // Auto-save draft when form data changes
  React.useEffect(() => {
    if (state.isDirty && address) {
      const storageKey = getStorageKey(address);
      if (!storageKey) return;
      
      const timer = setTimeout(() => {
        // 使用 ref 确保保存最新数据
        const draft = {
          formData: formDataRef.current,
          status: 'draft',
          lastSaved: Date.now(),
        };
        console.log('[KYC] Auto-saving draft for address:', address, 'data:', draft);
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setState((prev) => ({
          ...prev,
          lastSaved: Date.now(),
          isDirty: false,
          status: 'draft',
        }));
      }, 3000); // Auto-save after 3 seconds of inactivity

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [state.formData, state.isDirty, address]);

  const updateFormData = React.useCallback((data: Partial<KycFormData>) => {
    setState((prev) => {
      const newFormData = { ...prev.formData, ...data };
      // 同步更新 ref，确保 nextStep 能获取最新数据
      formDataRef.current = newFormData;
      console.log('[KYC] updateFormData - new data:', data, 'merged:', newFormData);
      return {
        ...prev,
        formData: newFormData,
        isDirty: true,
        errors: {}, // Clear errors on change
      };
    });
  }, []);

  const validateField = React.useCallback((field: keyof KycFormData): boolean => {
    try {
      // 使用 kycSchema.shape 获取字段 schema (Zod 4 API)
      const fieldSchema = kycSchema.shape[field];
      if (!fieldSchema) {
        console.warn(`No schema found for field: ${field}`);
        return true;
      }
      // Use ref to get latest formData
      fieldSchema.parse(formDataRef.current[field]);
      // 验证通过时，删除该字段的错误（而不是设置为空字符串）
      setState((prev) => {
        const newErrors = { ...prev.errors };
        delete newErrors[field];
        return { ...prev, errors: newErrors };
      });
      return true;
    } catch (error) {
      let message = 'Invalid value';
      if (error instanceof z.ZodError) {
        // Zod 4 使用 issues 而不是 errors
        const firstIssue = error.issues?.[0];
        message = firstIssue?.message || 'Invalid value';
      }
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, [field]: message },
      }));
      return false;
    }
  }, []);

  const validateStep = React.useCallback((step: number): boolean => {
    const stepFields: Record<number, (keyof KycFormData)[]> = {
      0: ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'email', 'phone'],
      1: ['addressLine1', 'city', 'state', 'postalCode', 'country', 'documentType', 'documentNumber', 'documentExpiry'],
      2: ['faceImage'],
      3: ['agreeToTerms'],
    };

    const fields = stepFields[step] || [];
    
    // If step is not defined, skip validation
    if (fields.length === 0) {
      return true;
    }
    
    let isValid = true;
    const newErrors: Record<string, string> = {};
    
    // Use ref to get latest formData (avoid stale closure)
    const currentFormData = formDataRef.current;
    
    for (const field of fields) {
      try {
        // 使用 kycSchema.shape 获取字段 schema (Zod 4 API)
        const fieldSchema = kycSchema.shape[field];
        if (!fieldSchema) {
          console.warn(`No schema found for field: ${field}`);
          continue;
        }
        fieldSchema.parse(currentFormData[field]);
      } catch (error) {
        isValid = false;
        if (error instanceof z.ZodError) {
          // Zod 4 使用 issues 而不是 errors
          const firstIssue = error.issues?.[0];
          newErrors[field as string] = firstIssue?.message || 'Invalid value';
        } else {
          newErrors[field as string] = 'This field is required';
        }
      }
    }
    
    // Update errors state
    setState((prev) => ({ ...prev, errors: newErrors }));
    
    return isValid;
  }, []);

  const clearErrors = React.useCallback(() => {
    setState((prev) => ({ ...prev, errors: {} }));
  }, []);

  const goToStep = React.useCallback((step: number) => {
    if (step >= 0 && step <= 3) {
      setState((prev) => ({ ...prev, currentStep: step, errors: {} }));
    }
  }, []);

  const showLandingPage = React.useCallback(() => {
    setState((prev) => ({ ...prev, showLanding: true }));
  }, []);

  const hideLandingPage = React.useCallback(() => {
    setState((prev) => ({ ...prev, showLanding: false }));
  }, []);

  const nextStep = React.useCallback(() => {
    const stepFields: Record<number, (keyof KycFormData)[]> = {
      0: ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'email', 'phone'],
      1: ['addressLine1', 'city', 'state', 'postalCode', 'country', 'documentType', 'documentNumber', 'documentExpiry'],
      2: ['faceImage'],
      3: ['agreeToTerms'],
    };

    setState((prev) => {
      const fields = stepFields[prev.currentStep] || [];
      
      // 合并 ref 和 state 中的数据，确保获取最新值
      // 注意：ref 可能在 setState 回调执行时已经被更新
      const mergedFormData = { ...prev.formData, ...formDataRef.current };
      
      console.log('[KYC] nextStep - mergedFormData:', mergedFormData);
      
      if (fields.length === 0) {
        return {
          ...prev,
          currentStep: Math.min(prev.currentStep + 1, 3),
          showLanding: false,
        };
      }

      let isValid = true;
      const newErrors: Record<string, string> = {};

      for (const field of fields) {
        const fieldValue = mergedFormData[field];
        
        console.log(`[KYC] Validating field "${field}":`, fieldValue, `(type: ${typeof fieldValue})`);
        
        try {
          // 使用 kycSchema.shape 获取字段 schema (Zod 4 API)
          const fieldSchema = kycSchema.shape[field];
          if (!fieldSchema) {
            console.warn(`No schema found for field: ${field}`);
            continue;
          }
          fieldSchema.parse(fieldValue);
        } catch (error) {
          isValid = false;
          if (error instanceof z.ZodError) {
            // Zod 4 使用 issues 而不是 errors
            const firstIssue = error.issues?.[0];
            newErrors[field as string] = firstIssue?.message || 'Invalid value';
          } else {
            newErrors[field as string] = 'This field is required';
          }
        }
      }

      console.log('[KYC] Validation result:', { isValid, newErrors });

      if (isValid) {
        return {
          ...prev,
          currentStep: Math.min(prev.currentStep + 1, 3),
          showLanding: false,
          errors: {},
        };
      } else {
        return { ...prev, errors: newErrors };
      }
    });
  }, []);

  const prevStep = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
      errors: {}, // 切换步骤时清除错误
    }));
  }, []);

  const saveDraft = React.useCallback(() => {
    if (!address) {
      console.log('[KYC] Cannot save draft: no wallet address');
      return;
    }
    
    const storageKey = getStorageKey(address);
    if (!storageKey) return;
    
    // 使用 ref 确保保存最新数据
    const draft = {
      formData: formDataRef.current,
      status: 'draft',
      lastSaved: Date.now(),
    };
    console.log('[KYC] Saving draft for address:', address, 'data:', draft);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    setState((prev) => ({
      ...prev,
      lastSaved: Date.now(),
      isDirty: false,
      status: 'draft',
    }));
  }, [address]);

  const loadDraft = React.useCallback(() => {
    if (!address) {
      console.log('[KYC] Cannot load draft: no wallet address');
      return;
    }
    
    const storageKey = getStorageKey(address);
    if (!storageKey) return;
    
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 过滤掉空字符串和 undefined 值
        const cleanedFormData: Partial<KycFormData> = {};
        if (parsed.formData) {
          for (const [key, value] of Object.entries(parsed.formData)) {
            if (value !== '' && value !== undefined && value !== null) {
              (cleanedFormData as Record<string, unknown>)[key] = value;
            }
          }
        }
        const loadedFormData = { ...initialFormData, ...cleanedFormData };
        // 同时更新 ref 和 state
        formDataRef.current = loadedFormData;
        setState((prev) => ({
          ...prev,
          formData: loadedFormData,
          status: 'draft',
          lastSaved: parsed.lastSaved,
        }));
      } catch {
        // Ignore parse errors
      }
    }
  }, [address]);

  const clearDraft = React.useCallback(() => {
    if (address) {
      const storageKey = getStorageKey(address);
      if (storageKey) {
        localStorage.removeItem(storageKey);
        console.log('[KYC] Cleared draft for address:', address);
      }
    }
    setState((prev) => ({
      ...prev,
      formData: initialFormData,
      lastSaved: null,
      isDirty: false,
    }));
  }, [address]);

  const submitKyc = React.useCallback(async (): Promise<boolean> => {
    if (!validateStep(3)) return false;
    if (!address) {
      console.error('[KYC] Cannot submit: no wallet address');
      return false;
    }

    try {
      const data = formDataRef.current;
      
      // 构建多证件格式的请求数据
      const documents: KycDocumentInfo[] = [];
      
      // 根据 documentType 构建证件信息
      const docType = data.documentType;
      if (docType) {
        // 映射前端文档类型到后端 id_type
        const idTypeMap: Record<string, KycIdType> = {
          'passport': 'passport',
          'national_id': 'id_card',
          'drivers_license': 'drivers_license',
        };
        
        // 获取上传的文件路径
        let frontUrl = '';
        let backUrl: string | undefined;
        
        if (docType === 'passport') {
          frontUrl = data.passportFrontPath || '';
        } else if (docType === 'national_id') {
          frontUrl = data.idCardFrontPath || '';
          backUrl = data.idCardBackPath;
        } else if (docType === 'drivers_license') {
          frontUrl = data.driversLicenseFrontPath || '';
          backUrl = data.driversLicenseBackPath;
        }
        
        if (frontUrl) {
          documents.push({
            id_type: idTypeMap[docType] || 'passport',
            id_number: data.documentNumber || '',
            document_expiry: data.documentExpiry || '',
            id_front_url: frontUrl,
            ...(backUrl ? { id_back_url: backUrl } : {}),
          });
        }
      }
      
      // 构建 API 请求
      // 注意: selfie_url 应该是 MinIO 文件路径，不是 base64
      // faceImage 是 base64 数据，用于预览
      // faceImagePath 是 MinIO 路径，用于提交
      const request: KycApplyRequest = {
        full_name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        date_of_birth: data.dateOfBirth || '',
        country_code: (data.nationality || '').toUpperCase().slice(0, 2),
        documents,
        ...(data.selfiePath ? { selfie_url: data.selfiePath } : {}),
        ...(data.faceImagePath ? { face_image_url: data.faceImagePath } : {}),
        ...(data.livenessVideoPath ? { liveness_video_url: data.livenessVideoPath } : {}),
      };
      
      console.log('[KYC] Submitting request:', request);
      
      // 调用后端 API
      const response = await applyKyc(request);
      console.log('[KYC] Submit response:', response);
      
      const submissionId = `KYC-${response.id}`;
      
      setState((prev) => ({
        ...prev,
        status: 'submitted',
        submissionId,
        submittedAt: Date.now(),
        isDirty: false,
      }));

      // Clear draft after successful submission
      const storageKey = getStorageKey(address);
      if (storageKey) {
        localStorage.removeItem(storageKey);
        console.log('[KYC] Cleared draft after submission for address:', address);
      }
      
      return true;
    } catch (error) {
      console.error('KYC submission failed:', error);
      return false;
    }
  }, [validateStep, address]);

  const reset = React.useCallback(async () => {
    console.log('[KYC] Reset called, updating backend status and clearing local state');
    
    // 1. 先调用后端 API 更新状态
    try {
      await kycService.updateStatus('not_started');
      console.log('[KYC] Backend status updated to not_started');
    } catch (error) {
      console.error('[KYC] Failed to update backend status:', error);
      // 即使后端更新失败，也继续重置本地状态
      // 用户可以重新尝试
    }
    
    // 2. 清除本地草稿
    if (address) {
      const storageKey = getStorageKey(address);
      if (storageKey) {
        localStorage.removeItem(storageKey);
        console.log('[KYC] Cleared draft from localStorage');
      }
    }
    
    // 3. 重置 formDataRef
    formDataRef.current = initialFormData;
    
    // 4. 重置本地状态，允许用户重新填写表单
    setState({
      ...initialState,
      formData: initialFormData,
      currentStep: 0,
      showLanding: false, // 直接显示表单，不显示 landing 页面
      isLoading: false,
      status: 'not_started',
      submissionId: null,
      submittedAt: null,
      reviewedAt: null,
      rejectionReason: null,
      lastSaved: null,
      isDirty: false,
      errors: {},
    });
    
    console.log('[KYC] State reset complete, form should now be visible');
  }, [address]);

  const value: KycContextType = {
    ...state,
    updateFormData,
    validateField,
    validateStep,
    clearErrors,
    showLandingPage,
    hideLandingPage,
    goToStep,
    nextStep,
    prevStep,
    saveDraft,
    loadDraft,
    clearDraft,
    submitKyc,
    reset,
  };

  return (
    <KycContext.Provider value={value}>
      {children}
    </KycContext.Provider>
  );
}

export function useKycContext() {
  const context = React.useContext(KycContext);
  if (!context) {
    throw new Error('useKycContext must be used within KycProvider');
  }
  return context;
}
