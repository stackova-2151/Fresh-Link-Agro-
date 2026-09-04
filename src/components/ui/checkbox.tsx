"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer shrink-0 rounded-[4px] border-[1.5px] border-[hsl(var(--border-strong))] bg-transparent ring-offset-background"
      + " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      + " disabled:cursor-not-allowed disabled:opacity-50"
      + " data-[state=checked]:bg-[#0F6E56] data-[state=checked]:border-[#0F6E56] data-[state=checked]:text-white"
      + " transition-[background-color,border-color]",
      className
    )}
    style={{ width: 18, height: 18, transitionDuration: 'var(--dur-fast, 0.15s)', transitionTimingFunction: 'ease', ...((props as React.CSSProperties & typeof props).style) }}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-3.5 w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
