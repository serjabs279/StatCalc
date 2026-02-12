

import { DataPoint, StatisticsResult, LikertConfig, HypothesisResult, CorrelationType, GroupInput, AnovaResult, DescriptiveResult, FrequencyItem, ReliabilityResult, ItemReliability } from '../types';

// Lanczos approximation for log-gamma function
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

// Regularized Incomplete Beta Function Ix(a, b)
function betainc(x: number, a: number, b: number): number {
  if (x < 0.0 || x > 1.0) return 0.0;
  if (x === 0.0) return 0.0;
  if (x === 1.0) return 1.0;

  // Symmetry for numerical stability
  if (x > (a + 1.0) / (a + b + 2.0)) {
    return 1.0 - betainc(1.0 - x, b, a);
  }

  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1.0 - x) - lbeta) / a;

  // Lentz's method for continued fraction
  const ITMAX = 100;
  const EPS = 3.0e-7;
  const FPMIN = 1.0e-30;

  let f = 1.0;
  let c = 1.0;
  let d = 0.0;

  for (let m = 1; m <= ITMAX; m++) {
    const m2 = 2 * m;
    
    // Even step
    let numer = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1.0 + numer * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + numer / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    f *= c * d;

    // Odd step
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

// Helper to calculate P-Value from r and n (t-distribution based)
function calculatePValue(r: number, n: number): number {
  const df = n - 2;
  if (Math.abs(r) >= 1) return 0;
  const t = r * Math.sqrt(df) / Math.sqrt(1 - r * r);
  const x = df / (df + t * t);
  return betainc(x, df / 2, 0.5);
}

// Helper for F-Distribution P-Value (ANOVA)
function calculateFPValue(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1.0;
  const x = df2 / (df2 + df1 * f);
  // P-value is regularized incomplete beta function I_x(df2/2, df1/2)
  return betainc(x, df2 / 2, df1 / 2);
}

// Helper to rank data with tie handling
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

export const parseInputData = (input: string, likertConfig?: LikertConfig): number[] => {
  if (!input) return [];
  const rawTokens = input.split(/[\s,]+/).filter(t => t.trim().length > 0);

  return rawTokens.map(token => {
    let val = NaN;
    const cleanToken = token.trim();

    if (likertConfig && likertConfig.enabled) {
      const labelIndex = likertConfig.labels.findIndex(
        l => l.toLowerCase() === cleanToken.toLowerCase()
      );
      if (labelIndex !== -1) {
        val = labelIndex + 1;
      }
    }
    if (isNaN(val)) {
      val = parseFloat(cleanToken);
    }
    if (!isNaN(val) && likertConfig && likertConfig.enabled && likertConfig.isReversed) {
      val = (likertConfig.points + 1) - val;
    }
    return val;
  }).filter(val => !isNaN(val));
};

export const parseRawCategoricalData = (input: string): string[] => {
    if (!input) return [];
    // Split by comma or new line (handles CSV style or list style)
    return input.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
}

export const calculateCompositeVector = (arrays: number[][]): number[] => {
  if (arrays.length === 0) return [];
  const length = arrays[0].length;
  const minLen = arrays.reduce((min, arr) => Math.min(min, arr.length), length);
  const composite: number[] = new Array(minLen).fill(0);
  for (let i = 0; i < minLen; i++) {
    let sum = 0;
    for (const arr of arrays) sum += arr[i];
    composite[i] = sum / arrays.length;
  }
  return composite;
};

// --- HELPER STATISTICS FUNCTIONS ---
function calculateVariance(data: number[]): number {
    const n = data.length;
    if (n < 2) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    return data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
}

function calculateMean(data: number[]): number {
    return data.reduce((a, b) => a + b, 0) / data.length;
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n < 2) return 0;
    const meanX = calculateMean(x);
    const meanY = calculateMean(y);
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    if (denX === 0 || denY === 0) return 0;
    return num / Math.sqrt(denX * denY);
}


// --- CORRELATION LOGIC ---
export const calculateStatistics = (data: DataPoint[]): StatisticsResult | null => {
  const n = data.length;
  if (n < 2) return null;

  const xVals = data.map(d => d.x);
  const yVals = data.map(d => d.y);

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of data) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;
  const numerator = sumXY - (sumX * sumY) / n;
  const denX = Math.sqrt(sumX2 - (sumX * sumX) / n);
  const denY = Math.sqrt(sumY2 - (sumY * sumY) / n);

  let r = 0;
  if (denX !== 0 && denY !== 0) r = numerator / (denX * denY);
  const rSquared = r * r;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const varianceX = (sumX2 - (sumX * sumX) / n) / (n - 1);
  const varianceY = (sumY2 - (sumY * sumY) / n) / (n - 1);
  
  const standardDeviationX = Math.sqrt(varianceX);
  const standardDeviationY = Math.sqrt(varianceY);
  const covariance = (sumXY - (sumX * sumY) / n) / (n - 1);
  const pValue = calculatePValue(r, n);

  // Spearman
  const xRanks = getRanks(xVals);
  const yRanks = getRanks(yVals);
  let sumRx = 0, sumRy = 0, sumRxRy = 0, sumRx2 = 0, sumRy2 = 0;
  for (let i = 0; i < n; i++) {
    sumRx += xRanks[i];
    sumRy += yRanks[i];
    sumRxRy += xRanks[i] * yRanks[i];
    sumRx2 += xRanks[i] * xRanks[i];
    sumRy2 += yRanks[i] * yRanks[i];
  }
  const numSpearman = sumRxRy - (sumRx * sumRy) / n;
  const denRx = Math.sqrt(sumRx2 - (sumRx * sumRx) / n);
  const denRy = Math.sqrt(sumRy2 - (sumRy * sumRy) / n);
  let spearmanRho = 0;
  if (denRx !== 0 && denRy !== 0) spearmanRho = numSpearman / (denRx * denRy);
  const spearmanPValue = calculatePValue(spearmanRho, n);

  return {
    r, rSquared, n, meanX, meanY, slope, intercept,
    standardDeviationX, standardDeviationY, covariance,
    pValue, pValueOneTailed: pValue / 2,
    spearmanRho, spearmanPValue, spearmanPValueOneTailed: spearmanPValue / 2
  };
};

export const runHypothesisTest = (pValue: number, type: CorrelationType): HypothesisResult => {
  const alpha = 0.05;
  const symbol = type === 'pearson' ? 'r' : 'ρ';
  const isSignificant = pValue < alpha;
  return {
    alpha,
    nullHypothesis: `H₀: ${symbol} = 0 (No correlation)`,
    altHypothesis: `H₁: ${symbol} ≠ 0 (Significant correlation)`,
    isSignificant,
    decision: isSignificant ? "Reject Null Hypothesis" : "Fail to Reject Null Hypothesis",
    conclusion: isSignificant 
      ? "There is sufficient evidence to conclude a significant statistical relationship exists between the variables."
      : "There is insufficient evidence to conclude a significant relationship exists between the variables."
  };
};

// --- ANOVA LOGIC ---
export const calculateOneWayAnova = (groups: GroupInput[]): AnovaResult | null => {
    // Filter empty groups
    const validGroups = groups.filter(g => g.parsed && g.parsed.length > 0);
    if (validGroups.length < 2) return null;

    let totalSum = 0;
    let totalN = 0;
    let totalSS = 0; // Sum of squares of all values

    const groupStats = validGroups.map(g => {
        const data = g.parsed!;
        const n = data.length;
        const sum = data.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        
        // Variance calculation for group
        const ss = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
        const stdDev = Math.sqrt(ss / (n - 1));

        totalSum += sum;
        totalN += n;
        totalSS += data.reduce((acc, val) => acc + val * val, 0);

        return { name: g.name, n, mean, stdDev, sum };
    });

    const grandMean = totalSum / totalN;

    // SS Between = Sum(n_i * (mean_i - grand_mean)^2)
    const ssBetween = groupStats.reduce((acc, g) => acc + g.n * Math.pow(g.mean - grandMean, 2), 0);

    // SS Total = Sum(x^2) - (Sum(x)^2 / N)
    const ssTotalActual = totalSS - (Math.pow(totalSum, 2) / totalN);
    
    // SS Within = SS Total - SS Between
    const ssWithin = ssTotalActual - ssBetween;

    const dfBetween = validGroups.length - 1;
    const dfWithin = totalN - validGroups.length;
    const dfTotal = totalN - 1;

    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;

    const fStat = msWithin !== 0 ? msBetween / msWithin : 0;
    const pValue = calculateFPValue(fStat, dfBetween, dfWithin);

    return {
        groups: groupStats,
        ssBetween, ssWithin, ssTotal: ssTotalActual,
        dfBetween, dfWithin, dfTotal,
        msBetween, msWithin,
        fStat,
        pValue,
        isSignificant: pValue < 0.05
    };
};

// --- DESCRIPTIVE LOGIC ---
export const calculateDescriptives = (
    data: number[], 
    rawCategorical: string[], 
    type: 'continuous' | 'categorical'
): DescriptiveResult => {
    if (type === 'categorical') {
        const n = rawCategorical.length;
        const frequencyMap = new Map<string, number>();
        
        rawCategorical.forEach(val => {
            const key = String(val); // Normalize to string
            frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
        });

        const frequencies: FrequencyItem[] = [];
        let cumPerc = 0;
        
        // Sort by frequency descending
        const sortedKeys = Array.from(frequencyMap.keys()).sort((a, b) => frequencyMap.get(b)! - frequencyMap.get(a)!);

        sortedKeys.forEach(key => {
            const count = frequencyMap.get(key)!;
            const percentage = (count / n) * 100;
            cumPerc += percentage;
            frequencies.push({
                value: key,
                count,
                percentage,
                cumulativePercentage: cumPerc
            });
        });

        return { type, n, frequencies };
    } 
    else {
        // Continuous Logic
        const n = data.length;
        if (n === 0) return { type, n: 0 };

        const sum = data.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        
        // Median
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(n / 2);
        const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

        // Mode
        const counts = new Map<number, number>();
        let maxFreq = 0;
        data.forEach(v => {
            const c = (counts.get(v) || 0) + 1;
            counts.set(v, c);
            if (c > maxFreq) maxFreq = c;
        });
        const mode = Array.from(counts.entries())
            .filter(([k, v]) => v === maxFreq && maxFreq > 1)
            .map(([k]) => k)
            .sort((a, b) => a - b);

        // Variance & SD
        const ss = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
        const variance = n > 1 ? ss / (n - 1) : 0;
        const stdDev = Math.sqrt(variance);
        const standardError = stdDev / Math.sqrt(n);

        // Min Max Range
        const min = sorted[0];
        const max = sorted[n - 1];
        const range = max - min;

        // Skewness & Kurtosis (Fisher-Pearson)
        let m3 = 0;
        let m4 = 0;
        data.forEach(val => {
            m3 += Math.pow(val - mean, 3);
            m4 += Math.pow(val - mean, 4);
        });
        
        let skewness = 0;
        let kurtosis = 0;
        if (n > 2 && stdDev > 0) {
            skewness = (n * m3) / ((n - 1) * (n - 2) * Math.pow(stdDev, 3));
        }
        if (n > 3 && stdDev > 0) {
             const k1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
             const k2 = m4 / Math.pow(stdDev, 4);
             const k3 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
             kurtosis = (k1 * k2) - k3; 
        }

        return {
            type, n, mean, median, mode, stdDev, variance, min, max, range, skewness, kurtosis, standardError
        };
    }
};

export const calculateDescriptivesFromSummary = (
    summaryData: { category: string; count: number }[]
): DescriptiveResult => {
    let n = 0;
    summaryData.forEach(d => n += d.count);
    if (n === 0) return { type: 'categorical', n: 0, frequencies: [] };

    // Sort by count descending
    const sorted = [...summaryData].sort((a, b) => b.count - a.count);

    let cumPerc = 0;
    const frequencies: FrequencyItem[] = sorted.map(item => {
        const percentage = (item.count / n) * 100;
        cumPerc += percentage;
        return {
            value: item.category,
            count: item.count,
            percentage,
            cumulativePercentage: cumPerc
        };
    });

    return { type: 'categorical', n, frequencies };
};

// --- RELIABILITY LOGIC (Cronbach's Alpha) ---

export const parseMatrixData = (input: string): number[][] | null => {
    if (!input.trim()) return null;
    
    // Split by rows
    const rows = input.trim().split(/\r?\n/);
    const matrix: number[][] = [];
    
    for (const row of rows) {
        if (!row.trim()) continue;
        const tokens = row.trim().split(/[\t,;]+| +/);
        
        const rowVals: number[] = [];
        for (const token of tokens) {
             const cleanToken = token.trim();
             if (!cleanToken) continue;
             
             let val = parseFloat(cleanToken);
             if (isNaN(val)) return null; 
             
             rowVals.push(val);
        }

        if (rowVals.length > 0) {
            matrix.push(rowVals);
        }
    }
    
    if (matrix.length === 0) return null;
    
    // Check if rectangular
    const colCount = matrix[0].length;
    if (matrix.some(r => r.length !== colCount)) return null;
    
    return matrix;
}

export const calculateCronbachAlpha = (matrix: number[][], itemNames?: string[]): ReliabilityResult | null => {
    // Matrix: Rows = Participants, Cols = Items
    const nParticipants = matrix.length;
    const nItems = matrix[0].length;
    
    if (nParticipants < 2 || nItems < 2) return null;

    // 1. Calculate Variance of each item (column)
    const itemVariances: number[] = [];
    const itemMeans: number[] = [];
    
    for (let j = 0; j < nItems; j++) {
        const colData = matrix.map(row => row[j]);
        itemVariances.push(calculateVariance(colData));
        itemMeans.push(calculateMean(colData));
    }

    // 2. Calculate Variance of Total Scores
    const totalScores = matrix.map(row => row.reduce((a, b) => a + b, 0));
    const totalVariance = calculateVariance(totalScores);
    const scaleMean = calculateMean(totalScores);
    const scaleStdDev = Math.sqrt(totalVariance);

    // 3. Cronbach's Alpha Formula
    // alpha = (k / (k-1)) * (1 - (sum(itemVariances) / totalVariance))
    const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);
    
    let alpha = 0;
    if (totalVariance > 0) {
        alpha = (nItems / (nItems - 1)) * (1 - (sumItemVariances / totalVariance));
    }

    // 4. Calculate Item Statistics (Alpha if deleted, etc)
    const items: ItemReliability[] = [];
    
    for (let j = 0; j < nItems; j++) {
        // A. Calculate Corrected Item-Total Correlation
        // Correlate Item j with (Total - Item j)
        const itemScores = matrix.map(row => row[j]);
        const restScores = matrix.map(row => row.reduce((acc, val, idx) => idx === j ? acc : acc + val, 0));
        const itemTotalCorr = calculatePearsonCorrelation(itemScores, restScores);
        
        // B. Calculate Alpha if Deleted
        // Recalculate alpha for the matrix excluding column j
        // Sub-matrix variance method is faster:
        // New Total Var = Var(Total - Item)
        // This is exactly Var(restScores) calculated above? Yes.
        const restVariance = calculateVariance(restScores);
        
        // Sum of variances of remaining items
        const sumRestVariances = sumItemVariances - itemVariances[j];
        
        let alphaIfDeleted = 0;
        const kNew = nItems - 1;
        if (restVariance > 0 && kNew > 0) {
             // Basic formula for alpha
             alphaIfDeleted = (kNew / (kNew - 1)) * (1 - (sumRestVariances / restVariance));
        }

        items.push({
            id: `item-${j}`,
            name: itemNames && itemNames[j] ? itemNames[j] : `Item ${j + 1}`,
            mean: itemMeans[j],
            stdDev: Math.sqrt(itemVariances[j]),
            correctedItemTotalCorr: itemTotalCorr,
            alphaIfDeleted
        });
    }

    return {
        alpha,
        nItems,
        nParticipants,
        items,
        scaleMean,
        scaleStdDev
    };
};
