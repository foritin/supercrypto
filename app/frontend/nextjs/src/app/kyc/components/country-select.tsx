'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Globe, ChevronDown, Check } from 'lucide-react';
import US from 'country-flag-icons/react/3x2/US';
import CN from 'country-flag-icons/react/3x2/CN';
import GB from 'country-flag-icons/react/3x2/GB';
import DE from 'country-flag-icons/react/3x2/DE';
import FR from 'country-flag-icons/react/3x2/FR';
import JP from 'country-flag-icons/react/3x2/JP';
import SG from 'country-flag-icons/react/3x2/SG';
import CA from 'country-flag-icons/react/3x2/CA';
import AU from 'country-flag-icons/react/3x2/AU';
import CH from 'country-flag-icons/react/3x2/CH';

// 国旗组件映射
const flagComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  US, CN, GB, DE, FR, JP, SG, CA, AU, CH,
};

// 国家列表
const countries = [
  { code: 'US', labelKey: 'kyc.basicInfo.countries.US' },
  { code: 'CN', labelKey: 'kyc.basicInfo.countries.CN' },
  { code: 'GB', labelKey: 'kyc.basicInfo.countries.GB' },
  { code: 'DE', labelKey: 'kyc.basicInfo.countries.DE' },
  { code: 'FR', labelKey: 'kyc.basicInfo.countries.FR' },
  { code: 'JP', labelKey: 'kyc.basicInfo.countries.JP' },
  { code: 'SG', labelKey: 'kyc.basicInfo.countries.SG' },
  { code: 'CA', labelKey: 'kyc.basicInfo.countries.CA' },
  { code: 'AU', labelKey: 'kyc.basicInfo.countries.AU' },
  { code: 'CH', labelKey: 'kyc.basicInfo.countries.CH' },
];

interface CountrySelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onBlur?: () => void;
  error?: string | undefined;
  placeholder?: string;
}

export function CountrySelect({ value, onChange, onBlur, error, placeholder }: CountrySelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const selectedCountry = countries.find(c => c.code === value);
  const FlagComponent = value ? flagComponents[value] : null;

  const handleSelect = (code: string) => {
    // 模拟 select 的 onChange 事件
    const syntheticEvent = {
      target: { value: code },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full h-10 px-4 rounded-lg bg-white/5 border text-left flex items-center gap-3 transition-colors',
          error 
            ? 'border-red-500 focus:border-red-400 ring-1 ring-red-500/20' 
            : 'border-white/10 hover:border-white/20 focus:border-primary/50',
        )}
      >
        {/* 图标 */}
        <div className="text-white/40">
          {FlagComponent ? (
            <FlagComponent className="w-5 h-4 rounded-sm" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
        </div>
        
        {/* 文本 */}
        <span className={cn(
          'flex-1',
          value ? 'text-white' : 'text-white/30'
        )}>
          {selectedCountry 
            ? t(selectedCountry.labelKey, selectedCountry.code)
            : placeholder || t('kyc.basicInfo.selectNationality')
          }
        </span>
        
        {/* 下拉箭头 */}
        <ChevronDown className={cn(
          'h-4 w-4 text-white/40 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* 下拉列表 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 py-1 rounded-lg bg-[#1a1f1c] border border-white/10 shadow-xl max-h-60 overflow-auto">
          {countries.map((country) => {
            const Flag = flagComponents[country.code];
            const isSelected = value === country.code;
            
            return (
              <button
                key={country.code}
                type="button"
                onClick={() => handleSelect(country.code)}
                className={cn(
                  'w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors',
                  isSelected 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-white hover:bg-white/5'
                )}
              >
                {Flag && <Flag className="w-5 h-4 rounded-sm flex-shrink-0" />}
                <span className="flex-1">{t(country.labelKey, country.code)}</span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
