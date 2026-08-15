"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row",
        month: "space-y-4",
        month_caption: "flex h-8 items-center justify-center relative",
        caption_label: "text-sm font-semibold",
        nav: "flex items-center",
        button_previous: cn(buttonVariants({ variant: "outline" }), "absolute left-1 h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100"),
        button_next: cn(buttonVariants({ variant: "outline" }), "absolute right-1 h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100"),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-[0.7rem] font-medium text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 rounded-xl p-0 font-normal aria-selected:opacity-100"),
        selected: "bg-[#37336e] text-white hover:bg-[#37336e] hover:text-white focus:bg-[#37336e] focus:text-white",
        today: "bg-[#eeeafd] text-[#37336e] font-bold",
        outside: "text-muted-foreground opacity-40",
        disabled: "text-muted-foreground opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...props }) => orientation === 'left' ? <ChevronLeft className={cn("h-4 w-4", className)} {...props} /> : <ChevronRight className={cn("h-4 w-4", className)} {...props} />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"
export { Calendar }
