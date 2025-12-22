'use client';

/**
 * 精简背景组件 - V3 Refined Edition
 * 设计原则: 极简、不喧宾夺主
 */
export const RefinedBackground: React.FC<{ withGrid?: boolean }> = ({ 
  withGrid = false 
}) => {
  return (
    <div className={`refined-background ${withGrid ? 'with-grid' : ''}`} />
  );
};

