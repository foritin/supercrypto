"use client";

/**
 * Document Viewer - Advanced KYC Document Inspection
 * 文档查看器 - 高级 KYC 文档检查
 * 
 * Features:
 * - Zoom and pan
 * - Document comparison (selfie vs ID)
 * - Image enhancement
 * - Fullscreen mode
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  X,
  GitCompare,
  Sun,
  Contrast,
  Download,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface Document {
  type: "id_front" | "id_back" | "selfie" | "proof_of_address" | "face_image";
  label: string;
  url: string;
}

interface DocumentViewerProps {
  documents: Document[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
  ocrData?: {
    confidence_score: number;
    full_name?: string;
    id_number?: string;
    date_of_birth?: string;
  } | null;
  facialComparison?: {
    similarity_score: number;
    is_match: boolean;
  } | null;
}

export function DocumentViewer({
  documents,
  isOpen,
  onClose,
  initialIndex = 0,
  ocrData,
  facialComparison,
}: DocumentViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentDoc = documents[currentIndex];
  const selfieDoc = documents.find((d) => d.type === "selfie");
  const idFrontDoc = documents.find((d) => d.type === "id_front");

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setPosition({ x: 0, y: 0 });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1));
    handleReset();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0));
    handleReset();
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

  const handleDownload = async () => {
    try {
      const response = await fetch(currentDoc.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentDoc.type}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  if (!isOpen || documents.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 bg-bg-dark/95 backdrop-blur-sm ${
          isFullscreen ? "" : "p-4 md:p-8"
        }`}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-bg-dark to-transparent">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">
              {compareMode ? "文档对比" : currentDoc.label}
            </h3>
            {!compareMode && documents.length > 1 && (
              <span className="text-sm text-white/50">
                {currentIndex + 1} / {documents.length}
              </span>
            )}
            {ocrData && currentDoc.type.includes("id") && (
              <Badge
                variant={ocrData.confidence_score > 80 ? "default" : "secondary"}
                className="text-xs"
              >
                OCR 置信度: {ocrData.confidence_score}%
              </Badge>
            )}
            {facialComparison && compareMode && (
              <Badge
                variant={facialComparison.is_match ? "default" : "destructive"}
                className="text-xs"
              >
                相似度: {facialComparison.similarity_score}%
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Compare Mode Toggle */}
            {selfieDoc && idFrontDoc && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCompareMode(!compareMode);
                  handleReset();
                }}
                className={compareMode ? "bg-white/10 text-teal-400" : ""}
              >
                <Compare className="w-4 h-4 mr-1" />
                对比
              </Button>
            )}

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </Button>

            {/* Close */}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-full pt-16 pb-20">
          {/* Image Container */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center overflow-hidden relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {compareMode && selfieDoc && idFrontDoc ? (
              // Compare Mode
              <div className="flex gap-4 h-full w-full max-w-6xl">
                {/* ID Document */}
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-sm text-white/50 mb-2">证件照片</span>
                  <div className="relative flex-1 w-full overflow-hidden rounded-lg border border-white/10">
                    <Image
                      src={idFrontDoc.url}
                      alt="ID"
                      fill
                      className="object-contain transition-all duration-200"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                      }}
                    />
                  </div>
                </div>

                {/* Selfie */}
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-sm text-white/50 mb-2">手持自拍</span>
                  <div className="relative flex-1 w-full overflow-hidden rounded-lg border border-white/10">
                    <Image
                      src={selfieDoc.url}
                      alt="Selfie"
                      fill
                      className="object-contain transition-all duration-200"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Single Image Mode
              <motion.div
                className="relative w-full h-full max-w-4xl cursor-move"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <Image
                  src={currentDoc.url}
                  alt={currentDoc.label}
                  fill
                  className="object-contain"
                  draggable={false}
                />
              </motion.div>
            )}
          </div>

          {/* Thumbnail Sidebar */}
          {!compareMode && documents.length > 1 && (
            <div className="w-24 ml-4 flex flex-col gap-2 overflow-y-auto">
              {documents.map((doc, index) => (
                <button
                  key={doc.type}
                  onClick={() => {
                    setCurrentIndex(index);
                    handleReset();
                  }}
                  className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? "border-teal-400"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <Image
                    src={doc.url}
                    alt={doc.label}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Toolbar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-dark to-transparent">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Navigation */}
            {!compareMode && documents.length > 1 && (
              <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
                <Button variant="ghost" size="icon" onClick={handlePrev}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-sm text-white/70 px-2">
                  {currentIndex + 1} / {documents.length}
                </span>
                <Button variant="ghost" size="icon" onClick={handleNext}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
              <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="w-5 h-5" />
              </Button>
              <span className="text-sm text-white/70 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="w-5 h-5" />
              </Button>
            </div>

            {/* Image Adjustments */}
            <div className="flex items-center gap-4 bg-white/5 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-white/50" />
                <Slider
                  value={[brightness]}
                  onValueChange={([v]) => setBrightness(v)}
                  min={50}
                  max={150}
                  step={5}
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-2">
                <Contrast className="w-4 h-4 text-white/50" />
                <Slider
                  value={[contrast]}
                  onValueChange={([v]) => setContrast(v)}
                  min={50}
                  max={150}
                  step={5}
                  className="w-24"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleRotate}>
                <RotateCw className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                重置
              </Button>
            </div>
          </div>
        </div>

        {/* OCR Data Panel */}
        {ocrData && currentDoc.type.includes("id") && !compareMode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-4 top-20 w-64 bg-[#0d1117]/90 backdrop-blur-xl rounded-xl border border-white/10 p-4"
          >
            <h4 className="text-sm font-medium text-white mb-3">OCR 识别结果</h4>
            <div className="space-y-2 text-sm">
              {ocrData.full_name && (
                <div className="flex justify-between">
                  <span className="text-white/50">姓名</span>
                  <span className="text-white">{ocrData.full_name}</span>
                </div>
              )}
              {ocrData.id_number && (
                <div className="flex justify-between">
                  <span className="text-white/50">证件号</span>
                  <span className="text-white font-mono">{ocrData.id_number}</span>
                </div>
              )}
              {ocrData.date_of_birth && (
                <div className="flex justify-between">
                  <span className="text-white/50">出生日期</span>
                  <span className="text-white">{ocrData.date_of_birth}</span>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-white/50">置信度</span>
                  <span
                    className={`font-medium ${
                      ocrData.confidence_score > 80
                        ? "text-emerald-400"
                        : ocrData.confidence_score > 60
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {ocrData.confidence_score}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default DocumentViewer;
