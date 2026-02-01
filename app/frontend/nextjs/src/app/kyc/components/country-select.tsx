'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Globe, ChevronDown } from 'lucide-react';
import * as Flags from 'country-flag-icons/react/3x2';

// Country data - labels will be translated
const countryData = [
  { value: '', labelKey: 'kyc.basicInfo.selectNationality' },
  { value: 'US', labelKey: 'kyc.basicInfo.countries.US' },
  { value: 'CN', labelKey: 'kyc.basicInfo.countries.CN' },
  { value: 'GB', labelKey: 'kyc.basicInfo.countries.GB' },
  { value: 'DE', labelKey: 'kyc.basicInfo.countries.DE' },
  { value: 'FR', labelKey: 'kyc.basicInfo.countries.FR' },
  { value: 'JP', labelKey: 'kyc.basicInfo.countries.JP' },
  { value: 'SG', labelKey: 'kyc.basicInfo.countries.SG' },
  { value: 'CA', labelKey: 'kyc.basicInfo.countries.CA' },
  { value: 'AU', labelKey: 'kyc.basicInfo.countries.AU' },
  { value: 'CH', labelKey: 'kyc.basicInfo.countries.CH' },
  { value: 'KR', labelKey: 'kyc.basicInfo.countries.KR' },
  { value: 'IN', labelKey: 'kyc.basicInfo.countries.IN' },
  { value: 'BR', labelKey: 'kyc.basicInfo.countries.BR' },
  { value: 'RU', labelKey: 'kyc.basicInfo.countries.RU' },
  { value: 'AE', labelKey: 'kyc.basicInfo.countries.AE' },
  { value: 'HK', labelKey: 'kyc.basicInfo.countries.HK' },
  { value: 'TW', labelKey: 'kyc.basicInfo.countries.TW' },
];

// 获取国旗组件
function getFlagComponent(code: string): React.ComponentType<{ className?: string }> | null {
  if (!code) return null;
  const FlagComponent = (Flags as Record<string, React.ComponentType<{ className?: string }>>)[code];
  return FlagComponent || null;
}

interface CountrySelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: () => void;
  error?: string;
}

export function CountrySelect({ value, onChange, onBlur, error }: CountrySelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);
  
  // 生成带翻译的国家列表
  const countries = countryData.map(c => ({
    value: c.value,
    label: t(c.labelKey, c.value || 'Select nationality'),
  }));

  const selectedCountry = countries.find((c) => c.value === value);
  const FlagIcon = getFlagComponent(value);

  // 点击外部关闭下拉
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (countryValue: string) => {
    // 创建一个模拟的 change event
    const event = {
      target: { value: countryValue },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(event);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={selectRef}>
      {/* 自定义下拉触发器 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={onBlur}
        className={cn(
          'w-full h-10 pl-10 pr-10 rounded-lg bg-white/5 border text-white text-left focus:outline-none transition-colors flex items-center',
          error
            ? 'border-red-500 focus:border-red-400 ring-1 ring-red-500/20'
            : 'border-white/10 focus:border-[#00D4AA]/50'
        )}
      >
        {/* Globe icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
          <Globe className="h-4 w-4" />
        </div>

        {/* 选中的国旗和名称 */}
        <span className="flex items-center gap-2 truncate">
          {FlagIcon && <FlagIcon className="w-5 h-4 rounded-sm flex-shrink-0" />}
          <span className={value ? 'text-white' : 'text-white/30'}>
            {selectedCountry?.label || t('kyc.basicInfo.selectNationality', 'Select nationality')}
          </span>
        </span>

        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
          <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
        </div>
      </button>

      {/* 下拉选项列表 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 py-1 bg-[#1a1f1c] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-auto">
          {countries.map((country) => {
            const CountryFlag = getFlagComponent(country.value);
            const isSelected = country.value === value;
            
            return (
              <button
                key={country.value}
                type="button"
                onClick={() => handleSelect(country.value)}
                className={cn(
                  'w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-white/10 transition-colors',
                  isSelected && 'bg-[#00D4AA]/10 text-[#00D4AA]',
                  !isSelected && 'text-white'
                )}
              >
                {CountryFlag ? (
                  <CountryFlag className="w-5 h-4 rounded-sm flex-shrink-0" />
                ) : (
                  <div className="w-5 h-4 flex-shrink-0" />
                )}
                <span className="truncate">{country.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Get flag component by country code
export function getCountryFlag(code: string): React.ComponentType<{ className?: string }> | null {
  return getFlagComponent(code);
}

export { countryData as countries };
