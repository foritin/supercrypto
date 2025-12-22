'use client';

import { motion } from 'framer-motion';

/**
 * 高级Web3背景 - Premium Edition
 * 特性：多层径向渐变、动态网格、浮动光点、脉动动画
 */
export const PremiumBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base层 - 深邃渐变背景 */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(240, 147, 251, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(79, 172, 254, 0.1) 0%, transparent 50%),
            linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)
          `,
        }}
      />

      {/* 动态网格层 */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(102, 126, 234, 0.12) 1.5px, transparent 1.5px),
            linear-gradient(90deg, rgba(102, 126, 234, 0.12) 1.5px, transparent 1.5px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 75%)',
        }}
        animate={{
          y: [0, 60],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* 浮动光点层 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(102, 126, 234, 0.4) 0%, transparent 25%),
            radial-gradient(circle at 80% 70%, rgba(240, 147, 251, 0.4) 0%, transparent 25%),
            radial-gradient(circle at 50% 50%, rgba(79, 172, 254, 0.3) 0%, transparent 30%)
          `,
        }}
        animate={{
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 大粒子 - 浮动光球 */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: `${10 + (i * 7)}%`,
              top: `${15 + (i * 6)}%`,
              background: `radial-gradient(circle, ${
                i % 3 === 0 ? '#667eea' : i % 3 === 1 ? '#f093fb' : '#4facfe'
              }, transparent)`,
              boxShadow: `0 0 30px ${
                i % 3 === 0 ? 'rgba(102,126,234,0.8)' : i % 3 === 1 ? 'rgba(240,147,251,0.8)' : 'rgba(79,172,254,0.8)'
              }`,
            }}
            animate={{
              y: [0, -40, 0],
              x: [0, (i % 2 === 0 ? 20 : -20), 0],
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.9, 0.3],
            }}
            transition={{
              duration: 5 + (i * 0.3),
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* 小粒子 - 星尘效果 */}
      <div className="absolute inset-0">
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={`small-${i}`}
            className="absolute w-1 h-1 rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.2,
            }}
            animate={{
              opacity: [0.1, 0.5, 0.1],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* 霓虹光束 */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-0 left-1/4 w-1 h-full"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(102,126,234,0.3), transparent)',
          }}
          animate={{
            x: ['-100vw', '200vw'],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute top-0 right-1/3 w-1 h-full"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(240,147,251,0.3), transparent)',
          }}
          animate={{
            x: ['100vw', '-200vw'],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'linear',
            delay: 3,
          }}
        />
      </div>

      {/* 底部渐变遮罩 */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(10,10,15,0.8))',
        }}
      />
    </div>
  );
};

