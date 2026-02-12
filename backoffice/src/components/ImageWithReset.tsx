import React, { useState } from 'react';

type Props = {
  src: string | undefined | null;
  alt: string;
  onReset: () => void;
  width?: number;
  height?: number;
  shape?: 'circle' | 'square';
  className?: string;
};

export default function ImageWithReset({
  src,
  alt,
  onReset,
  width,
  height,
  shape = 'square',
  className,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const borderRadius = shape === 'circle' ? '50%' : '8px';

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  if (typeof width === 'number') {
    containerStyle.width = width;
  }
  if (typeof height === 'number') {
    containerStyle.height = height;
  }

  return (
    <div
      className={className}
      style={containerStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={src || ''}
        alt={alt}
        crossOrigin="anonymous"
        style={{
          width,
          height,
          objectFit: 'cover',
          display: 'block',
          borderRadius,
        }}
      />
      <button
        type="button"
        aria-label="이미지 초기화"
        onClick={onReset}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s ease',
          color: '#fff',
          backgroundColor: 'rgba(0,0,0,0.65)',
          border: 'none',
          borderRadius: '50%',
          width: 22,
          height: 22,
          lineHeight: '22px',
          textAlign: 'center',
          cursor: 'pointer',
          fontSize: 13,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}



