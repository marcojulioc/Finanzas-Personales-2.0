'use client'

import dynamic from 'next/dynamic'

// Lazy load chart components
export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  {
    loading: () => (
      <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
    ),
    ssr: false,
  }
)

export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  {
    loading: () => (
      <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
    ),
    ssr: false,
  }
)

export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  {
    loading: () => (
      <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
    ),
    ssr: false,
  }
)

export const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  {
    loading: () => (
      <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
    ),
    ssr: false,
  }
)

// Re-export non-lazy components (these are small and needed immediately)
export {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Pie,
  Cell,
  Line,
  Area,
  ResponsiveContainer,
} from 'recharts'
