// Feriados brasileiros
export interface Holiday {
  date: string;
  name: string;
  type: 'national' | 'optional';
}

// Calcula a data da Páscoa usando o algoritmo de Butcher
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getBrazilianHolidays(year: number): Holiday[] {
  const easter = getEasterDate(year);
  
  const holidays: Holiday[] = [
    // Feriados fixos
    { date: `${year}-01-01`, name: 'Ano Novo', type: 'national' },
    { date: `${year}-04-21`, name: 'Tiradentes', type: 'national' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho', type: 'national' },
    { date: `${year}-09-07`, name: 'Independência do Brasil', type: 'national' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', type: 'national' },
    { date: `${year}-11-02`, name: 'Finados', type: 'national' },
    { date: `${year}-11-15`, name: 'Proclamação da República', type: 'national' },
    { date: `${year}-12-25`, name: 'Natal', type: 'national' },
    
    // Feriados móveis baseados na Páscoa
    { date: formatDate(addDays(easter, -47)), name: 'Carnaval', type: 'optional' },
    { date: formatDate(addDays(easter, -46)), name: 'Carnaval', type: 'optional' },
    { date: formatDate(addDays(easter, -2)), name: 'Sexta-feira Santa', type: 'national' },
    { date: formatDate(easter), name: 'Páscoa', type: 'national' },
    { date: formatDate(addDays(easter, 60)), name: 'Corpus Christi', type: 'optional' },
  ];

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

export function isHoliday(date: string): Holiday | undefined {
  const year = new Date(date).getFullYear();
  const holidays = getBrazilianHolidays(year);
  return holidays.find(h => h.date === date);
}

export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const holidays = getBrazilianHolidays(year);
  const monthStr = String(month + 1).padStart(2, '0');
  return holidays.filter(h => h.date.startsWith(`${year}-${monthStr}`));
}
