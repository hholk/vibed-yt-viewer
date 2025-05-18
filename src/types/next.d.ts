// Type definitions for Next.js
// Project: https://nextjs.org/

declare module 'next/link' {
  import { ComponentType, HTMLAttributes } from 'react';
  
  interface LinkProps extends HTMLAttributes<HTMLAnchorElement> {
    href: string;
    as?: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    locale?: string | false;
    legacyBehavior?: boolean;
    onError?(error: any): void;
  }

  const Link: ComponentType<LinkProps>;
  export default Link;
}

declare module 'next/image' {
  import { ComponentPropsWithoutRef, CSSProperties } from 'react';
  
  type ImageProps = Omit<ComponentPropsWithoutRef<'img'>, 'src' | 'srcSet' | 'ref' | 'width' | 'height' | 'loading'> & {
    src: string | StaticImport;
    width?: number | string;
    height?: number | string;
    layout?: 'fixed' | 'intrinsic' | 'responsive' | 'fill';
    loader?: (resolverProps: ImageLoaderProps) => string;
    quality?: number | string;
    priority?: boolean;
    loading?: 'lazy' | 'eager';
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    unoptimized?: boolean;
    objectFit?: CSSProperties['objectFit'];
    objectPosition?: CSSProperties['objectPosition'];
    onLoadingComplete?: (result: { naturalWidth: number; naturalHeight: number }) => void;
    onError?: (error: any) => void;
  };

  interface ImageLoaderProps {
    src: string;
    width: number;
    quality?: number;
  }

  interface StaticImport {
    src: string;
    height: number;
    width: number;
    blurDataURL?: string;
  }

  const Image: React.FC<ImageProps>;
  export default Image;
}

// Global types for Next.js
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_NC_URL?: string;
    NC_TOKEN?: string;
    NEXT_PUBLIC_NOCODB_TABLE_NAME?: string;
  }
}

// This is needed for TypeScript to recognize the global JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Add any custom elements here
    }
  }
}

/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
