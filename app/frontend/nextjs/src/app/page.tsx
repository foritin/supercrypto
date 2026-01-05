"use client";

import React from "react";
import {
  Layout,
  Typography,
  Card,
  Button,
  Row,
  Col,
  Statistic,
  Flex,
} from "antd";
import {
  SafetyOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  RocketOutlined,
  DollarOutlined,
  TrophyOutlined,
  ArrowRightOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useScrollReveal, useScrollRevealDelay } from "@/hooks/useScrollReveal";
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { useCountUp } from "@/hooks/useCountUp";
import { useMagneticButton } from "@/hooks/useMagneticButton";
import { useTypewriter } from "@/hooks/useTypewriter";
import { RippleButton } from "@/components/ui/RippleButton";
import { YieldCalculator } from "@/components/calculator/YieldCalculator";
import { LogoWall } from "@/components/logo-wall/LogoWall";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // 滚动动画 hooks
  const featuresSection = useScrollReveal();
  const howItWorksSection = useScrollReveal();
  const ctaSection = useScrollReveal();

  const feature1 = useScrollRevealDelay(100);
  const feature2 = useScrollRevealDelay(200);
  const feature3 = useScrollRevealDelay(300);

  const step1 = useScrollRevealDelay(100);
  const step2 = useScrollRevealDelay(200);
  const step3 = useScrollRevealDelay(300);

  // Phoenix Prototype: 视差效果
  const { offset: parallaxOffset } = useMouseParallax({ intensity: 0.02 });

  // Phoenix Prototype: 数字滚动动画
  const tvlCount = useCountUp(2500000, { prefix: '$', suffix: '+', decimals: 0, threshold: 0.1 });
  const usersCount = useCountUp(1200, { suffix: '+', decimals: 0, threshold: 0.1 });
  const assetsCount = useCountUp(15, { suffix: '+', decimals: 0, threshold: 0.1 });

  // Phoenix Prototype: 磁性按钮
  const primaryCtaRef = useMagneticButton({ threshold: 100, strength: 0.3 });
  const secondaryCtaRef = useMagneticButton({ threshold: 100, strength: 0.3 });

  // Phase 11: 打字机效果 - 纯 CSS 动画
  // 优化：使用长度接近的词，减少视觉位移
  const { text: dynamicText, animationKey } = useTypewriter(
    ['DeFi Strategies', 'Staking Rewards', 'Smart Investing'],
    { wordDuration: 3000, loop: true }
  );

  // Phase 11: 新增 Section 的滚动动画
  const calculatorSection = useScrollReveal();
  const ecosystemSection = useScrollReveal();

  return (
    <>
      {/* Phoenix Prototype: 全局噪点纹理 */}
      <div className="noise-overlay" />

      {/* Hero Section with Video Background */}
      <section className="hero-section">
        {/* 视频背景 */}
        <div className="hero-video-container">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070"
          >
            <source src="/1826904-hd_1920_1080_24fps.mp4" type="video/mp4" />
          </video>
        </div>

        {/* 视频遮罩层 */}
        <div className="hero-video-overlay" />

        {/* Phoenix Prototype: 视差光球 - 跟随鼠标移动 */}
        <div
          className="bg-orb bg-orb-primary animate-float parallax-orb"
          style={{
            top: "5%",
            left: "10%",
            width: "500px",
            height: "500px",
            transform: `translate(${parallaxOffset.x * 1.2}px, ${parallaxOffset.y * 1.2}px)`
          }}
        />
        <div
          className="bg-orb bg-orb-gold animate-float-delayed parallax-orb"
          style={{
            bottom: "15%",
            right: "5%",
            width: "450px",
            height: "450px",
            transform: `translate(${parallaxOffset.x * 0.8}px, ${parallaxOffset.y * 0.8}px)`
          }}
        />
        <div
          className="bg-orb bg-orb-blue animate-float parallax-orb"
          style={{
            top: "60%",
            left: "60%",
            animationDelay: "-10s",
            width: "400px",
            height: "400px",
            transform: `translate(${parallaxOffset.x * 1.5}px, ${parallaxOffset.y * 1.5}px)`
          }}
        />
        {/* 新增：紫色光球 */}
        <div
          className="bg-orb bg-orb-purple animate-float parallax-orb"
          style={{
            top: "20%",
            right: "25%",
            animationDelay: "-5s",
            width: "350px",
            height: "350px",
            transform: `translate(${parallaxOffset.x * 1.0}px, ${parallaxOffset.y * 1.0}px)`
          }}
        />
        {/* 新增：粉色光球 */}
        <div
          className="bg-orb bg-orb-pink animate-float-delayed parallax-orb"
          style={{
            bottom: "30%",
            left: "20%",
            animationDelay: "-15s",
            width: "380px",
            height: "380px",
            transform: `translate(${parallaxOffset.x * 0.6}px, ${parallaxOffset.y * 0.6}px)`
          }}
        />

        {/* Hero Content */}
        <div
          className="hero-content fade-in-stagger"
          style={{
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              textAlign: "center",
              padding: "60px 24px",
            }}
          >
            <Flex vertical align="center" gap={32}>
              {/* Badge */}
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "10px 24px",
                    background:
                      "linear-gradient(135deg, rgba(0, 212, 170, 0.15) 0%, rgba(0, 160, 128, 0.1) 100%)",
                    border: "1px solid rgba(0, 212, 170, 0.4)",
                    borderRadius: 30,
                    color: "#00D4AA",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    boxShadow: "0 0 20px rgba(0, 212, 170, 0.15)",
                  }}
                >
                  🚀 {t("home.badge")}
                </span>
              </div>

              {/* Main Title */}
              <div>
                <Title
                  level={1}
                  style={{
                    fontSize: "clamp(40px, 7vw, 80px)",
                    fontWeight: 800,
                    marginBottom: 0,
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Unlock{' '}
                  <span
                    key={animationKey}
                    className="gold-text typewriter-text"
                    style={{
                      display: 'inline-block',
                      minWidth: '220px',
                      height: '1.2em',
                      textAlign: 'left',
                      verticalAlign: 'bottom',
                    }}
                  >
                    {dynamicText}
                  </span>
                  {' '}On Web3
                </Title>
              </div>

              {/* Subtitle */}
              <Paragraph
                style={{
                  fontSize: 20,
                  color: "rgba(255, 255, 255, 0.7)",
                  maxWidth: 700,
                  margin: "0 auto",
                  lineHeight: 1.6,
                }}
              >
                {t("home.subtitle")}
              </Paragraph>

              {/* CTA Buttons */}
              <Flex gap={16} wrap="wrap" justify="center">
                <RippleButton
                  ref={primaryCtaRef}
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => router.push("/assets")}
                  className="magnetic-button"
                  style={{
                    height: 60,
                    padding: "0 48px",
                    fontSize: 18,
                    fontWeight: 600,
                    borderRadius: 14,
                    boxShadow: "0 0 30px rgba(0, 212, 170, 0.3)",
                  }}
                >
                  {t("home.cta.primary")}
                </RippleButton>
                <RippleButton
                  ref={secondaryCtaRef}
                  size="large"
                  onClick={() => router.push("/portfolio")}
                  className="magnetic-button"
                  style={{
                    height: 60,
                    padding: "0 48px",
                    fontSize: 18,
                    borderRadius: 14,
                    background: "rgba(255, 255, 255, 0.05)",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  {t("home.cta.secondary")}
                </RippleButton>
              </Flex>

              {/* Stats Section - Plain Text Style (Securitize-inspired) */}
              <div
                style={{
                  marginTop: 48,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 48,
                  flexWrap: "wrap",
                }}
              >
                {/* TVL Stat */}
                <div style={{ textAlign: "center" }}>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: 14,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginRight: 8,
                    }}
                  >
                    {t("home.stats.tvl")}:
                  </Text>
                  <Text
                    ref={tvlCount.ref}
                    style={{
                      color: "#00D4AA",
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  >
                    {tvlCount.count}
                  </Text>
                </div>

                {/* Separator */}
                <div
                  style={{
                    width: 1,
                    height: 30,
                    background: "rgba(255, 255, 255, 0.1)",
                  }}
                  className="stats-separator"
                />

                {/* Users Stat */}
                <div style={{ textAlign: "center" }}>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: 14,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginRight: 8,
                    }}
                  >
                    {t("home.stats.users")}:
                  </Text>
                  <Text
                    ref={usersCount.ref}
                    style={{
                      color: "#00D4AA",
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  >
                    {usersCount.count}
                  </Text>
                </div>

                {/* Separator */}
                <div
                  style={{
                    width: 1,
                    height: 30,
                    background: "rgba(255, 255, 255, 0.1)",
                  }}
                  className="stats-separator"
                />

                {/* Assets Stat */}
                <div style={{ textAlign: "center" }}>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: 14,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginRight: 8,
                    }}
                  >
                    {t("home.stats.assets")}:
                  </Text>
                  <Text
                    ref={assetsCount.ref}
                    style={{
                      color: "#00D4AA",
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  >
                    {assetsCount.count}
                  </Text>
                </div>
              </div>

            </Flex>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        ref={featuresSection.ref as React.RefObject<HTMLDivElement>}
        className={`dot-pattern-bg scroll-reveal ${featuresSection.isVisible ? 'is-visible' : ''}`}
        style={{ padding: "100px 24px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div
            style={{ textAlign: "center", marginBottom: 72 }}
            className="fade-in-stagger"
          >
            <Text
              style={{
                color: "#00D4AA",
                fontSize: 14,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Features
            </Text>
            <Title level={2} style={{ marginTop: 16, marginBottom: 16 }}>
              {t("home.features.title")}
            </Title>
            <Paragraph
              style={{
                fontSize: 18,
                color: "rgba(255, 255, 255, 0.65)",
                maxWidth: 600,
                margin: "0 auto",
              }}
            >
              {t("home.features.subtitle")}
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            <Col
              xs={24}
              md={8}
              ref={feature1.ref as React.RefObject<HTMLDivElement>}
              className={`scroll-reveal ${feature1.isVisible ? 'is-visible' : ''}`}
            >
              <Card
                hoverable
                className="glass-card-enhanced"
                style={{ height: "100%" }}
              >
                <Flex vertical gap={20}>
                  <div className="icon-box icon-box-primary">
                    <SafetyOutlined
                      style={{ fontSize: 28, color: "#00D4AA" }}
                    />
                  </div>
                  <Title level={4} style={{ margin: 0 }}>
                    {t("home.features.security.title")}
                  </Title>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.65)",
                      lineHeight: 1.7,
                    }}
                  >
                    {t("home.features.security.description")}
                  </Text>
                </Flex>
              </Card>
            </Col>
            <Col
              xs={24}
              md={8}
              ref={feature2.ref as React.RefObject<HTMLDivElement>}
              className={`scroll-reveal ${feature2.isVisible ? 'is-visible' : ''}`}
            >
              <Card
                hoverable
                className="glass-card-enhanced"
                style={{ height: "100%" }}
              >
                <Flex vertical gap={20}>
                  <div className="icon-box icon-box-gold">
                    <DollarOutlined
                      style={{ fontSize: 28, color: "#FFD700" }}
                    />
                  </div>
                  <Title level={4} style={{ margin: 0 }}>
                    {t("home.features.returns.title")}
                  </Title>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.65)",
                      lineHeight: 1.7,
                    }}
                  >
                    {t("home.features.returns.description")}
                  </Text>
                </Flex>
              </Card>
            </Col>
            <Col
              xs={24}
              md={8}
              ref={feature3.ref as React.RefObject<HTMLDivElement>}
              className={`scroll-reveal ${feature3.isVisible ? 'is-visible' : ''}`}
            >
              <Card
                hoverable
                className="glass-card-enhanced"
                style={{ height: "100%" }}
              >
                <Flex vertical gap={20}>
                  <div className="icon-box icon-box-blue">
                    <GlobalOutlined
                      style={{ fontSize: 28, color: "#1890ff" }}
                    />
                  </div>
                  <Title level={4} style={{ margin: 0 }}>
                    {t("home.features.global.title")}
                  </Title>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.65)",
                      lineHeight: 1.7,
                    }}
                  >
                    {t("home.features.global.description")}
                  </Text>
                </Flex>
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        ref={howItWorksSection.ref as React.RefObject<HTMLDivElement>}
        className={`hex-pattern-bg scroll-reveal ${howItWorksSection.isVisible ? 'is-visible' : ''}`}
        style={{ padding: "100px 24px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{ textAlign: "center", marginBottom: 72 }}
            className="fade-in-stagger"
          >
            <Text
              style={{
                color: "#FFD700",
                fontSize: 14,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              How It Works
            </Text>
            <Title level={2} style={{ marginTop: 16, marginBottom: 16 }}>
              {t("home.howItWorks.title")}
            </Title>
            <Paragraph
              style={{
                fontSize: 18,
                color: "rgba(255, 255, 255, 0.65)",
                maxWidth: 600,
                margin: "0 auto",
              }}
            >
              {t("home.howItWorks.subtitle")}
            </Paragraph>
          </div>

          <Row gutter={[48, 48]} align="top">
            {[
              {
                icon: <BankOutlined />,
                step: 1,
                titleKey: "home.howItWorks.step1.title",
                descKey: "home.howItWorks.step1.description",
                color: "#00D4AA",
              },
              {
                icon: <ThunderboltOutlined />,
                step: 2,
                titleKey: "home.howItWorks.step2.title",
                descKey: "home.howItWorks.step2.description",
                color: "#FFD700",
              },
              {
                icon: <TrophyOutlined />,
                step: 3,
                titleKey: "home.howItWorks.step3.title",
                descKey: "home.howItWorks.step3.description",
                color: "#1890ff",
              },
            ].map((item, index) => {
              const stepRef = index === 0 ? step1 : index === 1 ? step2 : step3;
              return (
                <Col
                  xs={24}
                  md={8}
                  key={item.step}
                  ref={stepRef.ref as React.RefObject<HTMLDivElement>}
                  className={`scroll-reveal ${stepRef.isVisible ? 'is-visible' : ''}`}
                >
                <div style={{ textAlign: "center", position: "relative" }}>
                  {/* Connecting Line */}
                  {index < 2 && (
                    <div
                      style={{
                        display: "none",
                        position: "absolute",
                        top: 44,
                        left: "calc(50% + 50px)",
                        width: "calc(100% - 100px)",
                        height: 2,
                        background: `linear-gradient(90deg, ${item.color}40 0%, rgba(255,255,255,0.1) 100%)`,
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      background: `linear-gradient(135deg, rgba(17, 25, 22, 0.9) 0%, rgba(26, 36, 30, 0.9) 100%)`,
                      border: `2px solid ${item.color}40`,
                      borderRadius: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 28px",
                      position: "relative",
                      boxShadow: `0 0 40px ${item.color}15`,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: -14,
                        right: -14,
                        width: 36,
                        height: 36,
                        background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}CC 100%)`,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--bg-dark)",
                        boxShadow: `0 0 20px ${item.color}50`,
                      }}
                    >
                      {item.step}
                    </span>
                    {React.cloneElement(
                      item.icon as React.ReactElement<{
                        style?: React.CSSProperties;
                      }>,
                      {
                        style: { fontSize: 40, color: item.color },
                      }
                    )}
                  </div>
                  <Title level={4} style={{ marginBottom: 12 }}>
                    {t(item.titleKey)}
                  </Title>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.65)",
                      lineHeight: 1.7,
                    }}
                  >
                    {t(item.descKey)}
                  </Text>
                </div>
              </Col>
              );
            })}
          </Row>
        </div>
      </section>

      {/* Phase 11: Yield Calculator Section */}
      <section
        ref={calculatorSection.ref as React.RefObject<HTMLDivElement>}
        className={`scroll-reveal ${calculatorSection.isVisible ? 'is-visible' : ''}`}
        style={{ padding: "100px 24px", background: "rgba(0, 212, 170, 0.02)" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }} className="fade-in-stagger">
            <Text
              style={{
                color: "#FFD700",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              Calculate Your Earnings
            </Text>
            <Title level={2} style={{ marginTop: 16, marginBottom: 16 }}>
              Yield Calculator
            </Title>
            <Paragraph
              style={{
                fontSize: 18,
                color: "rgba(255, 255, 255, 0.65)",
                maxWidth: 600,
                margin: "0 auto",
              }}
            >
              See your potential returns with our interactive yield calculator
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} justify="center">
            <Col xs={24} lg={16}>
              <YieldCalculator />
            </Col>
          </Row>
        </div>
      </section>

      {/* Phase 11: Ecosystem / Logo Wall Section */}
      <section
        ref={ecosystemSection.ref as React.RefObject<HTMLDivElement>}
        className={`scroll-reveal ${ecosystemSection.isVisible ? 'is-visible' : ''}`}
      >
        <LogoWall />
      </section>

      {/* Final CTA Section */}
      <section
        ref={ctaSection.ref as React.RefObject<HTMLDivElement>}
        className={`cta-section scroll-reveal ${ctaSection.isVisible ? 'is-visible' : ''}`}
      >
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Title
            level={2}
            style={{
              marginBottom: 20,
              fontSize: "clamp(28px, 4vw, 42px)",
            }}
          >
            {t("home.finalCta.title")}
          </Title>
          <Paragraph
            style={{
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.7)",
              marginBottom: 40,
              lineHeight: 1.7,
            }}
          >
            {t("home.finalCta.description")}
          </Paragraph>
          <RippleButton
            type="primary"
            size="large"
            icon={<RocketOutlined />}
            onClick={() => router.push("/assets")}
            style={{
              height: 60,
              padding: "0 56px",
              fontSize: 18,
              fontWeight: 600,
              borderRadius: 14,
              boxShadow: "0 0 40px rgba(0, 212, 170, 0.35)",
            }}
          >
            {t("home.finalCta.button")}
          </RippleButton>
        </div>
      </section>
    </>
  );
}
