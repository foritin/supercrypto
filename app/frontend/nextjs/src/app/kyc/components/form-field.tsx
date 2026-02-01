'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  helperText?: string;
}

export function FormField({ label, required, error, children, helperText }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-red-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-white/40">{helperText}</p>
      ) : null}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export function FormInput({ error, icon, className, ...props }: FormInputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
          {icon}
        </div>
      )}
      <input
        className={cn(
          'w-full h-10 px-4 rounded-lg bg-white/5 border text-white placeholder:text-white/30 focus:outline-none transition-colors',
          icon && 'pl-10',
          error 
            ? 'border-red-500 focus:border-red-400 ring-1 ring-red-500/20' 
            : 'border-white/10 focus:border-[#00D4AA]/50',
          className
        )}
        {...props}
      />
    </div>
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
}

export function FormSelect({ error, icon, options, className, ...props }: FormSelectProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
          {icon}
        </div>
      )}
      <select
        className={cn(
          'w-full h-10 px-4 rounded-lg bg-white/5 border text-white appearance-none focus:outline-none transition-colors',
          icon && 'pl-10',
          error 
            ? 'border-red-500 focus:border-red-400 ring-1 ring-red-500/20' 
            : 'border-white/10 focus:border-[#00D4AA]/50',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#111815]">
            {opt.label}
          </option>
        ))}
      </select>
      {/* Dropdown arrow */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
