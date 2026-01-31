"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  HelpCircle,
  ChevronDown,
  Wallet,
  Shield,
  TrendingUp,
  Users,
  FileText,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/**
 * FAQ 页面内容组件
 *
 * 功能：
 * - 按分类展示常见问题
 * - 支持展开/收起答案
 * - 搜索功能
 * - 响应式设计
 */

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  key: string;
  icon: React.ReactNode;
  title: string;
  items: FaqItem[];
}

// FAQ 数据
const getFaqData = (t: (key: string) => string): FaqCategory[] => [
  {
    key: "general",
    icon: <HelpCircle className="w-5 h-5" />,
    title: t("faq.categories.general"),
    items: [
      {
        question: t("faq.general.q1"),
        answer: t("faq.general.a1"),
      },
      {
        question: t("faq.general.q2"),
        answer: t("faq.general.a2"),
      },
      {
        question: t("faq.general.q3"),
        answer: t("faq.general.a3"),
      },
    ],
  },
  {
    key: "investment",
    icon: <TrendingUp className="w-5 h-5" />,
    title: t("faq.categories.investment"),
    items: [
      {
        question: t("faq.investment.q1"),
        answer: t("faq.investment.a1"),
      },
      {
        question: t("faq.investment.q2"),
        answer: t("faq.investment.a2"),
      },
      {
        question: t("faq.investment.q3"),
        answer: t("faq.investment.a3"),
      },
      {
        question: t("faq.investment.q4"),
        answer: t("faq.investment.a4"),
      },
    ],
  },
  {
    key: "wallet",
    icon: <Wallet className="w-5 h-5" />,
    title: t("faq.categories.wallet"),
    items: [
      {
        question: t("faq.wallet.q1"),
        answer: t("faq.wallet.a1"),
      },
      {
        question: t("faq.wallet.q2"),
        answer: t("faq.wallet.a2"),
      },
      {
        question: t("faq.wallet.q3"),
        answer: t("faq.wallet.a3"),
      },
    ],
  },
  {
    key: "kyc",
    icon: <Users className="w-5 h-5" />,
    title: t("faq.categories.kyc"),
    items: [
      {
        question: t("faq.kyc.q1"),
        answer: t("faq.kyc.a1"),
      },
      {
        question: t("faq.kyc.q2"),
        answer: t("faq.kyc.a2"),
      },
      {
        question: t("faq.kyc.q3"),
        answer: t("faq.kyc.a3"),
      },
    ],
  },
  {
    key: "security",
    icon: <Shield className="w-5 h-5" />,
    title: t("faq.categories.security"),
    items: [
      {
        question: t("faq.security.q1"),
        answer: t("faq.security.a1"),
      },
      {
        question: t("faq.security.q2"),
        answer: t("faq.security.a2"),
      },
      {
        question: t("faq.security.q3"),
        answer: t("faq.security.a3"),
      },
    ],
  },
  {
    key: "legal",
    icon: <FileText className="w-5 h-5" />,
    title: t("faq.categories.legal"),
    items: [
      {
        question: t("faq.legal.q1"),
        answer: t("faq.legal.a1"),
      },
      {
        question: t("faq.legal.q2"),
        answer: t("faq.legal.a2"),
      },
    ],
  },
];

// FAQ 手风琴项组件
interface FaqAccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FaqAccordionItem: React.FC<FaqAccordionItemProps> = ({
  question,
  answer,
  isOpen,
  onToggle,
}) => {
  return (
    <div
      className={cn(
        "border border-white/[0.06] rounded-xl overflow-hidden",
        "bg-white/[0.02]",
        "transition-all duration-200",
        isOpen && "bg-white/[0.04] border-white/[0.1]"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left"
      >
        <span className="font-medium text-white pr-4">{question}</span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-white/40 flex-shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <p className="text-white/60 text-sm leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
};

// FAQ 分类组件
interface FaqCategorySectionProps {
  category: FaqCategory;
  openItems: Set<string>;
  onToggleItem: (key: string) => void;
}

const FaqCategorySection: React.FC<FaqCategorySectionProps> = ({
  category,
  openItems,
  onToggleItem,
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-[#00D4AA]/10 text-[#00D4AA]">
          {category.icon}
        </div>
        <h2 className="text-lg font-semibold text-white">{category.title}</h2>
      </div>
      <div className="space-y-3">
        {category.items.map((item, index) => {
          const itemKey = `${category.key}-${index}`;
          return (
            <FaqAccordionItem
              key={itemKey}
              question={item.question}
              answer={item.answer}
              isOpen={openItems.has(itemKey)}
              onToggle={() => onToggleItem(itemKey)}
            />
          );
        })}
      </div>
    </div>
  );
};

export function FaqContent() {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const headerRef = useScrollReveal();

  const faqData = getFaqData(t);

  // 切换展开/收起
  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 展开所有
  const expandAll = () => {
    const allKeys = new Set<string>();
    faqData.forEach((category) => {
      category.items.forEach((_, index) => {
        allKeys.add(`${category.key}-${index}`);
      });
    });
    setOpenItems(allKeys);
  };

  // 收起所有
  const collapseAll = () => {
    setOpenItems(new Set());
  };

  // 根据搜索过滤
  const filteredData = searchQuery
    ? faqData
        .map((category) => ({
          ...category,
          items: category.items.filter(
            (item) =>
              item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.answer.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((category) => category.items.length > 0)
    : faqData;

  return (
    <div className="min-h-screen bg-[#0A0F0D]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-[#00D4AA]/3 rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-24 pb-20">
        <div className="max-w-[900px] mx-auto px-6">
          {/* Header */}
          <section
            ref={headerRef.ref as React.RefObject<HTMLElement>}
            className="text-center mb-12 scroll-reveal is-visible"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00D4AA]/10 border border-[#00D4AA]/20 mb-6">
              <HelpCircle className="w-4 h-4 text-[#00D4AA]" />
              <span className="text-sm text-[#00D4AA] font-medium">
                {t("faq.badge", "Help Center")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("faq.title", "Frequently Asked Questions")}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              {t(
                "faq.subtitle",
                "Find answers to common questions about our platform, investments, and more."
              )}
            </p>
          </section>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("faq.searchPlaceholder", "Search questions...")}
                className={cn(
                  "w-full pl-12 pr-4 py-3 rounded-xl",
                  "bg-white/[0.03] border border-white/[0.08]",
                  "text-white placeholder:text-white/40",
                  "focus:outline-none focus:border-[#00D4AA]/50 focus:ring-1 focus:ring-[#00D4AA]/50",
                  "transition-all"
                )}
              />
            </div>
          </div>

          {/* Expand/Collapse Controls */}
          {!searchQuery && (
            <div className="flex justify-end gap-2 mb-6">
              <button
                onClick={expandAll}
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                {t("faq.expandAll", "Expand All")}
              </button>
              <span className="text-white/30">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                {t("faq.collapseAll", "Collapse All")}
              </button>
            </div>
          )}

          {/* FAQ Categories */}
          <div className="space-y-8">
            {filteredData.length > 0 ? (
              filteredData.map((category) => (
                <FaqCategorySection
                  key={category.key}
                  category={category}
                  openItems={openItems}
                  onToggleItem={toggleItem}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">
                  {t("faq.noResults", "No questions found matching your search.")}
                </p>
              </div>
            )}
          </div>

          {/* Contact Support */}
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-[#00D4AA]/10 to-[#00D4AA]/5 border border-[#00D4AA]/20">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-3">
                {t("faq.contact.title", "Still have questions?")}
              </h3>
              <p className="text-white/60 mb-6">
                {t(
                  "faq.contact.description",
                  "Our support team is here to help you with any questions or concerns."
                )}
              </p>
              <a
                href="mailto:support@slimcrypto.com"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0a0f0d] font-medium transition-colors"
              >
                {t("faq.contact.button", "Contact Support")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
