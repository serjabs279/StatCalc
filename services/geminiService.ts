import { GoogleGenAI } from "@google/genai";
import { StatisticsResult, CorrelationType, HybridResult, AnovaResult, DescriptiveResult } from "../types";

// --- OFFLINE ANALYSIS ENGINES ---
// These functions generate interpretations using standard statistical rules 
// when no API key is present.

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
    
    // Determine Strength
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

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper AI-powered insights.)*`;
};

const generateLocalAnovaAnalysis = (anova: AnovaResult, groups: string[]): string => {
    const sig = anova.isSignificant ? "statistically significant" : "not statistically significant";
    
    // Find highest and lowest
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

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper AI-powered insights.)*`;
};

const generateLocalDescriptiveAnalysis = (data: DescriptiveResult, variableName: string): string => {
    if (data.type === 'categorical') {
        const top = data.frequencies?.[0];
        return `### 1. Distribution Summary (Offline Mode)
The categorical variable **"${variableName}"** (N=${data.n}) was analyzed. 
The most frequent category is **"${top?.value}"**, accounting for **${top?.percentage.toFixed(1)}%** of the sample (n=${top?.count}).

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper AI-powered insights.)*`;
    }

    return `### 1. Distribution Summary (Offline Mode)
Descriptive statistics for **"${variableName}"** (N=${data.n}):
- **Central Tendency:** Mean = ${data.mean?.toFixed(2)}, Median = ${data.median?.toFixed(2)}
- **Spread:** Standard Deviation = ${data.stdDev?.toFixed(2)}, Range = ${data.min} to ${data.max}

### 2. Normality & Shape
- **Skewness:** ${data.skewness?.toFixed(3)} (${Math.abs(data.skewness || 0) < 0.5 ? "Approximately Symmetric" : "Skewed"})
- **Kurtosis:** ${data.kurtosis?.toFixed(3)}

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper AI-powered insights.)*`;
};

const generateLocalHybridAnalysis = (hybrid: HybridResult, labelDependent: string, testType: CorrelationType): string => {
    const isPearson = testType === 'pearson';
    const compStats = hybrid.composite.stats;
    const val = isPearson ? compStats.r : compStats.spearmanRho;
    const p = isPearson ? compStats.pValue : compStats.spearmanPValue;
    
    const sigDims = hybrid.dimensions.filter(d => d.hypothesis.isSignificant).map(d => d.name);

    return `### 1. Macro-Analysis (Composite) (Offline Mode)
The composite construct **"${hybrid.composite.name}"** shows a **${Math.abs(val) > 0.3 ? "significant" : "weak"}** correlation with **${labelDependent}** (${isPearson ? 'r' : 'rho'} = ${val.toFixed(3)}, p = ${p.toFixed(3)}).

### 2. Micro-Analysis (Dimensions)
${sigDims.length > 0 
    ? `The following dimensions significantly contribute to this relationship: **${sigDims.join(', ')}**.` 
    : "None of the individual dimensions showed a statistically significant correlation with the dependent variable."}

*(Note: This is an auto-generated offline analysis. Add a generic Google Gemini API Key for deeper AI-powered insights.)*`;
};


// --- MAIN SERVICE ---

const getGeminiClient = () => {
  let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log("StatSuite: No API Key found in environment variables. Using offline mode.");
    return null; 
  }

  // Sanitize key (remove spaces that might happen during copy-paste)
  apiKey = apiKey.trim();
  
  if (apiKey.length < 10) {
      console.warn("StatSuite: API Key looks invalid (too short). Using offline mode.");
      return null;
  }

  console.log("StatSuite: API Key detected. Initializing Gemini Client.");
  return new GoogleGenAI({ apiKey });
};

export const analyzeCorrelation = async (
  stats: StatisticsResult,
  labelX: string,
  labelY: string,
  testType: CorrelationType
): Promise<string> => {
  try {
    const ai = getGeminiClient();
    if (!ai) return generateLocalCorrelationAnalysis(stats, labelX, labelY, testType);

    const isPearson = testType === 'pearson';
    
    // Formatting constants
    const symbol = isPearson ? "***r***" : "***ρ***";
    const pSymbol = "***p***";
    const alphaSymbol = "***α***";
    const h0 = "***H₀***";
    const h1 = "***H₁***";
    
    const correlationValue = isPearson ? stats.r.toFixed(4) : stats.spearmanRho.toFixed(4);
    const pValue = isPearson ? stats.pValue.toFixed(6) : stats.spearmanPValue.toFixed(6);
    
    const rSquaredSymbol = isPearson ? "***r***²" : "***ρ***²";
    const rSquaredLabel = isPearson ? "Coefficient of Determination" : "Squared Rank Correlation";

    const prompt = `
      Role: Act as a Senior Research Consultant.

      STRICT FORMATTING RULES (CRITICAL):
      1. **NO LaTeX**: Do NOT use LaTeX syntax.
      2. **NO BRACKETS**: Do NOT wrap symbols in brackets.
      3. **USE BOLD ITALICS**: Format statistical symbols as bold italics: ${symbol}, ${pSymbol}, ${alphaSymbol}, ${rSquaredSymbol}.

      Task: Analyze the relationship between "${labelX}" and "${labelY}" (n=${stats.n}).

      IMPORTANT: Start response DIRECTLY with "### 1. Statistical Result Analysis".

      Data Context:
      - Coefficient: ${symbol} = ${correlationValue}
      - Significance (2-tailed): ${pSymbol} = ${pValue}
      - Mean X: ${stats.meanX.toFixed(4)} (SD: ${stats.standardDeviationX.toFixed(4)})
      - Mean Y: ${stats.meanY.toFixed(4)} (SD: ${stats.standardDeviationY.toFixed(4)})

      **Response Structure**:
      ### 1. Statistical Result Analysis
      Interpret strength, direction, significance (${alphaSymbol} = .05), and ${rSquaredLabel}.
      ### 2. Hypothesis Verification
      State ${h0}, ${h1}, and decision based on 2-tailed p-value.
      ### 3. Advanced Analytical Framework
      Descriptive characterization and theoretical implication.

      IMPORTANT: Do this when analyzing
      ###1. DO NOT ADD jargons and do not use figurative language
      ###2. follow the conditions below:
          CONDITIONS:
                                      You must analyze the data using exactly these 4 systematic stages—ensure these are emphasized and clearly distinct:
                      1. DESCRIPTIVE CHARACTERIZATION
                      2. INFERENTIAL ASSESSMENT
                      3. CONTEXTUAL SYNTHESIS
                      4. EVALUATIVE CRITIQUE

                      STRICT RESEARCH PROTOCOL:
                      - NO PERSONAL PRONOUNS: In formal research, there is no "I," "me," "my," "we," "us," or "you."
                      - LABELING: Always refer to the parties involved as "the researcher(s)" or "the respondent(s)."
                      - HUMANIZED TONE: Avoid "perfect" bot-like AI prose. Make it sound like a busy, real-life researcher wrote it. A natural flow is better than "gratified" proper grammar. If there's a slight sentence construction quirk, that's fine—it adds to the human feel.
                      - NO AI CLICHÉS: Do not start with "In conclusion" or "Overall." Just dive into the analysis.

    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || generateLocalCorrelationAnalysis(stats, labelX, labelY, testType);
  } catch (error: any) {
    console.warn("Gemini API Error, falling back to local:", error);
    return generateLocalCorrelationAnalysis(stats, labelX, labelY, testType);
  }
};

export const analyzeHybridStrategy = async (
  hybridData: HybridResult,
  labelDependent: string,
  testType: CorrelationType
): Promise<string> => {
  try {
    const ai = getGeminiClient();
    if (!ai) return generateLocalHybridAnalysis(hybridData, labelDependent, testType);

    const isPearson = testType === 'pearson';
    const symbol = isPearson ? "***r***" : "***ρ***";
    const pSymbol = "***p***";
    
    const { composite, dimensions } = hybridData;
    const dimSummary = dimensions.map(d => {
        const val = isPearson ? d.stats.r.toFixed(3) : d.stats.spearmanRho.toFixed(3);
        const p = isPearson ? d.stats.pValue.toFixed(4) : d.stats.spearmanPValue.toFixed(4);
        return `- **${d.name}**: ${symbol} = ${val}, ${pSymbol} = ${p}`;
    }).join('\n');

    const compositeVal = isPearson ? composite.stats.r.toFixed(4) : composite.stats.spearmanRho.toFixed(4);
    const compositeP = isPearson ? composite.stats.pValue.toFixed(6) : composite.stats.spearmanPValue.toFixed(6);

    const prompt = `
      Role: Senior Research Consultant.
      Task: Dual-layer analysis (Macro & Micro) on Composite Construct "${composite.name}" vs "${labelDependent}".
      Formatting: Bold italics for ${symbol}, ${pSymbol}. No LaTeX.

      Data:
      - Composite: ${symbol} = ${compositeVal}, ${pSymbol} = ${compositeP}
      - Dimensions:
      ${dimSummary}

      Structure:
      ### 1. Level 1: Macro-Analysis (Composite Synthesis)
      Global relationship strength and significance.
      ### 2. Level 2: Micro-Analysis (Dimensional Decomposition)
      Driver identification and divergence check.
      ### 3. Hybrid Synthesis & Conclusion
      Synthesis and final verdict.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || generateLocalHybridAnalysis(hybridData, labelDependent, testType);
  } catch (error: any) {
    console.warn("Gemini API Error, falling back to local:", error);
    return generateLocalHybridAnalysis(hybridData, labelDependent, testType);
  }
};

export const analyzeAnova = async (
    anova: AnovaResult,
    groups: string[]
): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalAnovaAnalysis(anova, groups);

        const fSymbol = "***F***";
        const pSymbol = "***p***";
        const alphaSymbol = "***α***";

        const groupText = anova.groups.map(g => `${g.name} (M=${g.mean.toFixed(2)}, SD=${g.stdDev.toFixed(2)})`).join(', ');

        const prompt = `
            Role: Senior Statistician.
            Task: Interpret One-Way ANOVA results.
            Formatting: Bold italics for ${fSymbol}, ${pSymbol}, ${alphaSymbol}. No LaTeX.

            Data:
            - Groups: ${groupText}
            - F(${anova.dfBetween}, ${anova.dfWithin}) = ${anova.fStat.toFixed(3)}
            - Sig: ${pSymbol} = ${anova.pValue.toFixed(4)}
            - Decision: ${anova.isSignificant ? "Significant" : "Not Significant"} at .05 level.

            Structure:
            ### 1. ANOVA Result Interpretation
            Formal APA statement. Discuss if there is a significant difference between group means.
            ### 2. Descriptive Comparison
            Compare the means of the groups. Which group performed highest/lowest?
            ### 3. Conclusion
            Practical implication of these differences (or lack thereof).
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || generateLocalAnovaAnalysis(anova, groups);
    } catch (error: any) {
        console.warn("Gemini API Error, falling back to local:", error);
        return generateLocalAnovaAnalysis(anova, groups);
    }
};

export const analyzeDescriptives = async (
    data: DescriptiveResult,
    variableName: string
): Promise<string> => {
    try {
        const ai = getGeminiClient();
        if (!ai) return generateLocalDescriptiveAnalysis(data, variableName);

        const mSymbol = "***M***";
        const sdSymbol = "***SD***";
        
        let context = "";
        if (data.type === 'continuous') {
            context = `Continuous Variable "${variableName}": Mean=${data.mean?.toFixed(2)}, Median=${data.median?.toFixed(2)}, SD=${data.stdDev?.toFixed(2)}, Skewness=${data.skewness?.toFixed(3)}, Kurtosis=${data.kurtosis?.toFixed(3)}.`;
        } else {
            const freqStr = data.frequencies?.slice(0, 5).map(f => `${f.value}: ${f.percentage.toFixed(1)}%`).join(', ');
            context = `Categorical Variable "${variableName}": Top Frequencies: ${freqStr}...`;
        }

        const prompt = `
            Role: Data Analyst.
            Task: Provide a descriptive summary.
            Formatting: Bold italics for ${mSymbol}, ${sdSymbol}. No LaTeX.

            Data Context: ${context}

            Structure:
            ### 1. Distribution Summary
            Describe the central tendency and spread (or frequency distribution if categorical).
            ### 2. Normality & Shape (if Continuous) / Dominance (if Categorical)
            Discuss skewness/kurtosis or dominant categories.
            ### 3. Reporting
            Provide a standard academic reporting sentence.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || generateLocalDescriptiveAnalysis(data, variableName);
    } catch (error: any) {
        console.warn("Gemini API Error, falling back to local:", error);
        return generateLocalDescriptiveAnalysis(data, variableName);
    }
};