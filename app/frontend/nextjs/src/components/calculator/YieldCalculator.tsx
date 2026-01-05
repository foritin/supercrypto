'use client';

import React, { useState, useMemo } from 'react';
import { Card, Input, Slider, Typography, Row, Col, Statistic } from 'antd';
import { TrophyOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * ════════════════════════════════════════════════════════════════
 * YIELD CALCULATOR - 收益计算器
 * 用途: 交互式 APY 计算，实时显示预期收益
 * 使用: <YieldCalculator />
 * ════════════════════════════════════════════════════════════════
 */

interface YieldCalculatorProps {
  className?: string;
  style?: React.CSSProperties;
}

export const YieldCalculator: React.FC<YieldCalculatorProps> = ({
  className = '',
  style,
}) => {
  const [principal, setPrincipal] = useState(10000);
  const [apy, setApy] = useState(15);
  const [duration, setDuration] = useState(365);

  // 计算收益
  const calculateYield = useMemo(() => {
    const decimalAPY = apy / 100;
    const dailyRate = decimalAPY / 365;
    const futureValue = principal * Math.pow(1 + dailyRate, duration);
    const profit = futureValue - principal;

    return {
      futureValue,
      profit,
      roi: ((profit / principal) * 100).toFixed(2),
    };
  }, [principal, apy, duration]);

  return (
    <Card
      className={className}
      style={{
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(38, 38, 66, 0.8) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 212, 170, 0.3)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0, 212, 170, 0.2)',
        ...style,
      }}
    >
      {/* 标题区域 */}
      <div style={{
        textAlign: 'center',
        marginBottom: 40,
        paddingBottom: 20,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00D4AA 0%, #00A08C 100%)',
          boxShadow: '0 4px 16px rgba(0, 212, 170, 0.4)',
          marginBottom: 16,
        }}>
          <TrophyOutlined style={{ fontSize: 28, color: '#fff' }} />
        </div>
        <Title
          level={3}
          style={{
            color: '#00D4AA',
            marginBottom: 8,
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          Yield Calculator
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
          Calculate your potential earnings with precision
        </Text>
      </div>

      {/* Investment Amount */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <DollarOutlined style={{ color: '#FFD700', marginRight: 8, fontSize: 16 }} />
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Investment Amount
          </Text>
        </div>
        <Input
          type="number"
          prefix="$"
          value={principal}
          onChange={(e) => setPrincipal(Number(e.target.value))}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            fontSize: 20,
            height: 56,
            borderRadius: 12,
            fontWeight: 600,
          }}
          min={0}
          step={100}
        />
      </div>

      {/* APY Slider */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <RiseOutlined style={{ color: '#FFD700', marginRight: 8, fontSize: 16 }} />
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Expected APY
            </Text>
          </div>
          <Text
            style={{
              color: '#FFD700',
              fontSize: 20,
              fontWeight: 700,
              background: 'rgba(255, 215, 0, 0.15)',
              padding: '4px 16px',
              borderRadius: 20,
            }}
          >
            {apy}%
          </Text>
        </div>
        <Slider
          min={1}
          max={50}
          value={apy}
          onChange={setApy}
          trackStyle={{
            background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)',
            height: 6,
            borderRadius: 3,
          }}
          railStyle={{
            background: 'rgba(255, 255, 255, 0.1)',
            height: 6,
            borderRadius: 3,
          }}
          handleStyle={{
            borderColor: '#FFD700',
            background: '#FFD700',
            boxShadow: '0 2px 8px rgba(255, 215, 0, 0.5)',
            width: 20,
            height: 20,
          }}
        />
      </div>

      {/* Duration Slider */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Duration (Days)
          </Text>
          <Text
            style={{
              color: '#00D4AA',
              fontSize: 20,
              fontWeight: 700,
              background: 'rgba(0, 212, 170, 0.15)',
              padding: '4px 16px',
              borderRadius: 20,
            }}
          >
            {duration} days
          </Text>
        </div>
        <Slider
          min={30}
          max={365}
          value={duration}
          onChange={setDuration}
          trackStyle={{
            background: 'linear-gradient(90deg, #00D4AA 0%, #00A08C 100%)',
            height: 6,
            borderRadius: 3,
          }}
          railStyle={{
            background: 'rgba(255, 255, 255, 0.1)',
            height: 6,
            borderRadius: 3,
          }}
          handleStyle={{
            borderColor: '#00D4AA',
            background: '#00D4AA',
            boxShadow: '0 2px 8px rgba(0, 212, 170, 0.5)',
            width: 20,
            height: 20,
          }}
          marks={{
            30: { style: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }, label: '30' },
            90: { style: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }, label: '90' },
            180: { style: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }, label: '180' },
            365: { style: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }, label: '365' },
          }}
        />
      </div>

      {/* Results */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.15) 0%, rgba(0, 160, 140, 0.15) 100%)',
          borderRadius: 16,
          padding: '28px',
          border: '1px solid rgba(0, 212, 170, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 150,
          height: 150,
          background: 'radial-gradient(circle, rgba(0, 212, 170, 0.2) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />

        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 13,
                display: 'block',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                Total Value
              </Text>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#00D4AA',
                textShadow: '0 2px 8px rgba(0, 212, 170, 0.3)',
              }}>
                ${calculateYield.futureValue.toFixed(2)}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 13,
                display: 'block',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                Profit
              </Text>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#FFD700',
                textShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
              }}>
                ${calculateYield.profit.toFixed(2)}
              </div>
            </div>
          </Col>
          <Col xs={24}>
            <div
              style={{
                textAlign: 'center',
                paddingTop: 20,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
                Return on Investment (ROI):{' '}
                <span style={{
                  color: '#FFD700',
                  fontSize: 22,
                  fontWeight: 700,
                  textShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
                }}>
                  {calculateYield.roi}%
                </span>
              </Text>
            </div>
          </Col>
        </Row>
      </div>
    </Card>
  );
};
