

export interface DataPoint {
  x: number;
  y: number;
  id: number;
}

export interface StatisticsResult {
  // Pearson metrics
  r: number;
  rSquared: number;
  // Spearman metrics
  spearmanRho: number;
  spearmanPValue: number;
  
  // Common metrics
  n: number;
  meanX: number;
  meanY: number;
  slope: number;
  intercept: number;
  standardDeviationX: number;
  standardDeviationY: number;
  covariance: number;
  pValue: number; // Pearson P-Value (2-tailed)
  
  // New: 1-tailed values
  pValueOneTailed: number;
  spearmanPValueOneTailed: number;
}

export type CorrelationType = 'pearson' | 'spearman';
export type AnalysisMode = 'simple' | 'hybrid';
export type ViewState = 'dashboard' | 'correlation' | 'anova' | 'descriptive' | 'reliability';
export type DescriptiveType = 'continuous' | 'categorical';

export interface AnalysisState {
  isLoading: boolean;
  result: string | null;
  error: string | null;
}

export interface LikertConfig {
  enabled: boolean;
  points: 5 | 7;
  isReversed: boolean;
  labels: string[];
}

export interface HypothesisResult {
  nullHypothesis: string;
  altHypothesis: string;
  decision: string;
  conclusion: string;
  isSignificant: boolean;
  alpha: number;
}

export interface DimensionInput {
  id: string;
  name: string;
  value: string;
}

export interface HybridResult {
  composite: {
    name: string;
    stats: StatisticsResult;
    hypothesis: HypothesisResult;
  };
  dimensions: {
    id: string;
    name: string;
    stats: StatisticsResult;
    hypothesis: HypothesisResult;
  }[];
}

// --- NEW ANOVA TYPES ---
export interface GroupInput {
  id: string;
  name: string;
  value: string;
  parsed?: number[];
}

export interface AnovaResult {
  groups: {
    name: string;
    n: number;
    mean: number;
    stdDev: number;
    sum: number;
  }[];
  ssBetween: number; // Sum of Squares Between
  ssWithin: number;  // Sum of Squares Within
  ssTotal: number;
  dfBetween: number;
  dfWithin: number;
  dfTotal: number;
  msBetween: number; // Mean Square
  msWithin: number;
  fStat: number;
  pValue: number;
  isSignificant: boolean;
}

// --- NEW DESCRIPTIVE TYPES ---
export interface FrequencyItem {
  value: string | number;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface DescriptiveResult {
  type: DescriptiveType;
  n: number;
  // For Continuous
  mean?: number;
  median?: number;
  mode?: number[];
  stdDev?: number;
  variance?: number;
  min?: number;
  max?: number;
  range?: number;
  skewness?: number;
  kurtosis?: number;
  standardError?: number;
  // For Categorical
  frequencies?: FrequencyItem[];
}

// --- RELIABILITY TYPES ---
export interface ItemReliability {
  id: string;
  name: string;
  mean: number;
  stdDev: number;
  correctedItemTotalCorr: number;
  alphaIfDeleted: number;
}

export interface ReliabilityResult {
  alpha: number;
  nItems: number; // k
  nParticipants: number; // N
  items: ItemReliability[];
  scaleMean: number;
  scaleStdDev: number;
}