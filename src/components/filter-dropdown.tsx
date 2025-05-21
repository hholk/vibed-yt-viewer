'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchDistinctValues } from '@/lib/nocodb';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const FILTER_STORAGE_KEY = 'yt-viewer-filter-preference';

interface FilterOption {
  value: string;
  label: string;
}

const categoryOptions: FilterOption[] = [
  { value: 'ImportanceRating', label: 'Importance Rating' },
  { value: 'BookMediaRecommendations', label: 'Book/Media Recommendations' },
  { value: 'URLs', label: 'URLs' },
  { value: 'VideoGenre', label: 'Video Genre' },
  { value: 'Persons', label: 'Persons' },
  { value: 'Companies', label: 'Companies' },
  { value: 'Indicators', label: 'Indicators' },
  { value: 'Trends', label: 'Trends' },
  { value: 'InvestableAssets', label: 'Investable Assets' },
  { value: 'TickerSymbol', label: '$Ticker' },
  { value: 'Institutions', label: 'Institutions' },
  { value: 'EventsFairs', label: 'Events/Fairs' },
  { value: 'Hashtags', label: 'Hashtags' },
  { value: 'MainTopic', label: 'Main Topic' },
  { value: 'PrimarySources', label: 'Primary Sources' },
  { value: 'Sentiment', label: 'Sentiment' },
  { value: 'Channel', label: 'Channel' },
  { value: 'TechnicalTerms', label: 'Technical Terms' },
  { value: 'Speaker', label: 'Speaker' },
];

export function FilterDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [openCategory, setOpenCategory] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('');
  const [selectedValues, setSelectedValues] = React.useState<string[]>([]);
  const [availableValues, setAvailableValues] = React.useState<string[]>([]);
  const [loadingValues, setLoadingValues] = React.useState(false);

  React.useEffect(() => {
    const storedCategory = sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (storedCategory) {
      setSelectedCategory(storedCategory);
    }

    // Get initial filter values from URL
    const filterCategory = searchParams.get('filterCategory');
    const filterValues = searchParams.get('filterValues')?.split(',') || [];
    if (filterCategory) {
      setSelectedCategory(filterCategory);
      setSelectedValues(filterValues);
    }
  }, [searchParams]);

  const handleCategoryChange = async (value: string) => {
    console.log(`[FilterDropdown] Category changed to: ${value}`);
    setSelectedCategory(value);
    setSelectedValues([]);
    sessionStorage.setItem(FILTER_STORAGE_KEY, value);
    setOpenCategory(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set('filterCategory', value);
    params.delete('filterValues');
    router.push(`/?${params.toString()}`);

    // Fetch available values for the selected category
    // setLoadingValues(true); // Moved to within the try block
    setLoadingValues(true);
    setAvailableValues([]); // Clear previous values
    try {
      console.log(`[FilterDropdown] Fetching distinct values for category: ${value}`);
      const fetchedValues = await fetchDistinctValues(value);
      console.log(`[FilterDropdown] Fetched values for ${value}:`, fetchedValues);
      setAvailableValues(fetchedValues);
    } catch (error) {
      console.error(`[FilterDropdown] Error fetching values for ${value}:`, error);
      setAvailableValues([]);
    } finally {
      setLoadingValues(false);
      console.log(`[FilterDropdown] Finished fetching values for ${value}. Loading: ${loadingValues}`);
    }
  };

  const handleValueSelect = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    setSelectedValues(newValues);

    const params = new URLSearchParams(searchParams.toString());
    if (newValues.length > 0) {
      params.set('filterValues', newValues.join(','));
    } else {
      params.delete('filterValues');
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      <Popover open={openCategory} onOpenChange={setOpenCategory}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={openCategory}
            className="w-[200px] justify-between"
          >
            {selectedCategory
              ? categoryOptions.find((cat) => cat.value === selectedCategory)?.label
              : "Select category..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search categories..." />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                {categoryOptions.map((category) => (
                  <CommandItem
                    key={category.value}
                    value={category.value}
                    onSelect={handleCategoryChange}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCategory === category.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCategory && (
        <div className="flex flex-col gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[200px] justify-between"
              >
                {selectedValues.length > 0
                  ? `${selectedValues.length} selected`
                  : "Select values..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search values..." />
                <CommandList>
                  <CommandEmpty>No values found.</CommandEmpty>
                  <CommandGroup>
                    {loadingValues ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Loading values...
                      </div>
                    ) : availableValues.length > 0 ? (
                      availableValues.map((value) => (
                        <CommandItem
                          key={value}
                          value={value}
                          onSelect={handleValueSelect}
                          className="data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground text-popover-foreground focus:bg-accent focus:text-accent-foreground hover:text-accent-foreground hover:bg-accent"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedValues.includes(value) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {value}
                        </CommandItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No values available
                      </div>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedValues.map((value) => (
                <Badge
                  key={value}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleValueSelect(value)}
                >
                  {value}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
