"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useDayPicker } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-sm font-bold",
        nav: "flex items-center gap-1",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex w-full mb-2",
        weekday:
          "text-muted-foreground rounded-md w-9 font-black text-[0.7rem] uppercase tracking-tighter flex-1 flex items-center justify-center",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative flex-1 flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 mx-auto rounded-full"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
        today: "bg-accent text-accent-foreground font-bold rounded-full",
        outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: ({ displayMonth }) => {
          const { goToMonth, nextMonth, previousMonth } = useDayPicker();
          return (
            <div className="flex justify-center items-center h-9 gap-4 mb-4 relative">
              <Button
                variant="outline"
                className="h-7 w-7 p-0 rounded-full border-2 bg-transparent opacity-70 hover:opacity-100"
                onClick={() => previousMonth && goToMonth(previousMonth)}
                disabled={!previousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold min-w-[100px] text-center">
                {format(displayMonth, "MMMM yyyy")}
              </span>
              <Button
                variant="outline"
                className="h-7 w-7 p-0 rounded-full border-2 bg-transparent opacity-70 hover:opacity-100"
                onClick={() => nextMonth && goToMonth(nextMonth)}
                disabled={!nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
