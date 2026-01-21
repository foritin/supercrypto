'use client';

import React from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * LOGO WALL - 合作伙伴/支持的链动画墙
 * 用途: 展示集成的区块链和合作伙伴，增强信任感
 * 使用: <LogoWall />
 * ════════════════════════════════════════════════════════════════
 */

interface Logo {
  name: string;
  icon: string;
  color: string;
}

const logos: Logo[] = [
  { name: 'Ethereum', icon: '⟠', color: '#627EEA' },
  { name: 'BSC', icon: '⬡', color: '#F0B90B' },
  { name: 'Polygon', icon: '⬡', color: '#8247E5' },
  { name: 'Arbitrum', icon: '◈', color: '#28A0F0' },
  { name: 'Optimism', icon: '○', color: '#FF0420' },
  { name: 'Avalanche', icon: '△', color: '#E84142' },
  { name: 'Base', icon: '◇', color: '#0052FF' },
  { name: 'Solana', icon: '◎', color: '#00FFA3' },
];

interface LogoWallProps {
  className?: string;
  style?: React.CSSProperties;
}

export const LogoWall: React.FC<LogoWallProps> = ({
  className = '',
  style,
}) => {
  return (
    <div
      className={`logo-wall ${className}`}
      style={{
        padding: '60px 24px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        ...style,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h3
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Powered by Leading Blockchains
          </h3>
        </div>

        {/* Logos */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-6 sm:gap-8 md:gap-12 justify-items-center">
          {logos.map((logo, index) => (
            <div key={logo.name}>
              <div
                className="logo-item"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px 10px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.background = `${logo.color}15`;
                  e.currentTarget.style.borderColor = `${logo.color}40`;
                  e.currentTarget.style.boxShadow = `0 8px 24px ${logo.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Logo Icon */}
                <div
                  style={{
                    fontSize: 36,
                    color: logo.color,
                    marginBottom: 8,
                    textShadow: `0 0 20px ${logo.color}40`,
                  }}
                >
                  {logo.icon}
                </div>

                {/* Logo Name */}
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: 11,
                    fontWeight: 500,
                    textAlign: 'center',
                  }}
                >
                  {logo.name}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Message */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: 12,
              margin: 0,
            }}
          >
            Multi-chain support for maximum flexibility and security
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .logo-item:hover {
          transform: translateY(-5px);
        }

        @media (max-width: 768px) {
          .logo-item {
            padding: 16px 8px;
          }

          .logo-item > div:first-child {
            font-size: 28px;
          }

          .logo-item > div:last-child {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};
