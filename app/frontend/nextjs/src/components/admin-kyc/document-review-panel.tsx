"use client";

/**
 * Enhanced Document Tab - Modern KYC Document Review Interface
 * 优化的证件审核标签页 - 现代化KYC证件审核界面
 * 
 * Design Principles:
 * - Left: Visual content (photos, videos)
 * - Right: Information & actions
 * - Clear hierarchy: Similarity > OCR > Risk > Actions
 * - Efficient: Compare mode, shortcuts, quick actions
 * 
 * @author UI/UX Pro Max
 */

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  User,
  Scan,
  ShieldCheck,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Fingerprint,
  Video,
  ArrowRightLeft,
  Copy,
} from "lucide-react";
import Image from "next/image";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { SectionCard } from "@/components/ui/section-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Types
// ============================================================================

interface Document {
  type: "id_front" | "id_back" | "selfie" | "face_image" | "liveness_video";
  label: string;
  url: string;
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
    uploadedAt?: string;
  };
}

interface OCRData {
  confidence_score: number;
  full_name?: string;
  id_number?: string;
  date_of_birth?: string;
  expiry_date?: string;
  nationality?: string;
  gender?: string;
}

interface FacialComparison {
  similarity_score: number;
  is_match: boolean;
  threshold: number;
  liveness_score?: number;
  liveness_passed?: boolean;
}

interface RiskCheck {
  name: string;
  status: "passed" | "failed" | "warning" | "pending";
  description?: string;
}

interface DocumentReviewPanelProps {
  documents: {
    id_front?: string;
    id_back?: string;
    selfie?: string;
    face_image?: string;
    liveness_video?: string;
  };
  ocrData?: OCRData | null;
  facialComparison?: FacialComparison | null;
  riskChecks?: RiskCheck[];
}

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
};

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Similarity Score Display with animated progress bar
 */
function SimilarityScore({ 
  score, 
  threshold, 
  isMatch 
}: { 
  score: number; 
  threshold: number; 
  isMatch: boolean;
}) {
  const { t } = useTranslation();
  const getColor = (s: number) => {
    if (s >= 90) return { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30", bgLight: "bg-emerald-500/10" };
    if (s >= threshold) return { bg: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/30", bgLight: "bg-blue-500/10" };
    if (s >= 60) return { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30", bgLight: "bg-amber-500/10" };
    return { bg: "bg-red-500", text: "text-red-400", border: "border-red-500/30", bgLight: "bg-red-500/10" };
  };

  const colors = getColor(score);
  const percentage = Math.min(100, Math.max(0, score));

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bgLight} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Fingerprint className={`w-5 h-5 ${colors.text}`} />
            <span className="text-sm font-medium text-white/90">{t("admin.kyc.stepper.docReview.facialComparisonResult")}</span>
          </div>
          <Badge 
            variant="outline" 
            className={`${isMatch ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
          >
            {isMatch ? (
              <><CheckCircle className="w-3 h-3 mr-1" />{t("admin.kyc.stepper.docReview.match")}</>
            ) : (
              <><XCircle className="w-3 h-3 mr-1" />{t("admin.kyc.stepper.docReview.noMatch")}</>
            )}
          </Badge>
        </div>

        <div className="flex items-end gap-3 mb-3">
          <motion.span 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-4xl font-bold ${colors.text} tabular-nums`}
          >
            {score.toFixed(1)}%
          </motion.span>
          <span className="text-sm text-white/50 mb-1">{t("admin.kyc.stepper.docReview.similarity")}</span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`absolute inset-y-0 left-0 rounded-full ${colors.bg}`}
          />
          {/* Threshold Marker */}
          <div 
            className="absolute inset-y-0 w-0.5 bg-white/50"
            style={{ left: `${threshold}%` }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white/40">
              {t("admin.kyc.stepper.docReview.threshold")}
            </span>
          </div>
        </div>

        <div className="flex justify-between mt-2 text-xs text-white/40">
          <span>0%</span>
          <span>{t("admin.kyc.stepper.docReview.threshold")}: {threshold}%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * OCR Result Card
 */
function OCRCard({ data }: { data?: OCRData | null }) {
  const { t } = useTranslation();
  if (!data) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <Scan className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/40">{t("admin.kyc.stepper.docReview.noOcrData")}</p>
      </div>
    );
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 70) return "text-blue-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scan className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-white/90">{t("admin.kyc.stepper.docReview.ocrResult")}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`text-sm font-medium ${getConfidenceColor(data.confidence_score)}`}>
                {t("admin.kyc.stepper.docReview.confidenceLabel", { score: data.confidence_score })}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("admin.kyc.stepper.docReview.ocrConfidenceTooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="p-4 space-y-3">
        {data.full_name && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">{t("admin.kyc.stepper.docReview.fullName")}</span>
            <span className="text-sm font-medium text-white">{data.full_name}</span>
          </div>
        )}
        {data.id_number && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">{t("admin.kyc.stepper.docReview.idNumber")}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-white">{data.id_number}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(data.id_number!)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <Copy className="w-3 h-3 text-white/40" />
              </button>
            </div>
          </div>
        )}
        {data.date_of_birth && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">{t("admin.kyc.stepper.docReview.dateOfBirth")}</span>
            <span className="text-sm text-white">{data.date_of_birth}</span>
          </div>
        )}
        {data.nationality && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">{t("admin.kyc.stepper.docReview.nationality")}</span>
            <span className="text-sm text-white">{data.nationality}</span>
          </div>
        )}
        {data.gender && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">{t("admin.kyc.stepper.docReview.gender")}</span>
            <span className="text-sm text-white">{data.gender}</span>
          </div>
        )}
        {data.expiry_date && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">{t("admin.kyc.stepper.docReview.expiryDate")}</span>
            <span className="text-sm text-white">{data.expiry_date}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Risk Check List
 */
function RiskCheckList({ checks }: { checks?: RiskCheck[] }) {
  const { t } = useTranslation();
  if (!checks || checks.length === 0) return null;

  const getStatusIcon = (status: RiskCheck["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "pending":
        return <Clock className="w-4 h-4 text-white/40" />;
      default:
        return <Clock className="w-4 h-4 text-white/40" />;
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-white/90">{t("admin.kyc.stepper.docReview.riskCheck")}</span>
        </div>
      </div>
      
      <div className="p-4 space-y-2">
        {checks.map((check, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(check.status)}
              <span className="text-sm text-white/80">{check.name}</span>
            </div>
            {check.description && (
              <span className="text-xs text-white/40">{check.description}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Photo Thumbnail with hover effects
 */
function PhotoThumbnail({
  src,
  label,
  isActive,
  onClick,
  badge,
}: {
  src: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative aspect-[3/2] rounded-xl overflow-hidden transition-all duration-300 ${
        isActive 
          ? "ring-2 ring-primary ring-offset-2 ring-offset-bg-dark" 
          : "hover:ring-2 hover:ring-white/20 hover:ring-offset-2 hover:ring-offset-bg-dark"
      }`}
    >
      <Image
        src={src}
        alt={label}
        fill
        unoptimized
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      
      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <span className="text-xs font-medium text-white/90">{label}</span>
      </div>
      
      {/* Hover Icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30">
        <Eye className="w-6 h-6 text-white" />
      </div>
      
      {/* Badge */}
      {badge && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary/90 text-[10px] font-medium text-black">
          {badge}
        </div>
      )}
    </button>
  );
}

/**
 * Video Thumbnail
 */
function VideoThumbnail({
  src,
  label,
  onClick,
}: {
  src: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[3/2] rounded-xl overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-bg-dark"
    >
      <video src={src} className="w-full h-full object-cover" preload="metadata" />
      
      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors group-hover:bg-black/30">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform group-hover:scale-110">
          <Play className="w-5 h-5 text-white ml-0.5" />
        </div>
      </div>
      
      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          <Video className="w-3 h-3 text-white/70" />
          <span className="text-xs font-medium text-white/90">{label}</span>
        </div>
      </div>
    </button>
  );
}

/**
 * Image Viewer Modal with zoom and compare features
 */
function ImageViewerModal({
  isOpen,
  onClose,
  images,
  initialIndex,
  facialComparison,
}: {
  isOpen: boolean;
  onClose: () => void;
  images: Document[];
  initialIndex: number;
  facialComparison?: FacialComparison | null;
}) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);

  // Sync index when modal re-opens with different image
  if (initialIndex !== prevInitialIndex) {
    setPrevInitialIndex(initialIndex);
    setCurrentIndex(initialIndex);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }

  const currentImage = images[currentIndex];
  const idFrontImage = images.find((img) => img.type === "id_front");
  const selfieImage = images.find((img) => img.type === "selfie" || img.type === "face_image");
  const leftImage = idFrontImage ?? images[0];
  const rightImage = selfieImage ?? images[1] ?? images[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [zoom, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && zoom > 1) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">{t("admin.kyc.stepper.docReview.imageViewer")}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{t("admin.kyc.stepper.docReview.imageViewerDesc")}</DialogPrimitive.Description>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center"
              >
                {/* Backdrop - separate clickable layer */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                
                {/* Modal Dialog */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative z-10 bg-bg-card border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden transition-all duration-300 ${
                    compareMode ? "w-[95vw] max-w-7xl" : "w-[90vw] max-w-5xl"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-white">
                        {compareMode ? t("admin.kyc.stepper.docReview.compareMode") : currentImage?.label}
                      </h3>
                      {!compareMode && images.length > 1 && (
                        <span className="text-sm text-white/40">
                          {currentIndex + 1} / {images.length}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {images.length >= 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompareMode(!compareMode);
                          }}
                          className={compareMode ? "bg-white/10 text-primary" : "text-white/60 hover:text-white"}
                        >
                          <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                          {compareMode ? t("admin.kyc.stepper.docReview.exitCompare") : t("admin.kyc.stepper.docReview.compare")}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white">
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className={compareMode ? "h-[70vh]" : "h-[65vh]"}>
                    {compareMode && images.length >= 2 ? (
                      <div className="h-full flex gap-4 p-5">
                        <div className="flex-1 flex flex-col min-w-0">
                          {leftImage && (
                            <>
                              <span className="text-sm text-white/50 mb-2 text-center">
                                {leftImage.label}
                              </span>
                              <div className="flex-1 relative rounded-xl overflow-hidden border border-white/10 bg-black/30">
                                <Image
                                  src={leftImage.url}
                                  alt="Left"
                                  fill
                                  unoptimized
                                  className="object-contain p-2"
                                />
                              </div>
                            </>
                          )}
                        </div>
                        {/* Center divider with match info */}
                        <div className="flex flex-col items-center justify-center gap-2 px-2 shrink-0">
                          <div className="w-px h-16 bg-white/10" />
                          {facialComparison && (
                            <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                              facialComparison.is_match 
                                ? "bg-emerald-500/20 text-emerald-400" 
                                : "bg-red-500/20 text-red-400"
                            }`}>
                              {facialComparison.similarity_score}%
                            </div>
                          )}
                          <div className="w-px h-16 bg-white/10" />
                        </div>
                        <div className="flex-1 flex flex-col min-w-0">
                          {rightImage && (
                            <>
                              <span className="text-sm text-white/50 mb-2 text-center">
                                {rightImage.label}
                              </span>
                              <div className="flex-1 relative rounded-xl overflow-hidden border border-white/10 bg-black/30">
                                <Image
                                  src={rightImage.url}
                                  alt="Right"
                                  fill
                                  unoptimized
                                  className="object-contain p-2"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex-1 h-full flex items-center justify-center overflow-hidden bg-black/20 cursor-move"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        <motion.div
                          className="relative"
                          style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                          }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                          {currentImage && (
                            <Image
                              src={currentImage.url}
                              alt={currentImage.label}
                              width={800}
                              height={600}
                              unoptimized
                              className="object-contain rounded-lg"
                              draggable={false}
                            />
                          )}
                        </motion.div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Toolbar - only show in single image mode */}
                  {!compareMode && (
                  <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-white/[0.08]">
                    {images.length > 1 && (
                      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-white/60 px-2">
                          {currentIndex + 1} / {images.length}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-xs text-white/60 w-12 text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRotation((r) => (r + 90) % 360)}>
                      <RotateCw className="w-4 h-4" />
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setZoom(1);
                        setRotation(0);
                        setPosition({ x: 0, y: 0 });
                      }}
                    >
                      {t("admin.kyc.stepper.docReview.reset")}
                    </Button>
                  </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DocumentReviewPanel({
  documents,
  ocrData,
  facialComparison,
  riskChecks,
}: DocumentReviewPanelProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const { t } = useTranslation();

  // Build document list
  const imageList = useMemo(() => {
    const list: Document[] = [];
    if (documents.id_front) {
      list.push({ type: "id_front", label: t("admin.kyc.stepper.docReview.idFront"), url: documents.id_front });
    }
    if (documents.id_back) {
      list.push({ type: "id_back", label: t("admin.kyc.stepper.docReview.idBack"), url: documents.id_back });
    }
    if (documents.selfie) {
      list.push({ type: "selfie", label: t("admin.kyc.stepper.docReview.selfie"), url: documents.selfie });
    }
    if (documents.face_image) {
      list.push({ type: "face_image", label: t("admin.kyc.stepper.docReview.facePhoto"), url: documents.face_image });
    }
    return list;
  }, [documents, t]);

  const handleImageClick = (index: number) => {
    setSelectedIndex(index);
    setViewerOpen(true);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Top Row: ID Documents */}
      {(documents.id_front || documents.id_back) && (
        <motion.div variants={itemVariants}>
          <SectionCard 
            title={t("admin.kyc.stepper.docReview.idPhotos")} 
            icon={<FileText className="w-4 h-4" />}
            className="border-white/[0.08]"
          >
            <div className="grid grid-cols-2 gap-3">
              {documents.id_front && (
                <PhotoThumbnail
                  src={documents.id_front}
                  label={t("admin.kyc.stepper.docReview.front")}
                  isActive={false}
                  onClick={() => handleImageClick(imageList.findIndex((img) => img.type === "id_front"))}
                  badge={t("admin.kyc.stepper.docReview.clickToView")}
                />
              )}
              {documents.id_back && (
                <PhotoThumbnail
                  src={documents.id_back}
                  label={t("admin.kyc.stepper.docReview.back")}
                  isActive={false}
                  onClick={() => handleImageClick(imageList.findIndex((img) => img.type === "id_back"))}
                  badge={t("admin.kyc.stepper.docReview.clickToView")}
                />
              )}
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* Middle Row: Biometric Verification */}
      {(documents.selfie || documents.face_image || documents.liveness_video) && (
        <motion.div variants={itemVariants}>
          <SectionCard 
            title={t("admin.kyc.stepper.docReview.livenessVerification")} 
            icon={<User className="w-4 h-4" />}
            className="border-white/[0.08]"
          >
            <div className="grid grid-cols-2 gap-3">
              {(documents.selfie || documents.face_image) && (
                <PhotoThumbnail
                  src={documents.selfie || documents.face_image!}
                  label={documents.selfie ? t("admin.kyc.stepper.docReview.selfie") : t("admin.kyc.stepper.docReview.facePhoto")}
                  isActive={false}
                  onClick={() => handleImageClick(
                    imageList.findIndex((img) => img.type === "selfie" || img.type === "face_image")
                  )}
                  badge={t("admin.kyc.stepper.docReview.clickToView")}
                />
              )}
              {documents.liveness_video && (
                <VideoThumbnail
                  src={documents.liveness_video}
                  label={t("admin.kyc.stepper.docReview.livenessVideo")}
                  onClick={() => setVideoPlayerOpen(true)}
                />
              )}
            </div>

            {/* Liveness Result */}
            {facialComparison?.liveness_passed !== undefined && (
              <div className={`mt-3 flex items-center gap-2 p-3 rounded-lg ${
                facialComparison.liveness_passed 
                  ? "bg-emerald-500/10 border border-emerald-500/20" 
                  : "bg-red-500/10 border border-red-500/20"
              }`}>
                {facialComparison.liveness_passed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-sm ${facialComparison.liveness_passed ? "text-emerald-400" : "text-red-400"}`}>
                  {facialComparison.liveness_passed ? t("admin.kyc.stepper.docReview.livenessPassed") : t("admin.kyc.stepper.docReview.livenessFailed")}
                </span>
                {facialComparison.liveness_score && (
                  <span className="text-xs text-white/40 ml-auto">
                    {t("admin.kyc.stepper.docReview.livenessScore", { score: facialComparison.liveness_score.toFixed(1) })}
                  </span>
                )}
              </div>
            )}
          </SectionCard>
        </motion.div>
      )}

      {/* Facial Comparison Result */}
      {facialComparison && (
        <motion.div variants={itemVariants}>
          <SimilarityScore
            score={facialComparison.similarity_score}
            threshold={facialComparison.threshold}
            isMatch={facialComparison.is_match}
          />
        </motion.div>
      )}

      {/* OCR Data */}
      <motion.div variants={itemVariants}>
        <OCRCard {...(ocrData ? { data: ocrData } : {})} />
      </motion.div>

      {/* Risk Checks */}
      <motion.div variants={itemVariants}>
        <RiskCheckList {...(riskChecks ? { checks: riskChecks } : {})} />
      </motion.div>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        images={imageList}
        initialIndex={selectedIndex}
        {...(facialComparison ? { facialComparison } : {})}
      />

      {/* Video Player Modal */}
      <Dialog open={videoPlayerOpen} onOpenChange={(open) => !open && setVideoPlayerOpen(false)}>
        <DialogPortal>
          <DialogOverlay className="bg-black/90 backdrop-blur-xl" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogPrimitive.Title className="sr-only">{t("admin.kyc.stepper.docReview.videoPlayer")}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">{t("admin.kyc.stepper.docReview.videoPlayerDesc")}</DialogPrimitive.Description>
            <AnimatePresence>
              {videoPlayerOpen && documents.liveness_video && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 flex items-center justify-center"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-10 text-white/70 hover:text-white"
                    onClick={() => setVideoPlayerOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  <div className="relative w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
                    <video
                      src={documents.liveness_video}
                      controls
                      autoPlay
                      className="w-full rounded-xl"
                    />
                    <p className="text-center text-sm text-white/50 mt-3">{t("admin.kyc.stepper.docReview.livenessVideo")}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </motion.div>
  );
}

export default DocumentReviewPanel;
