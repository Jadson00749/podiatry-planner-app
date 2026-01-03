import { format } from 'date-fns';
import { isHoliday } from './holidays';

/**
 * Verifica se uma data é anterior ao dia atual
 * @param date - Data a ser verificada
 * @returns true se a data for anterior ao dia atual
 */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Verifica se uma data é feriado
 * @param date - Data a ser verificada
 * @returns true se a data for um feriado
 */
export function isHolidayDate(date: Date): boolean {
  const dateString = format(date, 'yyyy-MM-dd');
  return !!isHoliday(dateString);
}

/**
 * Função para usar como disabled no Calendar component
 * Desabilita datas passadas
 */
export function disablePastDates(date: Date): boolean {
  return isPastDate(date);
}

