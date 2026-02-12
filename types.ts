
// Fix: Updated AnalysisMode to include 'hybrid' to match StatisticalTable expectations
export type AnalysisMode = 'simple' | 'advanced' | 'hybrid';
export type ViewState = 'dashboard' | 'correlation' | 'anova' | 'descriptive' | 'reliability' | 'ttest' | 'regression' | 'chisquare' | 'mannwhitney' | 'kruskalwallis' | 'normality';
export type CorrelationType = 'pearson' | 'spearman';

export interface DataPoint {
  x: number;
  y: number;
  id: number;
}

export interface StatisticsResult {
  r: number;
  rSquared: number;
  spearmanRho: number;
  spearmanPValue: number;
  n: number;
  meanX: number;
  meanY: number;
  slope: number;
  intercept: number;
  standardDeviationX: number;
  standardDeviationY: number;
  covariance: number;
  pValue: number; 
  pValueOneTailed: number;
  spearmanPValueOneTailed: number;
  sums?: {
    sumX: number;
    sumY: number;
    sumX2: number;
    sumY2: number;
    sumXY: number;
    ssX: number;
    ssY: number;
    spXY: number;
  };
}

export interface TableColumn {
  id: string;
  name: string;
  values: string[];
}

export interface TableData {
  columns: TableColumn[];
  rowCount: number;
}

export interface AnalysisState {
  isLoading: boolean;
  result: string | null;
  error: string | null;
}

// Fix: Added HypothesisResult for statistical reporting
export interface HypothesisResult {
  nullHypothesis: string;
  altHypothesis: string;
  decision: string;
  conclusion: string;
  isSignificant: boolean;
  alpha: number;
}

// Additional common statistical types used across views
export interface NormalityResult {
  variableName: string;
  n: number;
  mean: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  ksStat: number;
  pValue: number;
  isNormal: boolean;
  recommendation: string;
  // Fix: Use specialized types for better type checking
  histogramData: HistogramBin[];
  qqPlotData: QQPoint[];
}

export interface MannWhitneyResult {
  group1: any;
  group2: any;
  uStat: number;
  zStat: number;
  pValue: number;
  isSignificant: boolean;
  totalN: number;
}

export interface KruskalWallisResult {
  groups: any[];
  hStat: number;
  df: number;
  pValue: number;
  isSignificant: boolean;
  totalN: number;
}

export interface ChiSquareResult {
  n: number;
  chiSquare: number;
  df: number;
  pValue: number;
  isSignificant: boolean;
  cramersV: number;
  labelX: string;
  labelY: string;
  rows: string[];
  cols: string[];
  observed: number[][];
  expected: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

export interface RegressionResult {
  n: number;
  slope: number;
  intercept: number;
  r: number;
  rSquared: number;
  adjRSquared: number;
  stdErrorEstimate: number;
  fStat: number;
  pValue: number;
  isSignificant: boolean;
  labelX: string;
  labelY: string;
  anova: any;
  sums: any;
}

export interface TTestResult {
  // Fix: Use TTestType instead of inline literal
  type: TTestType;
  group1: any;
  group2: any;
  tStat: number;
  df: number;
  pValue: number;
  pValueOneTailed: number;
  isSignificant: boolean;
  meanDifference: number;
  stdErrorDifference: number;
  cohensD: number;
  ciLower: number;
  ciUpper: number;
  pooledStdDev?: number;
  diffStats?: any;
}

export interface AnovaResult {
  groups: any[];
  ssBetween: number;
  ssWithin: number;
  ssTotal: number;
  dfBetween: number;
  dfWithin: number;
  dfTotal: number;
  msBetween: number;
  msWithin: number;
  fStat: number;
  pValue: number;
  isSignificant: boolean;
  grandMean: number;
}

export interface ReliabilityResult {
  alpha: number;
  nItems: number;
  nParticipants: number;
  scaleMean: number;
  scaleStdDev: number;
  sumItemVariances: number;
  totalVariance: number;
  // Fix: Use ItemReliability type
  items: ItemReliability[];
}

// Fix: Added ItemReliability for Cronbach's Alpha items
export interface ItemReliability {
  id: string;
  name: string;
  mean: number;
  stdDev: number;
  variance: number;
  correctedItemTotalCorr: number;
  alphaIfDeleted: number;
}

export interface DescriptiveResult {
  type: 'continuous' | 'categorical';
  n: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  variance?: number;
  min?: number;
  max?: number;
  range?: number;
  sumX?: number;
  sumX2?: number;
  ss?: number;
  standardError?: number;
  skewness?: number;
  kurtosis?: number;
  // Fix: Added FrequencyItem type
  frequencies?: FrequencyItem[];
}

// Fix: Added FrequencyItem for categorical descriptors
export interface FrequencyItem {
  value: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface GroupInput {
  id: string;
  name: string;
  value: string;
  parsed?: number[];
}

export interface LikertConfig {
  enabled: boolean;
  labels: string[];
  isReversed: boolean;
  points: number;
}

export interface HybridResult {
  composite: {
    name: string;
    stats: StatisticsResult;
  };
  dimensions: {
    id: string;
    name: string;
    stats: StatisticsResult;
    hypothesis: any;
  }[];
}

export type DescriptiveType = 'continuous' | 'categorical';

// Fix: Added TTestType used in t-test calculations
export type TTestType = 'independent' | 'paired';

// Fix: Added BoxPlotStats used for visualization
export interface BoxPlotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

// Fix: Added HistogramBin for normality charts
export interface HistogramBin {
  binLabel: string;
  count: number;
  normalValue: number;
}

// Fix: Added QQPoint for Q-Q diagnostic plots
export interface QQPoint {
  theoretical: number;
  observed: number;
}
