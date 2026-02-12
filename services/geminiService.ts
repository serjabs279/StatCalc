import { GoogleGenAI } from "@google/genai";
import { StatisticsResult, CorrelationType, HybridResult, AnovaResult, DescriptiveResult, ReliabilityResult, TTestResult, RegressionResult, ChiSquareResult, MannWhitneyResult, KruskalWallisResult, NormalityResult } from "../types";

// --- OFFLINE ANALYSIS ENGINES ---

const generateLocalNormalityAnalysis = (res: NormalityResult): string => {
    const sigText = res.isNormal ? "appears normally distributed" : "violates normality assumptions";
    return `### 1. Assumption Verification (Offline Mode)
An analysis of the distribution for **"${res.variableName}"** was conducted using the Kolmogorov-Smirnov (KS) test. 
The data **${sigText}** (KS = ${res.ksStat.toFixed(4)}, p = ${res.pValue < 0.001 ? '< .001' : res.pValue.toFixed(3)}).

### 2. Shape & Distributional Characteristics
- **Skewness:** ${res.skewness.toFixed(3)} (${Math.abs(res.skewness) < 0.5 ? "Symmetric" : "Skewed"})
- **Kurtosis:** ${res.kurtosis.toFixed(3)}
- **Sample Size:** N = ${res.n}

### 3. Methodological Recommendation
${res.recommendation}

*(Note: Deeper methodological critique is available when using a Google Gemini API Key.)*`;
};

const generateLocalMannWhitneyAnalysis = (res: MannWhitneyResult): string => {
    const sigText = res.isSignificant ? "statistically significant" : "not statistically significant";
    return `### 1. Mann-Whitney U Test Analysis (Offline Mode)
A Mann-Whitney U test was performed to compare distributions between **${res.group1.name}** and **${res.group2.name}**. The result is **${sigText}** (U = ${res.uStat.toFixed(2)}, z = ${res.zStat.toFixed(3)}, p = ${res.pValue < 0.001 ? '< .001' : res.pValue.toFixed(3)}).

### 2. Median & Rank Comparison
- **${res.group1.name}**: Median = ${res.group1.median.toFixed(2)}, Mean Rank = ${res.group1.meanRank.toFixed(2)}
- **${res.group2.name}**: Median = ${res.group2.median.toFixed(2)}, Mean Rank = ${res.group2.meanRank.toFixed(2)}

### 3. Conclusion
${res.isSignificant 
    ? `The analysis suggests a significant difference in the distributions of these groups. ${res.group1.meanRank > res.group2.meanRank ? res.group1.name : res.group2.name} typically scored higher.` 
    : "There is insufficient evidence to suggest the distributions of these groups differ."}

*(Note: Interpretation insights are enhanced when using a Google Gemini API Key.)*`;
};

const generateLocalKruskalWallisAnalysis = (res: KruskalWallisResult): string => {
    const sigText = res.isSignificant ? "statistically significant" : "not statistically significant";
    return `### 1. Kruskal-Wallis H Test Analysis (Offline Mode)
A Kruskal-Wallis test was conducted to compare ranks across **${res.groups.length} groups**. The results indicate a **${sigText}** difference (H(${res.df}) = ${res.hStat.toFixed(3)}, p = ${res.pValue < 0.001 ? '< .001' : res.pValue.toFixed(3)}).

### 2. Group Performance Summary
- **Highest Mean Rank**: ${res.groups.reduce((a, b) => a.meanRank > b.meanRank ? a : b).name}
- **Lowest Mean Rank**: ${res.groups.reduce((a, b) => a.meanRank < b.meanRank ? a : b).name}

### 3. Conclusion
${res.isSignificant 
    ? "Since p < 0.05, we conclude that the distributions of the groups are not identical. Post-hoc comparisons may identify specific group differences." 
    : "The evidence suggests the distributions of the various groups are statistically similar."}

*(Note: Interpretation insights are enhanced when using a Google Gemini API Key.)*`;
};

const generateLocalChiSquareAnalysis = (res: ChiSquareResult): string => {
    const sigText = res.isSignificant ? "statistically significant" : "not statistically significant";
    let strength = "negligible";
    const v = res.cramersV;
    if (v >= 0.1) strength = "weak";
    if (v >= 0.3) strength = "moderate";
    if (v >= 0.5) strength = "strong";

    return `### 1. Chi-Square Test Analysis (Offline Mode)
A Pearson Chi-Square test was performed to examine the relationship between **${res.labelX}** and **${res.labelY}**. The association is **${sigText}** (χ²(${res.df}, N=${res.n}) = ${res.chiSquare.toFixed(3)}, p = ${res.pValue < 0.001 ? '< .001' : res.pValue.toFixed(3)}).

### 2. Association Strength
Cramer's V was calculated as **${res.cramersV.toFixed(3)}**, indicating a **${strength}** association between the categories.

### 3. Conclusion
${res.isSignificant 
    ? "Based on the evidence, we conclude that these categorical variables are related." 
    : "Based on the evidence, we fail to find a significant relationship between these categories."}

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper insights.)*`;
};

const generateLocalRegressionAnalysis = (reg: RegressionResult): string => {
    const sigText = reg.isSignificant ? "statistically significant" : "not statistically significant";
    return `### 1. Regression Model Analysis (Offline Mode)
A simple linear regression was conducted to predict **${reg.labelY}** based on **${reg.labelX}**. The regression model is **${sigText}** (F(${reg.anova.dfReg}, ${reg.anova.dfRes}) = ${reg.fStat.toFixed(3)}, p = ${reg.pValue < 0.001 ? '< .001' : reg.pValue.toFixed(3)}).

### 2. Equation & Predictive Power
- **Equation:** Y = ${reg.intercept.toFixed(3)} + (${reg.slope.toFixed(3)}) * X
- **R-Squared:** ${reg.rSquared.toFixed(4)}
- **Standard Error:** ${reg.stdErrorEstimate.toFixed(4)}

### 3. Conclusion
Approximately **${(reg.rSquared * 100).toFixed(1)}%** of the variance in ${reg.labelY} can be explained by the model. 
${reg.isSignificant ? "This model provides a reliable basis for prediction." : "The model is not a significant predictor of the outcome."}

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper insights.)*`;
};

const generateLocalTTestAnalysis = (ttest: TTestResult): string => {
    const sigText = ttest.isSignificant ? "statistically significant" : "not statistically significant";
    const group1 = ttest.group1;
    const group2 = ttest.group2;
    
    let effectSize = "negligible";
    const d = Math.abs(ttest.cohensD);
    if (d >= 0.2) effectSize = "small";
    if (d >= 0.5) effectSize = "medium";
    if (d >= 0.8) effectSize = "large";

    return `### 1. T-Test Result Analysis (Offline Mode)
An ${ttest.type} t-test was conducted to compare **${group1.name}** and **${group2.name}**. The results indicate a **${sigText}** difference between the two groups (t(${ttest.df}) = ${ttest.tStat.toFixed(3)}, p = ${ttest.pValue < 0.001 ? '< .001' : ttest.pValue.toFixed(3)}).

### 2. Descriptive Comparison
- **${group1.name}:** M = ${group1.mean.toFixed(2)}, SD = ${group1.stdDev.toFixed(2)}
- **${group2.name}:** M = ${group2.mean.toFixed(2)}, SD = ${group2.stdDev.toFixed(2)}
- **Mean Difference:** ${ttest.meanDifference.toFixed(3)}

### 3. Effect Size & Conclusion
The calculated Cohen's d is **${ttest.cohensD.toFixed(3)}**, which represents a **${effectSize}** effect size.
${ttest.isSignificant 
    ? "Based on the p-value < 0.05, we conclude there is a real difference between these conditions." 
    : "Based on the p-value > 0.05, we fail to find enough evidence to conclude the groups differ."}

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper insights.)*`;
};

const generateLocalCorrelationAnalysis = (
    stats: StatisticsResult, 
    labelX: string, 
    labelY: string, 
    testType: CorrelationType
): string => {
    const isPearson = testType === 'pearson';
    const val = isPearson ? stats.r : stats.spearmanRho;
    const p = isPearson ? stats.pValue : stats.spearmanPValue;
    const absVal = Math.abs(val);
    
    let strength = "negligible";
    if (absVal >= 0.1) strength = "weak";
    if (absVal >= 0.3) strength = "moderate";
    if (absVal >= 0.5) strength = "strong";
    if (absVal >= 0.8) strength = "very strong";

    const direction = val > 0 ? "positive" : "negative";
    const sigText = p < 0.05 ? "statistically significant" : "not statistically significant";
    const decision = p < 0.05 ? "reject" : "fail to reject";
    const r2 = (val * val * 100).toFixed(2);
    
    const symbol = isPearson ? "*r*" : "*ρ*";

    return `### 1. Statistical Result Analysis (Offline Mode)
The analysis reveals a **${strength}, ${direction}** correlation between **${labelX}** and **${labelY}** (${symbol} = ${val.toFixed(3)}). This relationship is **${sigText}** (p = ${p < 0.001 ? '< .001' : p.toFixed(3)}).

### 2. Hypothesis Verification
Based on the significance level (α = 0.05), we **${decision}** the null hypothesis. 
${p < 0.05 ? "There is sufficient evidence to conclude a relationship exists." : "There is insufficient evidence to conclude a relationship exists."}

### 3. Interpretation
The coefficient of determination indicates that **${labelX}** explains approximately **${r2}%** of the variance in **${labelY}**.

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper insights.)*`;
};

const generateLocalAnovaAnalysis = (anova: AnovaResult, groups: string[]): string => {
    const sig = anova.isSignificant ? "statistically significant" : "not statistically significant";
    let maxGrp = anova.groups[0];
    let minGrp = anova.groups[0];
    anova.groups.forEach(g => {
        if (g.mean > maxGrp.mean) maxGrp = g;
        if (g.mean < minGrp.mean) minGrp = g;
    });

    return `### 1. ANOVA Result Interpretation (Offline Mode)
A one-way ANOVA was conducted to compare the means of **${groups.length} groups**. The results indicate that there is a **${sig}** difference between the groups (F(${anova.dfBetween}, ${anova.dfWithin}) = ${anova.fStat.toFixed(3)}, p = ${anova.pValue < 0.001 ? '< .001' : anova.pValue.toFixed(3)}).

### 2. Descriptive Comparison
- **Highest Mean:** ${maxGrp.name} (M = ${maxGrp.mean.toFixed(2)})
- **Lowest Mean:** ${minGrp.name} (M = ${minGrp.mean.toFixed(2)})

### 3. Conclusion
${anova.isSignificant 
    ? "Since p < 0.05, we conclude that not all group means are equal. Post-hoc testing is recommended to identify specifically which groups differ." 
    : "Since p > 0.05, we fail to reject the null hypothesis. There is no evidence of a significant difference between these groups."}

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper insights.)*`;
};

const generateLocalDescriptiveAnalysis = (data: DescriptiveResult, variableName: string): string => {
    if (data.type === 'categorical') {
        const top = data.frequencies?.[0];
        return `### 1. Distribution Summary (Offline Mode)
The categorical variable **"${variableName}"** (N=${data.n}) was analyzed. 
The most frequent category is **"${top?.value}"**, accounting for **${top?.percentage.toFixed(1)}%** of the sample (n=${top?.count}).

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper insights.)*`;
    }
    return `### 1. Distribution Summary (Offline Mode)
Descriptive statistics for **"${variableName}"** (N=${data.n}):
- **Central Tendency:** Mean = ${data.mean?.toFixed(2)}, Median = ${data.median?.toFixed(2)}
- **Spread:** Standard Deviation = ${data.stdDev?.toFixed(2)}, Range = ${data.min} to ${data.max}

### 2. Normality & Shape
- **Skewness:** ${data.skewness?.toFixed(3)} (${Math.abs(data.skewness || 0) < 0.5 ? "Approximately Symmetric" : "Skewed"})
- **Kurtosis:** ${data.kurtosis?.toFixed(3)}

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper insights.)*`;
};

const generateLocalReliabilityAnalysis = (result: ReliabilityResult, scaleName?: string): string => {
    let interpretation = "Unacceptable";
    if (result.alpha >= 0.9) interpretation = "Excellent";
    else if (result.alpha >= 0.8) interpretation = "Good";
    else if (result.alpha >= 0.7) interpretation = "Acceptable";
    else if (result.alpha >= 0.6) interpretation = "Questionable";
    else if (result.alpha >= 0.5) interpretation = "Poor";
    const problematicItems = result.items.filter(i => i.alphaIfDeleted > result.alpha);
    const contextName = scaleName ? `"${scaleName}"` : `the ${result.nItems}-item scale`;
    return `### 1. Reliability Assessment (Offline Mode)
The internal consistency of ${contextName} was assessed using Cronbach's Alpha. The obtained alpha coefficient is **${result.alpha.toFixed(3)}**, which indicates **${interpretation}** reliability.

### 2. Item Analysis
${problematicItems.length > 0 
    ? `The analysis suggests that the reliability could be improved by removing the following items: **${problematicItems.map(i => i.name).join(', ')}**.` 
    : "No items were identified that would significantly improve the alpha if deleted."}

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper insights.)*`;
};

// --- MAIN SERVICE ---

const getGeminiClient = () => {
  let apiKey = process.env.API_KEY;
  if (!apiKey) return null; 
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

export const analyzeNormality = async (res: NormalityResult): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalNormalityAnalysis(res);

        const prompt = `
            Role: Methodological Advisor / Statistics Expert.
            Task: Analyze normality and distributional assumptions for a research dataset.
            Formatting: Bold italics for symbols (***p***, ***KS***). No LaTeX.

            Data Context:
            - Variable: "${res.variableName}"
            - Sample Size: N = ${res.n}
            - KS Statistic: ${res.ksStat.toFixed(4)}, ***p*** = ${res.pValue.toFixed(4)}
            - Skewness: ${res.skewness.toFixed(3)}
            - Kurtosis: ${res.kurtosis.toFixed(3)}
            - Status: ${res.isNormal ? "Normal" : "Non-Normal"}

            STRICT RESEARCH PROTOCOL:
            1. **DISTRIBUTIONAL ANALYSIS**
               Describe the shape based on skewness and kurtosis.
            2. **FORMAL INFERENTIAL TESTING**
               Interpret the KS test results. Discuss if the violation is severe.
            3. **METHODOLOGICAL IMPLICATION**
               Critically advise on whether to proceed with Parametric (Pearson/ANOVA/T-Test) or Non-Parametric (Spearman/Kruskal/Mann-Whitney) methods.
            4. **REMEDIAL SUGGESTIONS**
               Suggest transformations if applicable.

            RULES:
            - NO PERSONAL PRONOUNS.
            - Focus on methodological rigor.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || generateLocalNormalityAnalysis(res);
    } catch (error) {
        return generateLocalNormalityAnalysis(res);
    }
};

export const analyzeAnova = async (anova: AnovaResult, groups: string[]): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalAnovaAnalysis(anova, groups);

        const prompt = `
            Role: Senior Research Consultant.
            Task: Analyze One-Way ANOVA results.
            Formatting: Bold italics for statistical symbols (***F***, ***p***). No LaTeX.

            Data:
            - Groups: ${groups.join(', ')}
            - Result: ***F***(${anova.dfBetween}, ${anova.dfWithin}) = ${anova.fStat.toFixed(3)}
            - Significance: ***p*** = ${anova.pValue.toFixed(4)}
            - Grand Mean: ${anova.grandMean.toFixed(2)}

            STRICT RESEARCH PROTOCOL:
            Analyze using exactly these 4 systematic stages:
            1. **DESCRIPTIVE CHARACTERIZATION**
               Summarize group means and standard deviations.
            2. **INFERENTIAL ASSESSMENT**
               Interpret significance and the F-statistic.
            3. **CONTEXTUAL SYNTHESIS**
               Explain what these group differences mean in practical terms.
            4. **EVALUATIVE CRITIQUE**
               Assess the strength of the findings.

            STRICT RULES:
            - NO PERSONAL PRONOUNS.
            - LABELING: Refer to parties as "the researcher(s)".
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || generateLocalAnovaAnalysis(anova, groups);
    } catch (error) {
        return generateLocalAnovaAnalysis(anova, groups);
    }
};

export const analyzeMannWhitneyU = async (res: MannWhitneyResult): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalMannWhitneyAnalysis(res);

        const prompt = `
            Role: Senior Research Consultant.
            Task: Analyze Mann-Whitney U test results. This is a non-parametric test comparing the distributions of two independent groups based on ranks.
            Formatting: Bold italics for statistical symbols (***U***, ***z***, ***p***). No LaTeX.

            Data:
            - Comparison: ${res.group1.name} vs ${res.group2.name}
            - Result: ***U*** = ${res.uStat.toFixed(2)}, ***z*** = ${res.zStat.toFixed(3)}
            - Significance: ***p*** = ${res.pValue.toFixed(4)}
            - Group 1 (n=${res.group1.n}): Median=${res.group1.median.toFixed(2)}, Mean Rank=${res.group1.meanRank.toFixed(2)}
            - Group 2 (n=${res.group2.n}): Median=${res.group2.median.toFixed(2)}, Mean Rank=${res.group2.meanRank.toFixed(2)}

            STRICT RESEARCH PROTOCOL:
            Analyze data using exactly these 4 systematic stages:
            1. **DESCRIPTIVE CHARACTERIZATION**
               Summarize the medians and mean ranks.
            2. **INFERENTIAL ASSESSMENT**
               Interpret significance.
            3. **CONTEXTUAL SYNTHESIS**
               Explain practical terms.
            4. **EVALUATIVE CRITIQUE**
               Assess robustness.

            STRICT RULES:
            - NO PERSONAL PRONOUNS.
            - LABELING: Refer to parties as "the researcher(s)".
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || generateLocalMannWhitneyAnalysis(res);
    } catch (error) {
        return generateLocalMannWhitneyAnalysis(res);
    }
};

export const analyzeKruskalWallis = async (res: KruskalWallisResult): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalKruskalWallisAnalysis(res);

        const groupSummary = res.groups.map(g => `${g.name} (n=${g.n}, Median=${g.median.toFixed(2)}, Mean Rank=${g.meanRank.toFixed(2)})`).join(', ');

        const prompt = `
            Role: Senior Research Consultant.
            Task: Analyze Kruskal-Wallis H test results. Non-parametric alternative to ANOVA.
            Formatting: Bold italics for statistical symbols (***H***, ***p***). No LaTeX.

            Data:
            - Groups: ${groupSummary}
            - Result: ***H***(${res.df}) = ${res.hStat.toFixed(3)}
            - Significance: ***p*** = ${res.pValue.toFixed(4)}

            STRICT RESEARCH PROTOCOL:
            1. **DESCRIPTIVE CHARACTERIZATION**
            2. **INFERENTIAL ASSESSMENT**
            3. **CONTEXTUAL SYNTHESIS**
            4. **EVALUATIVE CRITIQUE**

            STRICT RULES:
            - NO PERSONAL PRONOUNS.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || generateLocalKruskalWallisAnalysis(res);
    } catch (error) {
        return generateLocalKruskalWallisAnalysis(res);
    }
};

export const analyzeChiSquare = async (res: ChiSquareResult): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalChiSquareAnalysis(res);
        const prompt = `Role: Senior Research Consultant. Analyze Chi-Square results. Protocol 1-4. χ²(${res.df})=${res.chiSquare.toFixed(3)}, p=${res.pValue.toFixed(4)}, V=${res.cramersV.toFixed(3)}. No personal pronouns.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || generateLocalChiSquareAnalysis(res);
    } catch (error) { return generateLocalChiSquareAnalysis(res); }
};

export const analyzeRegression = async (reg: RegressionResult): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalRegressionAnalysis(reg);
        const prompt = `Role: Senior Research Consultant. Analyze Linear Regression. Protocol 1-4. Y=${reg.intercept.toFixed(2)}+${reg.slope.toFixed(2)}X, r²=${reg.rSquared.toFixed(3)}, p=${reg.pValue.toFixed(4)}. No personal pronouns.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || generateLocalRegressionAnalysis(reg);
    } catch (error) { return generateLocalRegressionAnalysis(reg); }
};

export const analyzeTTest = async (ttest: TTestResult): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalTTestAnalysis(ttest);
        const prompt = `Role: Senior Research Consultant. Analyze ${ttest.type} T-Test. Protocol 1-4. t(${ttest.df})=${ttest.tStat.toFixed(2)}, p=${ttest.pValue.toFixed(4)}, d=${ttest.cohensD.toFixed(2)}. No personal pronouns.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || generateLocalTTestAnalysis(ttest);
    } catch (error) { return generateLocalTTestAnalysis(ttest); }
};

export const analyzeCorrelation = async (stats: StatisticsResult, labelX: string, labelY: string, testType: CorrelationType): Promise<string> => {
  try {
    const ai = getGeminiClient();
    if (!ai) return generateLocalCorrelationAnalysis(stats, labelX, labelY, testType);
    const prompt = `Role: Senior Research Consultant. Analyze Correlation (${testType}). Protocol 1-4. r=${stats.r.toFixed(3)}, p=${stats.pValue.toFixed(4)}. No personal pronouns.`;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || generateLocalCorrelationAnalysis(stats, labelX, labelY, testType);
  } catch (error) { return generateLocalCorrelationAnalysis(stats, labelX, labelY, testType); }
};

export const analyzeDescriptives = async (data: DescriptiveResult, variableName: string): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalDescriptiveAnalysis(data, variableName);
        const prompt = `Role: Data Analyst. Descriptive Summary. Protocol 1-4. Context: ${variableName}, N=${data.n}, Mean=${data.mean?.toFixed(2)}. No personal pronouns.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || generateLocalDescriptiveAnalysis(data, variableName);
    } catch (error) { return generateLocalDescriptiveAnalysis(data, variableName); }
};

export const analyzeReliability = async (result: ReliabilityResult, scaleName: string): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalReliabilityAnalysis(result, scaleName);
        const prompt = `Role: Psychometrician. Scale: ${scaleName}, Alpha: ${result.alpha.toFixed(3)}. Protocol 1-4. No personal pronouns.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || generateLocalReliabilityAnalysis(result, scaleName);
    } catch (error) { return generateLocalReliabilityAnalysis(result, scaleName); }
};