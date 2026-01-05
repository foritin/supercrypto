'use client';

import React, { useState, useMemo } from 'react';
import { Card, Input, Slider, Typography, Row, Col, Statistic } from 'antd';
import { TrophyOutlined, DollarOutlined } from '@ant-design/icons';

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
      className={`glass-card-enhanced ${className}`}
      style={{
        background: 'rgba(26, 26, 46, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        ...style,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title
          level={3}
          style={{
            color: '#00D4AA',
            marginBottom: 8,
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          <TrophyOutlined style={{ marginRight: 12 }} />
          Yield Calculator
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 16 }}>
          Calculate your potential earnings
        </Text>
      </div>

      {/* Principal Input */}
      <div style={{ marginBottom: 32 }}>
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: 14,
            fontWeight: 600,
            display: 'block',
            marginBottom: 12,
          }}
        >
          Investment Amount (USD)
        </Text>
        <Input
          type="number"
          prefix={<DollarOutlined />}
          value={principal}
          onChange={(e) => setPrincipal(Number(e.target.value))}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: 18,
            height: 50,
          }}
          min={0}
          step={100}
        />
      </div>

      {/* APY Slider */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Expected APY
          </Text>
          <Text
            style={{
              color: '#FFD700',
              fontSize: 16,
              fontWeight: 700,
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
          trackStyle={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }}
          handleStyle={{
            borderColor: '#FFD700',
            background: '#FFD700',
          }}
          style={{ marginTop: 8 }}
        />
      </div>

      {/* Duration Slider */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Duration (Days)
          </Text>
          <Text
            style={{
              color: '#00D4AA',
              fontSize: 16,
              fontWeight: 700,
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
          trackStyle={{ background: 'linear-gradient(90deg, #00D4AA, #00A08C)' }}
          handleStyle={{
            borderColor: '#00D4AA',
            background: '#00D4AA',
          }}
          marks={{
            30: '30',
            90: '90',
            180: '180',
            365: '365',
          }}
          style={{ marginTop: 8 }}
        />
      </div>

      {/* Results */}
      <div
        style={{
          background: 'rgba(0, 212, 170, 0.1)',
          borderRadius: 12,
          padding: '24px',
          border: '1px solid rgba(0, 212, 170, 0.2)',
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Total Value</span>}
              value={calculateYield.futureValue.toFixed(2)}
              prefix="$"
              precision={2}
              valueStyle={{
                color: '#00D4AA',
                fontSize: 24,
                fontWeight: 700,
              }}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Profit</span>}
              value={calculateYield.profit.toFixed(2)}
              prefix="$"
              precision={2}
              valueStyle={{
                color: '#FFD700',
                fontSize: 24,
                fontWeight: 700,
              }}
            />
          </Col>
          <Col xs={24}>
            <div
              style={{
                textAlign: 'center',
                paddingTop: 16,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
                Return on Investment (ROI):{' '}
                <span style={{ color: '#FFD700', fontSize: 18, fontWeight: 700 }}>
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
