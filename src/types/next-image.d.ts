// src/types/next-image.d.ts
// Ensures that imports for next/image are always typed as the real Next.js Image component, even in tests/mocks.
declare module 'next/image' {
  import * as React from 'react';
  interface StaticImageData {
    src: string;
    height: number;
    width: number;
    blurDataURL?: string;
  }
  export interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height' | 'loading' | 'ref'> {
    src: string | StaticImageData;
    alt: string;
    width?: number | `${number}`;
    height?: number | `${number}`;
    fill?: boolean;
    loader?: (props: { src: string; width: number; quality?: number }) => string;
    quality?: number | `${number}`;
    priority?: boolean;
    loading?: 'eager' | 'lazy';
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    unoptimized?: boolean;
    onLoadingComplete?: (img: HTMLImageElement) => void;
    sizes?: string;
    style?: React.CSSProperties;
  }
  const Image: React.FC<ImageProps>;
  export default Image;
}
