'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

function Popover({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return (
    <>
      {open && onOpenChange && createPortal(
        <div
          className="fixed inset-0 z-40 cursor-default"
          tabIndex={-1}
          role="presentation"
          onMouseDown={() => onOpenChange(false)}
          onClick={() => onOpenChange(false)}
        />,
        document.body
      )}
      <PopoverPrimitive.Root
        data-slot="popover"
        open={open}
        onOpenChange={onOpenChange}
        {...props}
      />
    </>
  )
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

const PopoverContent = React.forwardRef(function PopoverContent(
  {
    className,
    align = 'center',
    sideOffset = 4,
    ...props
  }: React.ComponentProps<typeof PopoverPrimitive.Content>,
  forwardedRef: React.Ref<HTMLDivElement>,
) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
          className
        )}
        ref={forwardedRef}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
