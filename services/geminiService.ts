
import { GoogleGenAI } from "@google/genai";
import { StatisticsResult, CorrelationType, HybridResult, AnovaResult, DescriptiveResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeCorrelation = async (
  stats: StatisticsResult,
  labelX: string,
  labelY: string,
  testType: CorrelationType
): Promise<string> => {
  try {
    const isPearson = testType === 'pearson';
    
    // Formatting constants
    const symbol = isPearson ? "***r***" : "***ρ***";
    const pSymbol = "***p***";
    const alphaSymbol = "***α***";
    const h0 = "***H₀***";
    const h1 = "***H₁***";
    
    const correlationValue = isPearson ? stats.r.toFixed(4) : stats.spearmanRho.toFixed(4);
    const pValue = isPearson ? stats.pValue.toFixed(6) : stats.spearmanPValue.toFixed(6);
    const pValueOneTailed = isPearson ? stats.pValueOneTailed.toFixed(6) : stats.spearmanPValueOneTailed.toFixed(6);
    
    const rSqValue = isPearson ? stats.rSquared : stats.spearmanRho * stats.spearmanRho;
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
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Unable to generate analysis at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze data with Gemini.");
  }
};

export const analyzeHybridStrategy = async (
  hybridData: HybridResult,
  labelDependent: string,
  testType: CorrelationType
): Promise<string> => {
  try {
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

    return response.text || "Unable to generate hybrid analysis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze hybrid data.");
  }
};

export const analyzeAnova = async (
    anova: AnovaResult,
    groups: string[]
): Promise<string> => {
    try {
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

        return response.text || "Unable to analyze ANOVA.";
    } catch (error) {
        throw new Error("Failed to analyze ANOVA.");
    }
};

export const analyzeDescriptives = async (
    data: DescriptiveResult,
    variableName: string
): Promise<string> => {
    try {
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

        return response.text || "Unable to analyze descriptives.";
    } catch (error) {
        throw new Error("Failed to analyze descriptives.");
    }
};
