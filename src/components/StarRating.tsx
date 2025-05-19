'use client';

import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number) => Promise<void>;
  readOnly?: boolean;
  size?: number;
}

export function StarRating({ value, onChange, readOnly = false, size = 24 }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (rating: number) => {
    if (readOnly || !onChange) return;
    
    try {
      setIsLoading(true);
      await onChange(rating);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset hover state when value changes (e.g., after save)
  useEffect(() => {
    if (value !== null) {
      setHover(null);
    }
  }, [value]);

  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (readOnly || isLoading) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        const nextStar = starRefs.current[Math.min(index + 1, 4)];
        nextStar?.focus();
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        const prevStar = starRefs.current[Math.max(index - 1, 0)];
        prevStar?.focus();
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        handleClick(index + 1);
        break;
    }
  };


  return (
    <div 
      className="flex items-center" 
      role="slider" 
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={value || 0}
      aria-valuetext={`${value || 0} out of 5`}
      aria-label="Rating"
      aria-readonly={readOnly || undefined}
    >
      {[1, 2, 3, 4, 5].map((star, index) => {
        const ratingValue = star;
        const isFilled = (hover !== null ? hover >= ratingValue : (value || 0) >= ratingValue);
        
        return (
          <button
            key={star}
            ref={(el) => {
              starRefs.current[index] = el;
              return undefined;
            }}
            type="button"
            className={`p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 rounded-full ${
              !readOnly ? 'cursor-pointer' : 'cursor-default'
            }`}
            onClick={() => handleClick(ratingValue)}
            onMouseEnter={() => !readOnly && setHover(ratingValue)}
            onMouseLeave={() => !readOnly && setHover(null)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={isLoading || readOnly}
            aria-label={`Rate ${ratingValue} out of 5`}
            tabIndex={readOnly ? -1 : 0}
          >
            <Star 
              size={size}
              className={`transition-colors ${
                isFilled 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-400 dark:text-gray-600 hover:text-yellow-300'
              }`}
              fill={isFilled ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          </button>
        );
      })}
      {isLoading && (
        <span className="ml-2 text-sm text-gray-500">Saving...</span>
      )}
    </div>
  );
}
