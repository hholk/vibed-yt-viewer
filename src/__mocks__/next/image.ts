// __mocks__/next/image.ts
// For beginners: This is only used in tests, not in production.
// This mock replaces next/image with a simple <img> for tests.
// It accepts and ignores Next.js-specific props like 'fill', 'sizes', 'priority'.
// __mocks__/next/image.ts
// This mock replaces next/image with a simple <img> for tests.
// It accepts and ignores Next.js-specific props like 'fill', 'sizes', 'priority'.
import React from 'react';

function MockedImage(props: { [key: string]: unknown }) {
  const rest = Object.fromEntries(
    Object.entries(props).filter(([key]) =>
      key !== 'fill' &&
      key !== 'priority' &&
      key !== 'loader' &&
      key !== 'unoptimized'
    ),
  );

  return React.createElement('img', rest);
}

export default MockedImage;
