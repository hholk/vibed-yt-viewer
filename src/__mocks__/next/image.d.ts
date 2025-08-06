// src/__mocks__/next/image.d.ts
// This type definition makes the next/image mock compatible with all props in tests/builds.
declare module 'next/image' {
  import type * as React from 'react';
  // Accept any props for maximum compatibility with Next.js Image
  const ReactImage: React.ComponentType<any>;
  export default ReactImage;
}
