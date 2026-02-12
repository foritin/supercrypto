'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string | undefined;
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
  error?: string | undefined;
  icon?: React.ReactNode;
}

export function FormInput({ error, icon, className, type, ...props }: FormInputProps) {
  const isDateInput = type === 'date';
  const hasValue = props.value && String(props.value).length > 0;
  
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none z-10">
          {icon}
        </div>
      )}
      <input
        type={type}
        className={cn(
          'w-full h-10 px-4 rounded-lg bg-white/5 border text-white placeholder:text-white/30 focus:outline-none transition-colors',
          icon && 'pl-10',
          error 
            ? 'border-red-500 focus:border-red-400 ring-1 ring-red-500/20' 
            : 'border-white/10 focus:border-primary/50',
          // 日期输入框样式
          isDateInput && [
            // 日历图标样式 - 使用 brightness 和 invert 让图标变白
            '[&::-webkit-calendar-picker-indicator]:brightness-0',
            '[&::-webkit-calendar-picker-indicator]:invert',
            '[&::-webkit-calendar-picker-indicator]:opacity-60',
            '[&::-webkit-calendar-picker-indicator]:hover:opacity-100',
            '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
            // 隐藏原生日期文本（年/月/日）当没有值时 - 使用 color: transparent 更可靠
            !hasValue && '[color:transparent]',
            !hasValue && '[&::-webkit-datetime-edit]:opacity-0',
            !hasValue && '[&::-webkit-datetime-edit-fields-wrapper]:opacity-0',
            !hasValue && '[&::-webkit-datetime-edit-text]:opacity-0',
            !hasValue && '[&::-webkit-datetime-edit-month-field]:opacity-0',
            !hasValue && '[&::-webkit-datetime-edit-day-field]:opacity-0',
            !hasValue && '[&::-webkit-datetime-edit-year-field]:opacity-0',
            // 有值时显示正常颜色
            hasValue && '[color:white]',
          ],
          className
        )}
        {...props}
      />
      {/* 自定义 placeholder 覆盖层 */}
      {isDateInput && !hasValue && (
        <div className="absolute left-10 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
          YYYY-MM-DD
        </div>
      )}
    </div>
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | undefined;
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
            : 'border-white/10 focus:border-primary/50',
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
