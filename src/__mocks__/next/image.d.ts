// src/__mocks__/next/image.d.ts
// This type definition makes the next/image mock compatible with all props in tests/builds.
declare module 'next/image' {
  import type * as React from 'react';
  type ImageProps = React.ComponentProps<'img'> & {
    fill?: boolean;
    priority?: boolean;
  };
  const ReactImage: React.ComponentType<ImageProps>;
  export default ReactImage;
}
