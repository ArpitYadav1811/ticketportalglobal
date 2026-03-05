"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  subtitle?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const [popoverWidth, setPopoverWidth] = React.useState<number | undefined>(undefined)

  const selectedOption = options.find((option) => option.value === value)

  React.useEffect(() => {
    if (triggerRef.current && open) {
      setPopoverWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

  return (
    <div ref={triggerRef} className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between px-4 py-3 h-auto text-left font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">
              {selectedOption ? (
                <span className="flex items-center gap-2">
                  <span>{selectedOption.label}</span>
                  {selectedOption.subtitle && (
                    <>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-xs text-muted-foreground">{selectedOption.subtitle}</span>
                    </>
                  )}
                </span>
              ) : (
                placeholder
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="p-0" 
          align="start"
          style={{ width: popoverWidth ? `${popoverWidth}px` : undefined }}
        >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-11 border-b border-0 focus:ring-0 px-3" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className="cursor-pointer"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  <div className="flex items-center gap-2">
                    <span>{option.label}</span>
                    {option.subtitle && (
                      <>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-xs text-muted-foreground">{option.subtitle}</span>
                      </>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
  )
}
