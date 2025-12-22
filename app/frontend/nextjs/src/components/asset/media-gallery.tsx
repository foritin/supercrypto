"use client";

import { useState } from "react";
import { Image as AntImage, Button } from "antd";
import {
  LeftOutlined,
  RightOutlined,
  ExpandOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import type { AssetMediaItem, MediaType } from "@/services/asset";

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
  assetType,
}: MediaGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  // 构建图片列表：优先使用真实数据，否则用占位图
  const images =
    media && media.length > 0
      ? media
          .filter((m) => ["image", "cover"].includes(m.media_type))
          .map((m) => m.url)
      : coverImage
      ? [coverImage, ...PLACEHOLDER_IMAGES.slice(1)]
      : PLACEHOLDER_IMAGES;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
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
          >
            <LeftOutlined />
          </button>
          <button
            className="nav-btn nav-next"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          >
            <RightOutlined />
          </button>

          {/* 放大按钮 */}
          <button
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewVisible(true);
            }}
          >
            <ExpandOutlined />
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
          />
        ))}
        {images.length > 6 && (
          <div
            className="thumbnail more"
            onClick={() => setPreviewVisible(true)}
          >
            +{images.length - 6}
          </div>
        )}
      </div>

      {/* 隐藏的 Ant Design Image 预览 */}
      <div style={{ display: "none" }}>
        <AntImage.PreviewGroup
          preview={{
            open: previewVisible,
            onOpenChange: setPreviewVisible,
            current: currentIndex,
            onChange: setCurrentIndex,
          }}
        >
          {images.map((img, idx) => (
            <AntImage key={idx} src={img} />
          ))}
        </AntImage.PreviewGroup>
      </div>

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
