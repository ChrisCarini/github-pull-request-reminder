import fs from 'fs'

export interface MetricsData {
  metrics: Metrics;
  thresholds: Threshold[];
}

export interface Metrics {
  'Code Review Latency': Percentiles;
  'Time to Approval': Percentiles;
  'Time to Merge': Percentiles;
}

interface Percentiles {
  P50: Sizes;
  P90: Sizes;
}

interface Sizes {
  Large: number;
  Medium: number;
  Overall: number;
  Small: number;
  'X-Large': number;
}

interface Threshold {
  name: string;
  threshold: number;
}


export function getMetrics(): MetricsData {
  const response = fs.readFileSync('./data.json', 'utf-8')
  return JSON.parse(response)
}