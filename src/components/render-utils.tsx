import React from 'react';
import { Badge } from './ui/badge';
import { Star } from 'lucide-react';

// renderBadgeList renders a list of badges from an array of strings or objects with Title/name.
export const renderBadgeList = (
  items: (string | { Title?: string | null; name?: string | null } | undefined)[] | null | undefined,
  label: string,
  variant: 'secondary' | 'outline' = 'secondary'
) => {
  if (!items || items.length === 0) return null;
  // Use Boolean(...) to ensure the filter always returns a boolean (fixes lint error for beginners)
const validItems = items.filter(
  (item): item is string | { Title?: string | null; name?: string | null } =>
    Boolean(item && (typeof item === 'string' || (typeof item === 'object' && (item.Title || item.name))))
);
  if (validItems.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="text-md font-semibold text-muted-foreground mb-1.5">{label}</h3>
      <div className="flex flex-wrap gap-1">
        {validItems.map((item, index) => {
          const content = typeof item === 'string' ? item : item?.Title || item?.name || '';
          return (
            <Badge key={index} variant={variant}>
              {content}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export const renderDetailItem = (
  label: string,
  value: React.ReactNode | string | number | null | undefined,
  className?: string
) => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  return (
    <div className={`mb-4 ${className || ''}`.trim()}>
      <h3 className="text-md font-semibold text-muted-foreground mb-0.5">{label}</h3>
      {typeof value === 'string' || typeof value === 'number' ? (
        <p className="text-base text-foreground whitespace-pre-wrap">{value}</p>
      ) : (
        value
      )}
    </div>
  );
};

export const renderStarRating = (rating: number | null | undefined) => {
  if (rating === null || rating === undefined) return renderDetailItem('Importance Rating', 'Not Rated');
  return (
    <div className="mb-4">
      <h3 className="text-md font-semibold text-muted-foreground mb-0.5">Importance Rating</h3>
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        ))}
        <span className="ml-2 text-sm text-foreground">({rating}/5)</span>
      </div>
    </div>
  );
};

export const renderStringList = (items: string[] | null | undefined, label: string) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="text-md font-semibold text-muted-foreground mb-1">{label}</h3>
      <ul className="list-disc list-inside pl-2 space-y-0.5 text-base text-foreground">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export const renderUrlList = (items: string[] | null | undefined, label: string) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="text-md font-semibold text-muted-foreground mb-1">{label}</h3>
      <ul className="list-disc list-inside pl-2 space-y-0.5 text-base text-foreground">
        {items.map((url, idx) => (
          <li key={idx}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline break-all">
              {url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
};
