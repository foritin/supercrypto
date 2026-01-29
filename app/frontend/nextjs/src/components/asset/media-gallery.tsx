"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { AssetMediaItem } from "@/services/asset";

interface MediaGalleryProps {
  media?: AssetMediaItem[];
  coverImage?: string | null;
  assetType?: string;
}

// Unsplash 占位图片
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

  // 构建图片列表：优先使用真实数据，否则用占位图
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
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewVisible, handlePrev, handleNext]);

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

      {/* shadcn/ui Dialog 图片预览 */}
      <Dialog open={previewVisible} onOpenChange={setPreviewVisible}>
        <DialogContent 
          className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-white/10 overflow-hidden"
          hideCloseButton
        >
          <VisuallyHidden>
            <DialogTitle>图片预览</DialogTitle>
          </VisuallyHidden>
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {/* 关闭按钮 */}
            <button
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              onClick={() => setPreviewVisible(false)}
              aria-label="关闭预览"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 预览图片 */}
            <img
              src={images[currentIndex]}
              alt={`图片 ${currentIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain"
            />

            {/* 导航按钮 - 左 */}
            {images.length > 1 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                onClick={handlePrev}
                aria-label="上一张图片"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* 导航按钮 - 右 */}
            {images.length > 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                onClick={handleNext}
                aria-label="下一张图片"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* 图片计数器 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-full text-white text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          </div>

          {/* 缩略图导航 */}
          {images.length > 1 && (
            <div className="flex justify-center gap-2 p-4 bg-black/80 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  className={`flex-shrink-0 w-16 h-12 rounded-md bg-cover bg-center border-2 transition-all ${
                    idx === currentIndex
                      ? "border-[#00d4aa] opacity-100"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundImage: `url(${img})` }}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`查看第 ${idx + 1} 张图片`}
                />
              ))}
            </div>
          )}
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
        }
        .main-image {
          width: 100%;
          height: 400px;
          background-size: cover;
          background-position: center;
          cursor: pointer;
          position: relative;
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
          transition: background 0.2s;
        }
        .nav-btn:hover {
          background: rgba(0, 0, 0, 0.7);
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
        }
        .expand-btn:hover {
          background: rgba(0, 0, 0, 0.7);
        }
        .image-counter {
          position: absolute;
          bottom: 16px;
          right: 16px;
          padding: 4px 12px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 4px;
          color: #fff;
          font-size: 12px;
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
          transition: border-color 0.2s, opacity 0.2s;
          opacity: 0.7;
        }
        .thumbnail:hover {
          opacity: 1;
        }
        .thumbnail.active {
          border-color: #00d4aa;
          opacity: 1;
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
