

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
    onError?(error: unknown): void;
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
    onError?: (error: unknown) => void;
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

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_NC_URL?: string;
    NC_TOKEN?: string;
    NEXT_PUBLIC_NOCODB_TABLE_NAME?: string;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: unknown;
    }
  }
}

