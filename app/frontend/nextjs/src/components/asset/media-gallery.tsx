"use client";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut, Download } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AssetMediaItem } from "@/services/asset";

interface MediaGalleryProps {
  media?: AssetMediaItem[];
  coverImage?: string | null;
  assetType?: string;
}

// 占位图片
const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
];

export function MediaGallery({
  media,
  coverImage,
}: MediaGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const images =
    media && media.length > 0
      ? media
          .filter((m) => ["gallery", "cover"].includes(m.media_type))
          .map((m) => m.url)
      : coverImage
      ? [coverImage, ...PLACEHOLDER_IMAGES.slice(1)]
      : PLACEHOLDER_IMAGES;

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  // 键盘导航支持
  useEffect(() => {
    if (!previewVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        setPreviewVisible(false);
      } else if (e.key === "+" || e.key === "=") {
        setZoomLevel((z) => Math.min(z + 0.5, 3));
      } else if (e.key === "-" || e.key === "_") {
        setZoomLevel((z) => Math.max(z - 0.5, 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewVisible, handlePrev, handleNext]);

  // 缩放处理
  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((z) => Math.min(z + 0.5, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((z) => Math.max(z - 0.5, 1));
    if (zoomLevel <= 1.5) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 双击缩放
  const handleDoubleClick = () => {
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoomLevel(2);
    }
  };

  // 关闭预览时重置
  const handleClose = () => {
    setPreviewVisible(false);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="media-gallery">
      {/* 主图区域 */}
      <div className="main-image-container">
        <div
          className="main-image"
          style={{ backgroundImage: `url(${images[currentIndex]})` }}
          onClick={() => setPreviewVisible(true)}
        >
          {/* 导航箭头 */}
          <button
            className="nav-btn nav-prev"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="上一张图片"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            className="nav-btn nav-next"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="下一张图片"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* 放大按钮 */}
          <button
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewVisible(true);
            }}
            aria-label="全屏预览"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* 图片计数 */}
          <div className="image-counter">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      </div>

      {/* 缩略图列表 */}
      <div className="thumbnail-strip">
        {images.slice(0, 6).map((img, idx) => (
          <div
            key={idx}
            className={`thumbnail ${idx === currentIndex ? "active" : ""}`}
            style={{ backgroundImage: `url(${img})` }}
            onClick={() => setCurrentIndex(idx)}
            role="button"
            tabIndex={0}
            aria-label={`查看第 ${idx + 1} 张图片`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setCurrentIndex(idx);
              }
            }}
          />
        ))}
        {images.length > 6 && (
          <div
            className="thumbnail more"
            onClick={() => setPreviewVisible(true)}
            role="button"
            tabIndex={0}
            aria-label={`查看更多 ${images.length - 6} 张图片`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setPreviewVisible(true);
              }
            }}
          >
            +{images.length - 6}
          </div>
        )}
      </div>

      {/* 增强版全屏预览 */}
      <Dialog open={previewVisible} onOpenChange={handleClose}>
        <DialogContent 
          className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 bg-black/98 border-0 overflow-hidden"
          hideCloseButton
        >
          <VisuallyHidden>
            <DialogTitle>图片预览</DialogTitle>
          </VisuallyHidden>

          {/* 顶部工具栏 */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-white/80 text-sm">
              {currentIndex + 1} / {images.length}
            </div>
            <div className="flex items-center gap-2">
              {/* 缩放控制 */}
              <button
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white/60 text-sm w-16 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              
              {/* 下载按钮 */}
              <a
                href={images[currentIndex]}
                download
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors ml-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-5 h-5" />
              </a>

              {/* 关闭按钮 */}
              <button
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors ml-4"
                onClick={handleClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 图片显示区域 */}
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={images[currentIndex]}
              alt={`图片 ${currentIndex + 1}`}
              className={cn(
                "max-w-full max-h-full object-contain transition-transform duration-200",
                isDragging ? "cursor-grabbing" : zoomLevel > 1 ? "cursor-grab" : "cursor-zoom-in"
              )}
              style={{
                transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
              }}
              onDoubleClick={handleDoubleClick}
              draggable={false}
            />
          </div>

          {/* 左右导航 - 大按钮 */}
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 z-40"
                onClick={handlePrev}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 z-40"
                onClick={handleNext}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* 底部缩略图导航 */}
          {images.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex justify-center gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "flex-shrink-0 w-20 h-14 rounded-lg bg-cover bg-center border-2 transition-all",
                      idx === currentIndex
                        ? "border-primary opacity-100 ring-2 ring-primary/30"
                        : "border-transparent opacity-50 hover:opacity-80"
                    )}
                    style={{ backgroundImage: `url(${img})` }}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setZoomLevel(1);
                      setPosition({ x: 0, y: 0 });
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 操作提示 */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/40 text-xs bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
            双击缩放 · 滚轮缩放 · 拖拽移动
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .media-gallery {
          margin-bottom: 24px;
        }
        .main-image-container {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: #0a0f0d;
        }
        .main-image {
          width: 100%;
          height: 400px;
          background-size: cover;
          background-position: center;
          cursor: pointer;
          position: relative;
        }
        .main-image::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(ellipse at center, transparent 30%, rgba(10, 15, 13, 0.4) 100%),
            linear-gradient(to top, rgba(10, 15, 13, 0.5) 0%, transparent 30%),
            linear-gradient(to bottom, rgba(10, 15, 13, 0.3) 0%, transparent 20%);
          pointer-events: none;
          z-index: 1;
        }
        .main-image::after {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow: inset 0 0 80px rgba(10, 15, 13, 0.3);
          pointer-events: none;
          z-index: 1;
        }
        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.5);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 2;
          backdrop-filter: blur(4px);
        }
        .nav-btn:hover {
          background: rgba(0, 212, 170, 0.9);
          color: #0a0f0d;
          transform: translateY(-50%) scale(1.05);
        }
        .nav-prev {
          left: 16px;
        }
        .nav-next {
          right: 16px;
        }
        .expand-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: none;
          background: rgba(0, 0, 0, 0.5);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          backdrop-filter: blur(4px);
          transition: all 0.2s ease;
        }
        .expand-btn:hover {
          background: rgba(0, 212, 170, 0.9);
          color: #0a0f0d;
          transform: scale(1.05);
        }
        .image-counter {
          position: absolute;
          bottom: 16px;
          right: 16px;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 6px;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          z-index: 2;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .thumbnail-strip {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .thumbnail {
          flex-shrink: 0;
          width: 80px;
          height: 60px;
          border-radius: 8px;
          background-size: cover;
          background-position: center;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s ease;
          opacity: 0.6;
          position: relative;
          overflow: hidden;
        }
        .thumbnail::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(10, 15, 13, 0.3) 100%);
          pointer-events: none;
        }
        .thumbnail:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }
        .thumbnail.active {
          border-color: #00d4aa;
          opacity: 1;
          box-shadow: 0 4px 12px rgba(0, 212, 170, 0.2);
        }
        .thumbnail.active::after {
          background: none;
        }
        .thumbnail.more {
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
