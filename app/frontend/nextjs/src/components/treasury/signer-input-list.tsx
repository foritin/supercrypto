'use client';

import { useState, useCallback } from 'react';
import { X, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, truncateAddress } from '@/lib/utils';

interface SignerInput {
  id: string;
  address: string;
  name?: string;
  isValid: boolean;
  isChecking: boolean;
}

interface SignerInputListProps {
  signers: string[];
  onChange: (signers: string[]) => void;
  maxSigners?: number;
  minSigners?: number;
}

/**
 * 签名者输入列表组件
 * 支持动态添加/删除签名者地址，带地址验证
 */
export function SignerInputList({
  signers: externalSigners,
  onChange,
  maxSigners = 10,
  minSigners = 2,
}: SignerInputListProps) {
  // Initialize with external signers or default empty inputs
  const [inputs, setInputs] = useState<SignerInput[]>(() => {
    if (externalSigners.length > 0) {
      return externalSigners.map((address, index) => ({
        id: `signer-${index}`,
        address,
        isValid: isValidEthereumAddress(address),
        isChecking: false,
      }));
    }
    // Default: 3 empty inputs
    return Array.from({ length: 3 }, (_, i) => ({
      id: `signer-${i}`,
      address: '',
      isValid: false,
      isChecking: false,
    }));
  });

  // Validate Ethereum address
  function isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Check if address is a valid signer (mock validation)
  const validateAddress = useCallback(async (address: string): Promise<boolean> => {
    if (!isValidEthereumAddress(address)) return false;
    
    // Simulate API call to check if address exists in system
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock: accept any valid address format
    return true;
  }, []);

  // Update input and validate
  const handleInputChange = useCallback(async (id: string, value: string) => {
    setInputs(prev => prev.map(input => 
      input.id === id 
        ? { ...input, address: value, isChecking: true }
        : input
    ));

    const isValid = await validateAddress(value);

    setInputs(prev => {
      const newInputs = prev.map(input => 
        input.id === id 
          ? { ...input, isValid, isChecking: false }
          : input
      );
      
      // Notify parent of valid addresses
      const validAddresses = newInputs
        .filter(i => i.isValid)
        .map(i => i.address);
      onChange(validAddresses);
      
      return newInputs;
    });
  }, [onChange, validateAddress]);

  // Add new signer input
  const handleAddSigner = useCallback(() => {
    if (inputs.length >= maxSigners) return;
    
    setInputs(prev => [
      ...prev,
      {
        id: `signer-${Date.now()}`,
        address: '',
        isValid: false,
        isChecking: false,
      },
    ]);
  }, [inputs.length, maxSigners]);

  // Remove signer input
  const handleRemoveSigner = useCallback((id: string) => {
    if (inputs.length <= minSigners) return;
    
    setInputs(prev => {
      const newInputs = prev.filter(input => input.id !== id);
      const validAddresses = newInputs
        .filter(i => i.isValid)
        .map(i => i.address);
      onChange(validAddresses);
      return newInputs;
    });
  }, [inputs.length, minSigners, onChange]);

  const validCount = inputs.filter(i => i.isValid).length;

  return (
    <div className="space-y-4">
      {/* Signer Inputs */}
      <AnimatePresence mode="popLayout">
        {inputs.map((input, index) => (
          <motion.div
            key={input.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
              input.isValid 
                ? "bg-emerald-500/5 border-emerald-500/20" 
                : input.address && !input.isChecking
                  ? "bg-rose-500/5 border-rose-500/20"
                  : "bg-white/[0.02] border-white/[0.06]"
            )}>
              {/* Index Badge */}
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium shrink-0",
                input.isValid 
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-white/5 text-white/40"
              )}>
                {index + 1}
              </div>

              {/* Input Field */}
              <div className="flex-1 min-w-0">
                <Input
                  value={input.address}
                  onChange={(e) => handleInputChange(input.id, e.target.value)}
                  placeholder="0x..."
                  className={cn(
                    "bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-sm",
                    input.isValid && "text-emerald-400"
                  )}
                />
                {input.isValid && (
                  <div className="text-xs text-emerald-400/70 mt-0.5">
                    {truncateAddress(input.address)} - Validated
                  </div>
                )}
              </div>

              {/* Status Icon */}
              <div className="shrink-0">
                {input.isChecking ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                ) : input.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : input.address ? (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                ) : null}
              </div>

              {/* Remove Button */}
              {inputs.length > minSigners && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSigner(input.id)}
                  className="shrink-0 h-8 w-8 text-white/40 hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Signer Button */}
      {inputs.length < maxSigners && (
        <Button
          variant="outline"
          onClick={handleAddSigner}
          className="w-full border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] text-white/60"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Signer ({inputs.length}/{maxSigners})
        </Button>
      )}

      {/* Validation Summary */}
      <div className={cn(
        "text-sm flex items-center gap-2",
        validCount >= minSigners ? "text-emerald-400/70" : "text-amber-400/70"
      )}>
        {validCount >= minSigners ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <AlertCircle className="w-4 h-4" />
        )}
        <span>
          {validCount} of {inputs.length} valid addresses 
          {validCount < minSigners && ` (minimum ${minSigners} required)`}
        </span>
      </div>
    </div>
  );
}
