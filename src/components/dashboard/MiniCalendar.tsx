import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { isHoliday, getHolidaysForMonth } from '@/lib/holidays';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MiniCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  appointmentDates?: string[];
}

export function MiniCalendar({ selectedDate, onDateSelect, appointmentDates = [] }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const holidays = getHolidaysForMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // Padding for days before the first of month
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={previousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const holiday = isHoliday(dateStr);
          const hasAppointment = appointmentDates.includes(dateStr);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          const dayContent = (
            <button
              onClick={() => onDateSelect?.(day)}
              className={cn(
                'aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative',
                isSelected && 'bg-primary text-primary-foreground',
                isToday && !isSelected && 'border-2 border-primary',
                holiday && !isSelected && 'text-destructive font-medium border border-red-500 rounded-md',
                !isSelected && !holiday && 'hover:bg-accent text-foreground'
              )}
            >
              <span>{format(day, 'd')}</span>
              {hasAppointment && (
                <span className={cn(
                  'absolute bottom-1 w-1 h-1 rounded-full',
                  isSelected ? 'bg-primary-foreground' : 'bg-primary'
                )} />
              )}
            </button>
          );

          if (holiday) {
            return (
              <Tooltip key={dateStr}>
                <TooltipTrigger asChild>
                  {dayContent}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{holiday.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={dateStr}>{dayContent}</div>;
        })}
      </div>

      {/* Holidays legend */}
      {holidays.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Feriados do mês:</p>
          <div className="space-y-1">
            {holidays.map((h) => (
              <div key={h.date} className="flex items-center gap-2 text-xs">
                <span className="text-destructive font-medium">
                  {format(new Date(h.date + 'T00:00:00'), 'd')}
                </span>
                <span className="text-muted-foreground">{h.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
