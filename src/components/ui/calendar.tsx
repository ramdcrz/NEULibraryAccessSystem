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
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mb-6",
        caption_label: "text-sm font-bold",
        nav: "hidden",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex w-full mb-3",
        weekday:
          "text-muted-foreground rounded-md w-9 font-black text-[0.65rem] uppercase tracking-widest flex-1 flex items-center justify-center",
        week: "flex w-full mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative flex-1 flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium aria-selected:opacity-100 mx-auto rounded-full transition-colors hover:bg-primary/5"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full shadow-lg shadow-primary/20",
        today: "text-primary font-black rounded-full border border-primary/20",
        outside:
          "day-outside text-muted-foreground/30 aria-selected:bg-accent/50",
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
            <div className="flex justify-center items-center h-10 gap-3 mb-4">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-full border-2 border-primary/10 bg-transparent hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center justify-center"
                onClick={() => previousMonth && goToMonth(previousMonth)}
                disabled={!previousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-black tracking-tight min-w-[120px] text-center">
                {format(displayMonth, "MMMM yyyy")}
              </div>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-full border-2 border-primary/10 bg-transparent hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center justify-center"
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
