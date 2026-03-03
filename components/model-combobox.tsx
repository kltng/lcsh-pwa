"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ModelOption {
  id: string;
  name: string;
}

interface ModelComboboxProps {
  models: ModelOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  allowCustom?: boolean;
}

const MAX_RENDERED = 50;

export function ModelCombobox({
  models,
  value,
  onValueChange,
  placeholder = "Select a model",
  disabled = false,
  loading = false,
  allowCustom = false,
}: ModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return models.slice(0, MAX_RENDERED);
    const lower = search.toLowerCase();
    return models
      .filter(
        (m) =>
          m.name.toLowerCase().includes(lower) ||
          m.id.toLowerCase().includes(lower)
      )
      .slice(0, MAX_RENDERED);
  }, [models, search]);

  const selectedModel = models.find((m) => m.id === value);
  const displayValue = selectedModel
    ? selectedModel.name !== selectedModel.id
      ? selectedModel.name
      : selectedModel.id
    : value || "";

  const hasExactMatch = models.some(
    (m) => m.id.toLowerCase() === search.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled || loading}
        >
          <span className="truncate">
            {loading ? "Loading models..." : value ? displayValue : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search models..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !allowCustom && (
              <CommandEmpty>No models found.</CommandEmpty>
            )}
            {filtered.length === 0 && allowCustom && !search && (
              <CommandEmpty>No models found.</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => {
                    onValueChange(model.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === model.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{model.name}</span>
                    {model.name !== model.id && (
                      <span className="text-xs text-muted-foreground truncate">
                        {model.id}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {allowCustom && search && !hasExactMatch && (
              <CommandGroup>
                <CommandItem
                  value={`custom:${search}`}
                  onSelect={() => {
                    onValueChange(search);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span className="text-muted-foreground">
                    Use custom model:{" "}
                    <span className="font-medium text-foreground">{search}</span>
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
