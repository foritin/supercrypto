'use client';

import * as React from 'react';
import { z } from 'zod';

// KYC Form Validation Schema (Zod 4 使用 message 参数)
export const kycSchema = z.object({
  // Basic Info
  firstName: z.string({ message: 'First name is required' }).min(2, 'First name must be at least 2 characters'),
  lastName: z.string({ message: 'Last name is required' }).min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string({ message: 'Date of birth is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date'),
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
  documentExpiry: z.string({ message: 'Document expiry date is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date'),
  
  // Liveness Check
  faceImage: z.string().optional(), // base64 image
  
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
  
  // Submission status
  status: KycStatus;
  submissionId: string | null;
  submittedAt: number | null;
  reviewedAt: number | null;
  rejectionReason: string | null;
  
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
  
  // Reset
  reset: () => void;
}

const KycContext = React.createContext<KycContextType | undefined>(undefined);

const initialFormData: Partial<KycFormData> = {
  agreeToTerms: false,
};

const initialState: KycState = {
  formData: initialFormData,
  currentStep: 0,
  showLanding: true,
  status: 'not_started',
  submissionId: null,
  submittedAt: null,
  reviewedAt: null,
  rejectionReason: null,
  lastSaved: null,
  isDirty: false,
  errors: {},
};

const STORAGE_KEY = 'supercrypto-kyc-draft';

export function KycProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<KycState>(initialState);
  const formDataRef = React.useRef<Partial<KycFormData>>(initialState.formData);
  const isInitializedRef = React.useRef(false);
  
  // Keep ref in sync with state
  React.useEffect(() => {
    formDataRef.current = state.formData;
  }, [state.formData]);

  // Load draft on mount (client-side only)
  React.useEffect(() => {
    // 防止重复初始化
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('[KYC] Loading draft from localStorage:', saved);
    
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
              cleanedFormData[key as keyof KycFormData] = value as KycFormData[keyof KycFormData];
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
        }));
      } catch (e) {
        console.error('[KYC] Failed to parse draft:', e);
      }
    }
  }, []);

  // Auto-save draft when form data changes
  React.useEffect(() => {
    if (state.isDirty) {
      const timer = setTimeout(() => {
        // 使用 ref 确保保存最新数据
        const draft = {
          formData: formDataRef.current,
          status: 'draft',
          lastSaved: Date.now(),
        };
        console.log('[KYC] Auto-saving draft:', draft);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setState((prev) => ({
          ...prev,
          lastSaved: Date.now(),
          isDirty: false,
          status: 'draft',
        }));
      }, 3000); // Auto-save after 3 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [state.formData, state.isDirty]);

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
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, [field]: '' },
      }));
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
      setState((prev) => ({ ...prev, currentStep: step }));
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
    }));
  }, []);

  const saveDraft = React.useCallback(() => {
    // 使用 ref 确保保存最新数据
    const draft = {
      formData: formDataRef.current,
      status: 'draft',
      lastSaved: Date.now(),
    };
    console.log('[KYC] Saving draft:', draft);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setState((prev) => ({
      ...prev,
      lastSaved: Date.now(),
      isDirty: false,
      status: 'draft',
    }));
  }, []);

  const loadDraft = React.useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 过滤掉空字符串和 undefined 值
        const cleanedFormData: Partial<KycFormData> = {};
        if (parsed.formData) {
          for (const [key, value] of Object.entries(parsed.formData)) {
            if (value !== '' && value !== undefined && value !== null) {
              cleanedFormData[key as keyof KycFormData] = value as KycFormData[keyof KycFormData];
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
  }, []);

  const clearDraft = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({
      ...prev,
      formData: initialFormData,
      lastSaved: null,
      isDirty: false,
    }));
  }, []);

  const submitKyc = React.useCallback(async (): Promise<boolean> => {
    if (!validateStep(3)) return false;

    try {
      // In production, this would call the backend API
      const submissionId = `KYC-${Date.now()}`;
      
      setState((prev) => ({
        ...prev,
        status: 'submitted',
        submissionId,
        submittedAt: Date.now(),
        isDirty: false,
      }));

      // Clear draft after successful submission
      localStorage.removeItem(STORAGE_KEY);
      
      return true;
    } catch (error) {
      console.error('KYC submission failed:', error);
      return false;
    }
  }, [validateStep]);

  const reset = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(initialState);
  }, []);

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
