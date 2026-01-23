// Definicion de monedas soportadas

export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  flag: string
  region: string
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  // Norteamerica
  USD: { code: 'USD', name: 'Dolar estadounidense', symbol: '$', flag: '🇺🇸', region: 'Norteamerica' },
  MXN: { code: 'MXN', name: 'Peso mexicano', symbol: '$', flag: '🇲🇽', region: 'Norteamerica' },
  CAD: { code: 'CAD', name: 'Dolar canadiense', symbol: 'C$', flag: '🇨🇦', region: 'Norteamerica' },
  // Caribe
  DOP: { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$', flag: '🇩🇴', region: 'Caribe' },
  HTG: { code: 'HTG', name: 'Gourde haitiano', symbol: 'G', flag: '🇭🇹', region: 'Caribe' },
  JMD: { code: 'JMD', name: 'Dolar jamaiquino', symbol: 'J$', flag: '🇯🇲', region: 'Caribe' },
  TTD: { code: 'TTD', name: 'Dolar de Trinidad y Tobago', symbol: 'TT$', flag: '🇹🇹', region: 'Caribe' },
  BBD: { code: 'BBD', name: 'Dolar de Barbados', symbol: 'Bds$', flag: '🇧🇧', region: 'Caribe' },
  BSD: { code: 'BSD', name: 'Dolar bahames', symbol: 'B$', flag: '🇧🇸', region: 'Caribe' },
  CUP: { code: 'CUP', name: 'Peso cubano', symbol: '₱', flag: '🇨🇺', region: 'Caribe' },
  // Centroamerica
  GTQ: { code: 'GTQ', name: 'Quetzal guatemalteco', symbol: 'Q', flag: '🇬🇹', region: 'Centroamerica' },
  HNL: { code: 'HNL', name: 'Lempira hondureno', symbol: 'L', flag: '🇭🇳', region: 'Centroamerica' },
  NIO: { code: 'NIO', name: 'Cordoba nicaraguense', symbol: 'C$', flag: '🇳🇮', region: 'Centroamerica' },
  CRC: { code: 'CRC', name: 'Colon costarricense', symbol: '₡', flag: '🇨🇷', region: 'Centroamerica' },
  PAB: { code: 'PAB', name: 'Balboa panameno', symbol: 'B/.', flag: '🇵🇦', region: 'Centroamerica' },
  // Sudamerica
  COP: { code: 'COP', name: 'Peso colombiano', symbol: '$', flag: '🇨🇴', region: 'Sudamerica' },
  VES: { code: 'VES', name: 'Bolivar venezolano', symbol: 'Bs.', flag: '🇻🇪', region: 'Sudamerica' },
  PEN: { code: 'PEN', name: 'Sol peruano', symbol: 'S/', flag: '🇵🇪', region: 'Sudamerica' },
  CLP: { code: 'CLP', name: 'Peso chileno', symbol: '$', flag: '🇨🇱', region: 'Sudamerica' },
  ARS: { code: 'ARS', name: 'Peso argentino', symbol: '$', flag: '🇦🇷', region: 'Sudamerica' },
  BRL: { code: 'BRL', name: 'Real brasileno', symbol: 'R$', flag: '🇧🇷', region: 'Sudamerica' },
  UYU: { code: 'UYU', name: 'Peso uruguayo', symbol: '$U', flag: '🇺🇾', region: 'Sudamerica' },
  PYG: { code: 'PYG', name: 'Guarani paraguayo', symbol: '₲', flag: '🇵🇾', region: 'Sudamerica' },
  BOB: { code: 'BOB', name: 'Boliviano', symbol: 'Bs', flag: '🇧🇴', region: 'Sudamerica' },
  // Europa
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', region: 'Europa' },
  GBP: { code: 'GBP', name: 'Libra esterlina', symbol: '£', flag: '🇬🇧', region: 'Europa' },
  CHF: { code: 'CHF', name: 'Franco suizo', symbol: 'CHF', flag: '🇨🇭', region: 'Europa' },
}

// Monedas agrupadas por region
export const CURRENCIES_BY_REGION = {
  Caribe: ['DOP', 'HTG', 'JMD', 'TTD', 'BBD', 'BSD', 'CUP'],
  Norteamerica: ['USD', 'MXN', 'CAD'],
  Centroamerica: ['GTQ', 'HNL', 'NIO', 'CRC', 'PAB'],
  Sudamerica: ['COP', 'VES', 'PEN', 'CLP', 'ARS', 'BRL', 'UYU', 'PYG', 'BOB'],
  Europa: ['EUR', 'GBP', 'CHF'],
}

// Orden de regiones para mostrar
export const REGION_ORDER = ['Caribe', 'Norteamerica', 'Centroamerica', 'Sudamerica', 'Europa']

// Monedas populares (para mostrar primero)
export const POPULAR_CURRENCIES = ['DOP', 'USD', 'EUR', 'MXN']

// Obtener info de una moneda
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCIES[code]
}

// Formatear monto con moneda
export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  const currency = CURRENCIES[currencyCode]
  if (!currency) {
    return `${currencyCode} ${amount.toFixed(2)}`
  }

  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Lista de todas las monedas como array
export const ALL_CURRENCIES = Object.values(CURRENCIES)
