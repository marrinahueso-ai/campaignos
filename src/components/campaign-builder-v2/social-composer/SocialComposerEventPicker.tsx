"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  filterCampaignOptionsBySearch,
  SOCIAL_COMPOSER_EVENT_SEARCH_PLACEHOLDER,
} from "@/lib/campaign-builder-v2/social-composer-event-search";
import type { CampaignOption } from "@/lib/campaign-builder-v2/types";
import { normalizeDateOnly } from "@/lib/utils/dates";

function formatPickerDate(date: string): string {
  const normalized = normalizeDateOnly(date);
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SocialComposerEventPickerProps {
  selectedEventId: string;
  campaignOptions: CampaignOption[];
  onSelect: (campaignId: string) => void;
}

export function SocialComposerEventPicker({
  selectedEventId,
  campaignOptions,
  onSelect,
}: SocialComposerEventPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const today = useMemo(() => normalizeDateOnly(new Date().toISOString()), []);

  const selectedOption =
    campaignOptions.find((option) => option.id === selectedEventId) ?? null;

  const filteredOptions = useMemo(
    () => filterCampaignOptionsBySearch(campaignOptions, query, today),
    [campaignOptions, query, today],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleSelect(option: CampaignOption) {
    setOpen(false);
    setQuery("");
    if (option.id !== selectedEventId) {
      onSelect(option.id);
    }
  }

  const showMenu = open && campaignOptions.length > 0;
  const inputValue = open || query ? query : (selectedOption?.title ?? "");

  return (
    <div className="event-picker" ref={containerRef}>
      <input
        ref={inputRef}
        id="social-composer-event-search"
        type="search"
        className="field"
        value={inputValue}
        placeholder={SOCIAL_COMPOSER_EVENT_SEARCH_PLACEHOLDER}
        aria-label={SOCIAL_COMPOSER_EVENT_SEARCH_PLACEHOLDER}
        aria-expanded={showMenu}
        aria-haspopup="listbox"
        aria-controls="social-composer-event-options"
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(event) => {
          setOpen(true);
          setQuery(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
            inputRef.current?.blur();
          }
        }}
      />

      {showMenu ? (
        <ul
          id="social-composer-event-options"
          role="listbox"
          className="event-picker-menu"
          aria-label="Matching events"
        >
          {filteredOptions.length === 0 ? (
            <li className="event-picker-empty">No matching events</li>
          ) : (
            filteredOptions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === selectedEventId}
                  className={`event-picker-option${
                    option.id === selectedEventId ? " selected" : ""
                  }`}
                  onMouseDown={(mouseEvent) => {
                    mouseEvent.preventDefault();
                    handleSelect(option);
                  }}
                >
                  <span className="event-picker-title">{option.title}</span>
                  <span className="event-picker-meta">
                    {formatPickerDate(option.date)}
                    {option.eventOwner?.trim()
                      ? ` · ${option.eventOwner.trim()}`
                      : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

export { SOCIAL_COMPOSER_EVENT_SEARCH_PLACEHOLDER };
