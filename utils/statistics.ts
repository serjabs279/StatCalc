
import { DataPoint, StatisticsResult, LikertConfig, HypothesisResult, CorrelationType, GroupInput, AnovaResult, DescriptiveResult, FrequencyItem, ReliabilityResult, ItemReliability, TTestResult, TTestType, RegressionResult, ChiSquareResult, MannWhitneyResult, KruskalWallisResult, BoxPlotStats, NormalityResult, HistogramBin, QQPoint } from '../types';

// Regularized Lower Incomplete Gamma function P(a, x)
function regularizedGammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x > a + 1) return 1 - regularizedGammaQ(a, x);
  
  // Series expansion
  let sum = 1 / a;
  let term = sum;
  for (let n = 1; n < 100; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
  }
  return Math.exp(a * Math.log(x) - x - logGamma(a)) * sum;
}

// Regularized Upper Incomplete Gamma function Q(a, x)
function regularizedGammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  if (x < a + 1) return 1 - regularizedGammaP(a, x);
  
  // Continued fraction
  const tiny = 1e-30;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 100; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = c * d;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return Math.exp(a * Math.log(x) - x - logGamma(a)) * h;
}

// Higher precision Lanczos approximation for log-gamma function (15 decimal places)
function logGamma(z: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  let x = z;
  let y = z;
  let tmp = x + 7.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = c[0];
  for (let i = 1; i < c.length; i++) {
    ser += c[i] / ++y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// Robust Regularized Incomplete Beta Function Ix(a, b)
function betainc(x: number, a: number, b: number): number {
  if (x < 0.0 || x > 1.0) return 0.0;
  if (x === 0.0) return 0.0;
  if (x === 1.0) return 1.0;

  if (x > (a + 1.0) / (a + b + 2.0)) {
    return 1.0 - betainc(1.0 - x, b, a);
  }

  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1.0 - x) - lbeta) / a;

  const ITMAX = 200;
  const EPS = 1e-14;
  const FPMIN = 1.0e-30;

  let f = 1.0;
  let c = 1.0;
  let d = 0.0;

  for (let m = 1; m <= ITMAX; m++) {
    const m2 = 2 * m;
    let numer = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1.0 + numer * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + numer / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    f *= c * d;

    numer = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1.0 + numer * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + numer / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    f *= c * d;

    if (Math.abs(1.0 - c * d) < EPS) break;
  }

  return front * f;
}

// Error function approximation
function erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return sign * y;
}

// Standard Normal CDF
function normalCDF(x: number, mean: number, stdDev: number): number {
    return 0.5 * (1 + erf((x - mean) / (stdDev * Math.sqrt(2))));
}

// Inverse Standard Normal CDF (Approximate)
function invNormalCDF(p: number): number {
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732569343734e0, 4.374664141464968e0, 2.938163982698783e0];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    if (p < pLow) {
        const q = Math.sqrt(-2 * Math.log(p));
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
        const q = p - 0.5;
        const r = q * q;
        return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
        const q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
}

function getStableSS(data: number[]): { ss: number, mean: number, sum: number, sumSq: number } {
  const n = data.length;
  if (n === 0) return { ss: 0, mean: 0, sum: 0, sumSq: 0 };
  
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  
  let ss = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const diff = data[i] - mean;
    ss += diff * diff;
    sumSq += data[i] * data[i];
  }
  
  return { ss, mean, sum, sumSq };
}

function getStableSP(x: number[], y: number[]): number {
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  let sp = 0;
  for (let i = 0; i < n; i++) {
    sp += (x[i] - meanX) * (y[i] - meanY);
  }
  return sp;
}

function calculatePValue(r: number, n: number): number {
  const df = n - 2;
  if (Math.abs(r) >= 1) return 0;
  if (df <= 0) return 1.0;
  const t = r * Math.sqrt(df) / Math.sqrt(1 - r * r);
  const x = df / (df + t * t);
  return betainc(x, df / 2, 0.5);
}

function calculateTPValue(t: number, df: number): number {
  if (df <= 0) return 1.0;
  const x = df / (df + t * t);
  return betainc(x, df / 2, 0.5);
}

function calculateFPValue(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1.0;
  const x = df2 / (df2 + df1 * f);
  return betainc(x, df2 / 2, df1 / 2);
}

function calculateChiSquarePValue(chiSq: number, df: number): number {
  if (df <= 0) return 1.0;
  return regularizedGammaQ(df / 2, chiSq / 2);
}

function calculateZNormalPValue(z: number): number {
  return 1 - 0.5 * (1 + Math.sign(z) * regularizedGammaP(0.5, 0.5 * z * z));
}

function getRanks(values: number[]): number[] {
  const mapped = values.map((v, i) => ({ v, i }));
  mapped.sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length).fill(0);
  let i = 0;
  while (i < mapped.length) {
    let j = i;
    while (j < mapped.length - 1 && mapped[j].v === mapped[j + 1].v) {
      j++;
    }
    const rank = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) {
      ranks[mapped[k].i] = rank;
    }
    i = j + 1;
  }
  return ranks;
}

function getBoxPlotStats(data: number[]): BoxPlotStats {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  
  const getMedian = (arr: number[]) => {
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
  };

  const median = getMedian(sorted);
  const q1 = getMedian(sorted.slice(0, Math.floor(n / 2)));
  const q3 = getMedian(sorted.slice(Math.ceil(n / 2)));
  
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  
  const outliers = sorted.filter(v => v < lowerFence || v > upperFence);
  const nonOutliers = sorted.filter(v => v >= lowerFence && v <= upperFence);
  
  return {
    min: nonOutliers.length > 0 ? nonOutliers[0] : sorted[0],
    q1,
    median,
    q3,
    max: nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : sorted[n - 1],
    outliers
  };
}

export const calculateNormalityCheck = (data: number[], variableName: string = "Variable"): NormalityResult | null => {
    const n = data.length;
    if (n < 5) return null;

    const stats = getStableSS(data);
    const mean = stats.mean;
    const stdDev = Math.sqrt(stats.ss / (n - 1));

    if (stdDev === 0) return null;

    // 1. Descriptives
    const sorted = [...data].sort((a, b) => a - b);
    let skewness = 0, kurtosis = 0;
    const m2 = stats.ss / n;
    const m3 = data.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / n;
    const m4 = data.reduce((acc, v) => acc + Math.pow(v - mean, 4), 0) / n;
    
    skewness = (m3 / Math.pow(m2, 1.5)) * Math.sqrt(n * (n - 1)) / (n - 2);
    kurtosis = ((n + 1) * n * (n - 1) / ((n - 2) * (n - 3))) * (m4 / Math.pow(m2, 2)) - (3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3)));

    // 2. Kolmogorov-Smirnov Test
    let ksStat = 0;
    for (let i = 0; i < n; i++) {
        const x = sorted[i];
        const observedCDF = (i + 1) / n;
        const observedCDFPrev = i / n;
        const theoreticalCDF = normalCDF(x, mean, stdDev);
        ksStat = Math.max(ksStat, Math.abs(theoreticalCDF - observedCDF), Math.abs(theoreticalCDF - observedCDFPrev));
    }

    // KS P-Value Approximation (Smirnov's limiting distribution)
    const sqrtN = Math.sqrt(n);
    const d_sqrtN = (sqrtN + 0.12 + 0.11 / sqrtN) * ksStat;
    let ksP = 0;
    if (d_sqrtN < 0.2) ksP = 1.0;
    else {
        let ksSum = 0;
        for (let j = 1; j <= 10; j++) {
            ksSum += Math.pow(-1, j - 1) * Math.exp(-2 * j * j * d_sqrtN * d_sqrtN);
        }
        ksP = 2 * ksSum;
    }
    ksP = Math.max(0, Math.min(1, ksP));

    // 3. Histogram & Curve Data
    const numBins = Math.ceil(Math.sqrt(n));
    const min = sorted[0];
    const max = sorted[n - 1];
    const binWidth = (max - min) / numBins || 1;
    const bins: HistogramBin[] = [];

    for (let i = 0; i < numBins; i++) {
        const binMin = min + i * binWidth;
        const binMax = binMin + binWidth;
        const count = data.filter(v => v >= binMin && (i === numBins - 1 ? v <= binMax : v < binMax)).length;
        
        // Normal Probability Density at bin center
        const xMid = binMin + binWidth / 2;
        const normalDensity = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((xMid - mean) / stdDev, 2));
        // Scale density to count scale
        const scaledNormal = normalDensity * n * binWidth;

        bins.push({
            binLabel: binMidPoint(binMin, binMax).toFixed(2),
            count,
            normalValue: scaledNormal
        });
    }

    // 4. Q-Q Plot Data
    const qqData: QQPoint[] = sorted.map((obs, i) => {
        const p = (i + 0.5) / n;
        const theoretical = mean + invNormalCDF(p) * stdDev;
        return { theoretical, observed: obs };
    });

    const isNormal = ksP > 0.05 && Math.abs(skewness) < 1;

    let recommendation = isNormal 
        ? "Data follows a normal distribution. Use Parametric tests (Pearson, T-Test, ANOVA)."
        : "Normality violated. Use Non-Parametric alternatives (Spearman, Mann-Whitney, Kruskal-Wallis).";

    return {
        variableName,
        n,
        mean,
        stdDev,
        skewness,
        kurtosis,
        ksStat,
        pValue: ksP,
        isNormal,
        histogramData: bins,
        qqPlotData: qqData,
        recommendation
    };
};

function binMidPoint(min: number, max: number): number {
    return (min + max) / 2;
}

export const calculateMannWhitneyU = (group1: number[], group2: number[], name1: string, name2: string): MannWhitneyResult | null => {
  const n1 = group1.length;
  const n2 = group2.length;
  if (n1 === 0 || n2 === 0) return null;

  const combined = [...group1, ...group2];
  const ranks = getRanks(combined);
  
  const rankSum1 = ranks.slice(0, n1).reduce((a, b) => a + b, 0);
  const rankSum2 = ranks.slice(n1).reduce((a, b) => a + b, 0);
  
  const u1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - rankSum1;
  const u2 = n1 * n2 + (n2 * (n2 + 1)) / 2 - rankSum2;
  const uStat = Math.min(u1, u2);
  
  const meanU = (n1 * n2) / 2;
  
  // Tie correction
  const counts = new Map<number, number>();
  combined.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  let tieAdjustment = 0;
  counts.forEach(count => {
    if (count > 1) tieAdjustment += (Math.pow(count, 3) - count);
  });
  
  const N = n1 + n2;
  const sdU = Math.sqrt((n1 * n2 / (N * (N - 1))) * ((Math.pow(N, 3) - N - tieAdjustment) / 12));
  
  const zStat = (uStat - meanU) / sdU;
  const pValue = calculateZNormalPValue(Math.abs(zStat)) * 2;
  
  const getMedian = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[m-1] + s[m])/2 : s[m];
  };

  return {
    group1: { name: name1, n: n1, rankSum: rankSum1, meanRank: rankSum1 / n1, median: getMedian(group1), boxPlot: getBoxPlotStats(group1) },
    group2: { name: name2, n: n2, rankSum: rankSum2, meanRank: rankSum2 / n2, median: getMedian(group2), boxPlot: getBoxPlotStats(group2) },
    uStat,
    zStat,
    pValue,
    isSignificant: pValue < 0.05,
    totalN: N
  };
};

export const calculateKruskalWallis = (groups: { name: string; data: number[] }[]): KruskalWallisResult | null => {
  const validGroups = groups.filter(g => g.data.length > 0);
  if (validGroups.length < 3) return null;

  const combined: number[] = [];
  validGroups.forEach(g => combined.push(...g.data));
  const ranks = getRanks(combined);
  
  let currentIdx = 0;
  const groupStats = validGroups.map(g => {
    const groupRanks = ranks.slice(currentIdx, currentIdx + g.data.length);
    currentIdx += g.data.length;
    const rankSum = groupRanks.reduce((a, b) => a + b, 0);
    const n = g.data.length;
    
    const sorted = [...g.data].sort((a,b) => a-b);
    const mid = Math.floor(n/2);
    const median = n%2===0 ? (sorted[mid-1]+sorted[mid])/2 : sorted[mid];

    return { name: g.name, n, median, rankSum, meanRank: rankSum / n, boxPlot: getBoxPlotStats(g.data) };
  });

  const N = combined.length;
  const sumPart = groupStats.reduce((acc, g) => acc + (Math.pow(g.rankSum, 2) / g.n), 0);
  let H = (12 / (N * (N + 1))) * sumPart - 3 * (N + 1);
  
  // Tie correction
  const counts = new Map<number, number>();
  combined.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  let tieAdjustment = 0;
  counts.forEach(count => {
    if (count > 1) tieAdjustment += (Math.pow(count, 3) - count);
  });
  const C = 1 - tieAdjustment / (Math.pow(N, 3) - N);
  H = H / C;

  const df = validGroups.length - 1;
  const pValue = calculateChiSquarePValue(H, df);

  return {
    groups: groupStats,
    hStat: H,
    df,
    pValue,
    isSignificant: pValue < 0.05,
    totalN: N
  };
};

export const parseInputData = (input: string, likertConfig?: LikertConfig): number[] => {
  if (!input) return [];
  const rawTokens = input.split(/[\s,]+/).filter(t => t.trim().length > 0);
  return rawTokens.map(token => {
    let val = NaN;
    const cleanToken = token.trim();
    if (likertConfig && likertConfig.enabled) {
      const labelIndex = likertConfig.labels.findIndex(l => l.toLowerCase() === cleanToken.toLowerCase());
      if (labelIndex !== -1) val = labelIndex + 1;
    }
    if (isNaN(val)) val = parseFloat(cleanToken);
    if (!isNaN(val) && likertConfig && likertConfig.enabled && likertConfig.isReversed) {
      val = (likertConfig.points + 1) - val;
    }
    return val;
  }).filter(val => !isNaN(val));
};

export const parseRawCategoricalData = (input: string): string[] => {
  if (!input) return [];
  return input.split(/[\s,]+/).filter(t => t.trim().length > 0);
};

export const parseMatrixData = (input: string): number[][] | null => {
  if (!input) return null;
  const lines = input.split('\n').filter(l => l.trim().length > 0);
  const matrix = lines.map(line => 
    line.split(/[\s,]+/).filter(t => t.trim().length > 0).map(t => parseFloat(t))
  );
  if (matrix.length === 0) return null;
  const colCount = matrix[0].length;
  if (colCount === 0 || matrix.some(row => row.length !== colCount || row.some(v => isNaN(v)))) return null;
  return matrix;
};

export const calculateStatistics = (data: DataPoint[]): StatisticsResult | null => {
  const n = data.length;
  if (n < 2) return null;
  const xVals = data.map(p => p.x);
  const yVals = data.map(p => p.y);
  const statsX = getStableSS(xVals);
  const statsY = getStableSS(yVals);
  const spXY = getStableSP(xVals, yVals);
  let r = 0;
  if (statsX.ss !== 0 && statsY.ss !== 0) r = spXY / Math.sqrt(statsX.ss * statsY.ss);
  r = Math.max(-1, Math.min(1, r));
  const pValue = calculatePValue(r, n);
  const xRanks = getRanks(xVals);
  const yRanks = getRanks(yVals);
  const statsRx = getStableSS(xRanks);
  const statsRy = getStableSS(yRanks);
  const spRxRy = getStableSP(xRanks, yRanks);
  let spearmanRho = 0;
  if (statsRx.ss !== 0 && statsRy.ss !== 0) spearmanRho = spRxRy / Math.sqrt(statsRx.ss * statsRy.ss);
  spearmanRho = Math.max(-1, Math.min(1, spearmanRho));
  return {
    r, rSquared: r * r, n, meanX: statsX.mean, meanY: statsY.mean,
    slope: statsX.ss !== 0 ? spXY / statsX.ss : 0,
    intercept: statsY.mean - (statsX.ss !== 0 ? (spXY / statsX.ss) * statsX.mean : 0),
    standardDeviationX: Math.sqrt(statsX.ss / (n - 1)),
    standardDeviationY: Math.sqrt(statsY.ss / (n - 1)),
    covariance: spXY / (n - 1),
    pValue, pValueOneTailed: pValue / 2,
    spearmanRho, spearmanPValue: calculatePValue(spearmanRho, n), 
    spearmanPValueOneTailed: calculatePValue(spearmanRho, n) / 2,
    sums: { sumX: statsX.sum, sumY: statsY.sum, sumX2: statsX.sumSq, sumY2: statsY.sumSq, sumXY: data.reduce((acc, p) => acc + p.x * p.y, 0), ssX: statsX.ss, ssY: statsY.ss, spXY }
  };
};

export const runHypothesisTest = (stats: StatisticsResult, alpha: number = 0.05): HypothesisResult => {
  const isSignificant = stats.pValue < alpha;
  return {
    nullHypothesis: "The null hypothesis states that there is no relationship between the variables.",
    altHypothesis: "The alternative hypothesis states that a relationship exists between the variables.",
    decision: isSignificant ? "Reject Null Hypothesis" : "Fail to Reject Null Hypothesis",
    conclusion: isSignificant ? "There is sufficient evidence to conclude a relationship exists." : "There is insufficient evidence to conclude a relationship exists.",
    isSignificant, alpha
  };
};

export const calculateOneWayAnova = (groups: GroupInput[]): AnovaResult | null => {
    const validGroups = groups.filter(g => g.parsed && g.parsed.length > 0);
    if (validGroups.length < 2) return null;
    let totalSum = 0, totalN = 0;
    const groupStats = validGroups.map(g => {
        const data = g.parsed!;
        const n = data.length;
        const stats = getStableSS(data);
        totalSum += stats.sum; 
        totalN += n;
        return { name: g.name, n, mean: stats.mean, stdDev: Math.sqrt(stats.ss / (n - 1)), sum: stats.sum, ss: stats.ss };
    });
    const grandMean = totalSum / totalN;
    const ssBetween = groupStats.reduce((acc, g) => acc + g.n * Math.pow(g.mean - grandMean, 2), 0);
    const ssWithin = groupStats.reduce((acc, g) => acc + g.ss, 0);
    const dfBetween = validGroups.length - 1;
    const dfWithin = totalN - validGroups.length;
    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    const fStat = msWithin !== 0 ? msBetween / msWithin : 0;
    const pValue = calculateFPValue(fStat, dfBetween, dfWithin);
    return { groups: groupStats, ssBetween, ssWithin, ssTotal: ssBetween + ssWithin, dfBetween, dfWithin, dfTotal: totalN - 1, msBetween, msWithin, fStat, pValue, isSignificant: pValue < 0.05, grandMean };
};

export const calculateTTest = (group1Data: number[], group2Data: number[], type: TTestType, group1Name: string = "Group 1", group2Name: string = "Group 2"): TTestResult | null => {
    if (group1Data.length < 2 || group2Data.length < 2) return null;
    const stats1 = getStableSS(group1Data);
    const stats2 = getStableSS(group2Data);
    const n1 = group1Data.length;
    const n2 = group2Data.length;
    const var1 = stats1.ss / (n1 - 1);
    const var2 = stats2.ss / (n2 - 1);
    let tStat = 0, df = 0, stdErrorDifference = 0, cohensD = 0, pooledStdDev = 0, diffStats: any = undefined;
    if (type === 'independent') {
        df = n1 + n2 - 2;
        pooledStdDev = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / df);
        stdErrorDifference = pooledStdDev * Math.sqrt(1 / n1 + 1 / n2);
        tStat = (stats1.mean - stats2.mean) / stdErrorDifference;
        cohensD = (stats1.mean - stats2.mean) / pooledStdDev;
    } else {
        const minN = Math.min(n1, n2);
        const diffs = [];
        for (let i = 0; i < minN; i++) diffs.push(group1Data[i] - group2Data[i]);
        const diffSummary = getStableSS(diffs);
        df = minN - 1;
        stdErrorDifference = Math.sqrt(diffSummary.ss / df) / Math.sqrt(minN);
        tStat = diffSummary.mean / stdErrorDifference;
        cohensD = diffSummary.mean / Math.sqrt(diffSummary.ss / df);
        diffStats = { mean: diffSummary.mean, stdDev: Math.sqrt(diffSummary.ss / df), ss: diffSummary.ss, n: minN };
    }
    const pValue = calculateTPValue(tStat, df);
    const tCrit = 1.96 + (2.5 / df);
    const meanDifference = type === 'independent' ? stats1.mean - stats2.mean : diffStats.mean;
    return {
        type,
        group1: { name: group1Name, n: n1, mean: stats1.mean, stdDev: Math.sqrt(var1), stdError: Math.sqrt(var1/n1), ss: stats1.ss, sum: stats1.sum },
        group2: { name: group2Name, n: n2, mean: stats2.mean, stdDev: Math.sqrt(var2), stdError: Math.sqrt(var2/n2), ss: stats2.ss, sum: stats2.sum },
        tStat, df, pValue, pValueOneTailed: pValue / 2, isSignificant: pValue < 0.05, meanDifference, stdErrorDifference, cohensD, ciLower: meanDifference - (tCrit * stdErrorDifference), ciUpper: meanDifference + (tCrit * stdErrorDifference), pooledStdDev: type === 'independent' ? pooledStdDev : undefined, diffStats
    };
};

export const calculateRegression = (data: DataPoint[], labelX: string = "X", labelY: string = "Y"): RegressionResult | null => {
    const n = data.length;
    if (n < 2) return null;
    const xVals = data.map(p => p.x);
    const yVals = data.map(p => p.y);
    const statsX = getStableSS(xVals);
    const statsY = getStableSS(yVals);
    const spXY = getStableSP(xVals, yVals);
    if (statsX.ss === 0) return null;
    const slope = spXY / statsX.ss;
    const r = statsY.ss !== 0 ? spXY / Math.sqrt(statsX.ss * statsY.ss) : 0;
    const rSquared = r * r;
    const ssReg = slope * spXY;
    const ssRes = statsY.ss - ssReg;
    return {
        n, slope, intercept: statsY.mean - slope * statsX.mean, r, rSquared, adjRSquared: 1 - ((1 - rSquared) * (n - 1) / (n - 2)),
        stdErrorEstimate: Math.sqrt(ssRes / (n - 2)), fStat: (ssReg / 1) / (ssRes / (n - 2)), pValue: calculateFPValue((ssReg / 1) / (ssRes / (n - 2)), 1, n - 2), isSignificant: calculateFPValue((ssReg / 1) / (ssRes / (n - 2)), 1, n - 2) < 0.05, labelX, labelY,
        anova: { ssReg, ssRes, ssTotal: statsY.ss, dfReg: 1, dfRes: n - 2, dfTotal: n - 1, msReg: ssReg, msRes: ssRes / (n - 2) },
        sums: { sumX: statsX.sum, sumY: statsY.sum, sumX2: statsX.sumSq, sumY2: statsY.sumSq, sumXY: data.reduce((acc, p) => acc + p.x * p.y, 0), ssX: statsX.ss, ssY: statsY.ss, spXY }
    };
};

export const calculateChiSquare = (dataX: string[], dataY: string[], labelX: string, labelY: string): ChiSquareResult | null => {
    const n = Math.min(dataX.length, dataY.length);
    if (n < 2) return null;
    const rows = Array.from(new Set(dataX)).sort();
    const cols = Array.from(new Set(dataY)).sort();
    const observed = rows.map(() => cols.map(() => 0));
    for (let i = 0; i < n; i++) {
        const rIdx = rows.indexOf(dataX[i]);
        const cIdx = cols.indexOf(dataY[i]);
        if (rIdx !== -1 && cIdx !== -1) observed[rIdx][cIdx]++;
    }
    const rowTotals = observed.map(r => r.reduce((a, b) => a + b, 0));
    const colTotals = cols.map((_, c) => observed.reduce((acc, row) => acc + row[c], 0));
    const grandTotal = rowTotals.reduce((a, b) => a + b, 0);
    if (grandTotal === 0) return null;
    const expected = rows.map((_, r) => cols.map((_, c) => (rowTotals[r] * colTotals[c]) / grandTotal));
    let chiSquare = 0;
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
            if (expected[r][c] > 0) chiSquare += Math.pow(observed[r][c] - expected[r][c], 2) / expected[r][c];
        }
    }
    const df = (rows.length - 1) * (cols.length - 1);
    if (df <= 0) return null;
    const pValue = calculateChiSquarePValue(chiSquare, df);
    return {
        n: grandTotal, chiSquare, df, pValue, isSignificant: pValue < 0.05,
        cramersV: Math.sqrt(chiSquare / (grandTotal * Math.min(rows.length - 1, cols.length - 1))),
        labelX, labelY, rows, cols, observed, expected, rowTotals, colTotals, grandTotal
    };
};

export const calculateDescriptives = (data: number[], rawCategorical: string[], type: 'continuous' | 'categorical'): DescriptiveResult => {
    if (type === 'categorical') {
        const n = rawCategorical.length;
        const freqMap = new Map<string, number>();
        rawCategorical.forEach(val => freqMap.set(String(val), (freqMap.get(String(val)) || 0) + 1));
        const frequencies = Array.from(freqMap.entries()).map(([value, count]) => ({ value, count, percentage: (count / n) * 100, cumulativePercentage: 0 }));
        frequencies.sort((a, b) => b.count - a.count);
        let cum = 0;
        frequencies.forEach(f => { cum += f.percentage; f.cumulativePercentage = cum; });
        return { type, n, frequencies };
    } else {
        const n = data.length;
        if (n === 0) return { type, n: 0 };
        const stats = getStableSS(data);
        const variance = n > 1 ? stats.ss / (n - 1) : 0;
        const sorted = [...data].sort((a, b) => a - b);
        let skewness = 0, kurtosis = 0;
        if (n > 2 && Math.sqrt(variance) > 0) {
            const m3 = data.reduce((acc, val) => acc + Math.pow(val - stats.mean, 3), 0) / n;
            const m2 = stats.ss / n;
            skewness = (m3 / Math.pow(m2, 1.5)) * Math.sqrt(n * (n - 1)) / (n - 2);
            if (n > 3) {
                const m4 = data.reduce((acc, val) => acc + Math.pow(val - stats.mean, 4), 0) / n;
                kurtosis = ((n + 1) * n * (n - 1) / ((n - 2) * (n - 3))) * (m4 / Math.pow(m2, 2)) - (3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3)));
            }
        }
        return {
            type, n, mean: stats.mean, median: n % 2 !== 0 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
            stdDev: Math.sqrt(variance), variance, min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0],
            sumX: stats.sum, sumX2: stats.sumSq, ss: stats.ss, standardError: Math.sqrt(variance / n), skewness, kurtosis
        };
    }
};

export const calculateCronbachAlpha = (matrix: number[][], itemNames?: string[]): ReliabilityResult | null => {
    const nParticipants = matrix.length;
    const nItems = matrix[0].length;
    if (nParticipants < 2 || nItems < 2) return null;
    const itemVariances = [], itemMeans = [], colDataList = [];
    for (let j = 0; j < nItems; j++) {
        const col = matrix.map(row => row[j]);
        const stats = getStableSS(col);
        itemVariances.push(stats.ss / (nParticipants - 1));
        itemMeans.push(stats.mean);
        colDataList.push(col);
    }
    const totalStats = getStableSS(matrix.map(row => row.reduce((a, b) => a + b, 0)));
    const alpha = (nItems / (nItems - 1)) * (1 - (itemVariances.reduce((a, b) => a + b, 0) / (totalStats.ss / (nParticipants - 1))));
    return {
        alpha, nItems, nParticipants, scaleMean: totalStats.mean, scaleStdDev: Math.sqrt(totalStats.ss / (nParticipants - 1)), sumItemVariances: itemVariances.reduce((a, b) => a + b, 0), totalVariance: totalStats.ss / (nParticipants - 1),
        items: itemMeans.map((mean, j) => ({
            id: `item-${j}`, name: itemNames?.[j] || `Item ${j + 1}`, mean, stdDev: Math.sqrt(itemVariances[j]), variance: itemVariances[j],
            correctedItemTotalCorr: (itemVariances[j] !== 0 && totalStats.ss !== 0) ? getStableSP(colDataList[j], matrix.map(row => row.reduce((acc, val, idx) => idx === j ? acc : acc + val, 0))) / Math.sqrt((itemVariances[j] * (nParticipants - 1)) * getStableSS(matrix.map(row => row.reduce((acc, val, idx) => idx === j ? acc : acc + val, 0))).ss) : 0,
            alphaIfDeleted: (nItems - 1 > 1) ? ((nItems - 1) / (nItems - 2)) * (1 - ((itemVariances.reduce((a, b) => a + b, 0) - itemVariances[j]) / (getStableSS(matrix.map(row => row.reduce((acc, val, idx) => idx === j ? acc : acc + val, 0))).ss / (nParticipants - 1)))) : 0
        }))
    };
};
