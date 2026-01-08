"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// Generate years from current year going back 100 years
function getYears(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let i = 0; i <= 100; i++) {
    years.push(String(currentYear - i));
  }
  return years;
}

// Get days in a month, accounting for leap years
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Generate day options (1 to maxDays)
function getDays(maxDays: number): string[] {
  const days: string[] = [];
  for (let i = 1; i <= maxDays; i++) {
    days.push(String(i).padStart(2, "0"));
  }
  return days;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  id,
  disabled,
}: DatePickerProps) {
  // Parse the value string
  const [year, month, day] = React.useMemo(() => {
    if (value) {
      try {
        const parts = value.split("-");
        return [parts[0] || "", parts[1] || "", parts[2] || ""];
      } catch {
        return ["", "", ""];
      }
    }
    return ["", "", ""];
  }, [value]);

  const [selectedYear, setSelectedYear] = React.useState(year);
  const [selectedMonth, setSelectedMonth] = React.useState(month);
  const [selectedDay, setSelectedDay] = React.useState(day);

  // Update local state when value prop changes
  React.useEffect(() => {
    if (value) {
      try {
        const parts = value.split("-");
        setSelectedYear(parts[0] || "");
        setSelectedMonth(parts[1] || "");
        setSelectedDay(parts[2] || "");
      } catch {
        // Ignore parsing errors
      }
    } else {
      setSelectedYear("");
      setSelectedMonth("");
      setSelectedDay("");
    }
  }, [value]);

  // Calculate max days for the selected month/year
  const maxDays = React.useMemo(() => {
    if (selectedYear && selectedMonth) {
      return getDaysInMonth(
        Number.parseInt(selectedYear, 10),
        Number.parseInt(selectedMonth, 10)
      );
    }
    return 31; // Default to 31 if no month/year selected
  }, [selectedYear, selectedMonth]);

  // Update parent when any selector changes
  const handleChange = React.useCallback(
    (newYear: string, newMonth: string, newDay: string) => {
      if (newYear && newMonth && newDay) {
        // Validate the date
        const yearNum = Number.parseInt(newYear, 10);
        const monthNum = Number.parseInt(newMonth, 10);
        const dayNum = Number.parseInt(newDay, 10);
        const maxDaysForMonth = getDaysInMonth(yearNum, monthNum);

        // If selected day is invalid for the month, adjust it
        const validDay = dayNum > maxDaysForMonth ? maxDaysForMonth : dayNum;
        const formattedDay = String(validDay).padStart(2, "0");

        const formatted = `${newYear}-${newMonth}-${formattedDay}`;
        onChange?.(formatted);
      } else {
        onChange?.("");
      }
    },
    [onChange]
  );

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    // Adjust day if needed when year changes (leap year)
    if (selectedMonth && selectedDay) {
      const maxDaysForMonth = getDaysInMonth(
        Number.parseInt(newYear, 10),
        Number.parseInt(selectedMonth, 10)
      );
      const dayNum = Number.parseInt(selectedDay, 10);
      const validDay = dayNum > maxDaysForMonth ? maxDaysForMonth : dayNum;
      const formattedDay = String(validDay).padStart(2, "0");
      setSelectedDay(formattedDay);
      handleChange(newYear, selectedMonth, formattedDay);
    } else {
      handleChange(newYear, selectedMonth, selectedDay);
    }
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    // Adjust day if needed when month changes
    if (selectedYear && selectedDay) {
      const maxDaysForMonth = getDaysInMonth(
        Number.parseInt(selectedYear, 10),
        Number.parseInt(newMonth, 10)
      );
      const dayNum = Number.parseInt(selectedDay, 10);
      const validDay = dayNum > maxDaysForMonth ? maxDaysForMonth : dayNum;
      const formattedDay = String(validDay).padStart(2, "0");
      setSelectedDay(formattedDay);
      handleChange(selectedYear, newMonth, formattedDay);
    } else {
      handleChange(selectedYear, newMonth, selectedDay);
    }
  };

  const handleDayChange = (newDay: string) => {
    setSelectedDay(newDay);
    handleChange(selectedYear, selectedMonth, newDay);
  };

  const years = React.useMemo(() => getYears(), []);
  const days = React.useMemo(() => getDays(maxDays), [maxDays]);

  return (
    <div className={cn("flex items-center gap-2", className)} id={id}>
      <div className="flex flex-1 items-center gap-2">
        {/* Year Selector */}
        <Select
          disabled={disabled}
          onValueChange={handleYearChange}
          value={selectedYear}
        >
          <SelectTrigger className="h-9 min-w-[100px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month Selector */}
        <Select
          disabled={disabled}
          onValueChange={handleMonthChange}
          value={selectedMonth}
        >
          <SelectTrigger className="h-9 min-w-[140px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Day Selector */}
        <Select
          disabled={disabled || !selectedMonth || !selectedYear}
          onValueChange={handleDayChange}
          value={selectedDay}
        >
          <SelectTrigger className="h-9 min-w-[80px]">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={d}>
                {Number.parseInt(d, 10)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
