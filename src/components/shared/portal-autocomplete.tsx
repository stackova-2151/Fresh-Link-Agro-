'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Custom scrollbar styles (injected once)
if (typeof document !== 'undefined' && !document.getElementById('portal-autocomplete-styles')) {
  const style = document.createElement('style');
  style.id = 'portal-autocomplete-styles';
  style.textContent = `
    .portal-autocomplete-scroll::-webkit-scrollbar {
      width: 6px;
    }
    .portal-autocomplete-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .portal-autocomplete-scroll::-webkit-scrollbar-thumb {
      background-color: hsl(var(--muted));
      border-radius: 3px;
    }
    .portal-autocomplete-scroll::-webkit-scrollbar-thumb:hover {
      background-color: hsl(var(--muted-foreground) / 0.5);
    }
    .portal-autocomplete-scroll {
      scrollbar-width: thin;
      scrollbar-color: hsl(var(--muted)) transparent;
    }
  `;
  document.head.appendChild(style);
}

export interface ItemBrandSuggestion {
  id: string;
  displayText: string;
  itemName: string;
  brand: string;
  frequency?: number;
}

// Hook to calculate dropdown position relative to input
export function useDropdownPosition(inputRef: React.RefObject<HTMLInputElement | null>, isOpen: boolean) {
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!inputRef.current || !isOpen) {
      setPosition(null);
      return;
    }

    const rect = inputRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width
    });
  }, [inputRef, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    updatePosition();

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  return position;
}

// Portal-based Autocomplete Dropdown Component
interface PortalAutocompleteProps {
  isOpen: boolean;
  items: ItemBrandSuggestion[];
  highlightIndex: number;
  onSelect: (item: ItemBrandSuggestion) => void;
  onHighlightChange: (index: number) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  subtitle?: string;
}

export function PortalAutocomplete({
  isOpen,
  items,
  highlightIndex,
  onSelect,
  onHighlightChange,
  inputRef,
  subtitle
}: PortalAutocompleteProps) {
  const position = useDropdownPosition(inputRef, isOpen);
  const highlightedItemRef = useRef<HTMLDivElement>(null);

  // Scroll highlighted item into view when highlightIndex changes
  useEffect(() => {
    if (highlightedItemRef.current) {
      highlightedItemRef.current.scrollIntoView({
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [highlightIndex]);

  if (!isOpen || !position) {
    return null;
  }

  return createPortal(
    <div
      data-portal-autocomplete="true"
      className="portal-autocomplete-scroll fixed z-[9999] max-h-64 overflow-y-auto rounded-md border bg-background shadow-xl"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          ref={index === highlightIndex ? highlightedItemRef : null}
          data-portal-autocomplete="true"
          className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
            index === highlightIndex
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
          onMouseDown={() => onSelect(item)}
          onMouseEnter={() => onHighlightChange(index)}
        >
          <div className="font-medium">{item.displayText}</div>
          {subtitle && (
            <div className={`text-xs ${index === highlightIndex ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              {subtitle}
            </div>
          )}
          {!subtitle && item.frequency !== undefined && (
            <div className={`text-xs ${index === highlightIndex ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              Used {item.frequency} times
            </div>
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}
