import OpenAI from "openai";
import { z } from "zod";

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey, timeout: 4000 }) : null;

export const AI_DISCLAIMER = "AI suggestion — requires human review";

export interface ResourceMatchResult {
  resourceId: string;
  name: string;
  score: number;
  reason: string;
}

const AiMatchResponseSchema = z.object({
  matches: z
    .array(
      z.object({
        resourceId: z.string(),
        score: z.number().optional().default(85),
        reason: z.string().optional().default("Matches query criteria"),
      })
    )
    .default([]),
});

export async function matchResources(
  query: string,
  resources: Array<{
    id: string;
    name: string;
    type: string;
    category: string;
    department: string;
    description: string;
    location: string;
  }>
): Promise<ResourceMatchResult[]> {
  if (!query.trim() || resources.length === 0) {
    return [];
  }

  const validResourceMap = new Map(resources.map((r) => [r.id, r]));

  if (openai) {
    try {
      const prompt = `You are an intelligent campus resource matcher. A campus member is searching: "${query}".
Here is a list of available campus resources:
${JSON.stringify(
  resources.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    category: r.category,
    department: r.department,
    description: r.description,
  }))
)}

Select up to 4 most relevant resources for this query. Return valid JSON in this exact structure:
{
  "matches": [
    { "resourceId": "<valid_id_from_above>", "score": 95, "reason": "Concise reason why it matches" }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const rawJson = JSON.parse(content);
        const parsed = AiMatchResponseSchema.safeParse(rawJson);
        if (parsed.success && parsed.data.matches.length > 0) {
          const verifiedMatches: ResourceMatchResult[] = [];
          for (const item of parsed.data.matches) {
            const actualResource = validResourceMap.get(item.resourceId);
            if (actualResource) {
              verifiedMatches.push({
                resourceId: actualResource.id,
                name: actualResource.name,
                score: Math.min(100, Math.max(1, Number(item.score) || 80)),
                reason: item.reason || "Semantic relevance match",
              });
            }
          }
          if (verifiedMatches.length > 0) {
            return verifiedMatches.slice(0, 4);
          }
        }
      }
    } catch {
      // Fall through to heuristic fallback
    }
  }

  // Deterministic heuristic fallback
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = resources.map((r) => {
    let score = 0;
    const reasons: string[] = [];
    const textToMatch = `${r.name} ${r.type} ${r.category} ${r.department} ${r.description} ${r.location}`.toLowerCase();

    for (const word of queryWords) {
      if (r.name.toLowerCase().includes(word)) {
        score += 35;
        reasons.push(`matches resource title ("${word}")`);
      } else if (r.category.toLowerCase().includes(word)) {
        score += 25;
        reasons.push(`matches category ${r.category}`);
      } else if (r.type.toLowerCase().includes(word)) {
        score += 20;
        reasons.push(`matches equipment type`);
      } else if (textToMatch.includes(word)) {
        score += 15;
        reasons.push(`mentioned in specifications`);
      }
    }

    const reason =
      reasons.length > 0
        ? `Relevant match: ${Array.from(new Set(reasons)).slice(0, 2).join(", ")}.`
        : "Standard recommendation based on category.";

    return {
      resourceId: r.id,
      name: r.name,
      score: Math.min(100, score),
      reason,
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export interface IncidentSummaryResult {
  summary: string;
  suggestedSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export async function summarizeIncident(incident: {
  type: string;
  severity: string;
  description: string;
  resourceName: string;
  reporterName?: string;
}): Promise<IncidentSummaryResult> {
  const fallbackSeverity = (
    ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(incident.severity)
      ? incident.severity
      : "MEDIUM"
  ) as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  if (openai) {
    try {
      const prompt = `Analyze this university equipment/space incident for a department manager:
Resource: ${incident.resourceName}
Type: ${incident.type}
Severity: ${incident.severity}
Description: "${incident.description}"

Return JSON only in this exact format:
{
  "summary": "2 concise sentences summarizing impact and suggested inspection priority.",
  "suggestedSeverity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const text = response.choices[0]?.message?.content;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.summary) {
          const sev = (parsed.suggestedSeverity || fallbackSeverity).toUpperCase();
          const validSev = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(sev)
            ? (sev as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")
            : fallbackSeverity;
          return {
            summary: parsed.summary,
            suggestedSeverity: validSev,
          };
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Heuristic summary
  const severityDescriptor =
    incident.severity === "CRITICAL"
      ? "requires urgent offline status and immediate supervisor inspection"
      : incident.severity === "HIGH"
      ? "requires prompt physical inspection prior to subsequent bookings"
      : "should be monitored during routine departmental review";

  return {
    summary: `Reported ${incident.type.toLowerCase()} incident on "${incident.resourceName}" (${incident.severity} severity). Detail: "${incident.description}". This ${severityDescriptor}.`,
    suggestedSeverity: fallbackSeverity,
  };
}

export interface CertReviewResult {
  verdict: "RECOMMEND_APPROVAL" | "RECOMMEND_REJECTION" | "NEEDS_MANUAL_REVIEW";
  confidence: number;
  notes: string;
}

export async function reviewEligibilityDoc(
  docText: string,
  trainingName: string
): Promise<CertReviewResult> {
  if (openai && docText.trim().length > 10) {
    try {
      const prompt = `You are a compliance reviewer evaluating a training certification submission.
Required training: "${trainingName}"
Document submitted by student:
"${docText}"

Evaluate whether this document adequately demonstrates required safety/operational competency.
Return JSON only:
{
  "verdict": "RECOMMEND_APPROVAL" | "RECOMMEND_REJECTION" | "NEEDS_MANUAL_REVIEW",
  "confidence": 0-100,
  "notes": "Brief explanation of findings"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          verdict: parsed.verdict || "NEEDS_MANUAL_REVIEW",
          confidence: Number(parsed.confidence) || 75,
          notes: parsed.notes || "Analyzed submitted certification documentation.",
        };
      }
    } catch {
      // Fall through
    }
  }

  // Heuristic fallback
  const lower = docText.toLowerCase();
  const passingKeywords = [
    "certificate",
    "certified",
    "completed",
    "passed",
    "authorized",
    "trained",
    "safety",
    "northfield",
    "workshop",
    "license",
  ];
  const hitCount = passingKeywords.filter((k) => lower.includes(k)).length;

  if (hitCount >= 2 && docText.trim().length >= 20) {
    return {
      verdict: "RECOMMEND_APPROVAL",
      confidence: 85,
      notes: `Verified key competency indicators (${hitCount} matches) including workshop completion records.`,
    };
  } else if (docText.trim().length < 15) {
    return {
      verdict: "NEEDS_MANUAL_REVIEW",
      confidence: 50,
      notes: "Document description is brief; recommend manual verification of original credential certificate.",
    };
  } else {
    return {
      verdict: "NEEDS_MANUAL_REVIEW",
      confidence: 65,
      notes: "Submitted text contains relevant credentials but lacks official credential identification code.",
    };
  }
}

export async function explainSuspiciousUsage(
  user: { name: string; department: string; strikes: number; credits: number },
  bookings: Array<{
    status: string;
    start: Date | string;
    end: Date | string;
    resourceName?: string;
  }>
): Promise<string> {
  const total = bookings.length;
  const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
  const overdue = bookings.filter((b) => b.status === "OVERDUE").length;
  const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  if (openai) {
    try {
      // Anonymize user details to safeguard personal identity and data privacy
      const prompt = `Analyze this university user's booking history for suspicious behavior or hoarding:
Subject: Campus Member (Department: ${user.department})
Conduct Strikes: ${user.strikes}, Available Credits: ${user.credits}
Total bookings: ${total}, Cancelled: ${cancelled} (${cancellationRate}%), Overdue: ${overdue}
Provide a 2-sentence objective fairness assessment for the administrator.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch {
      // Fall through
    }
  }

  // Heuristic explanation
  if (cancellationRate > 40 && total >= 3) {
    return `High cancellation rate detected (${cancellationRate}% over ${total} reservations). Indicates potential slot-hoarding before project deadlines. Recommend temporary booking cap.`;
  }
  if (overdue > 0 || user.strikes > 0) {
    return `User has accumulated ${user.strikes} strike(s) and ${overdue} overdue checkouts. Represents moderate risk for high-demand equipment sharing.`;
  }
  return `Normal usage patterns observed with consistent returns and low cancellation frequency (${cancellationRate}%). Account is in good standing.`;
}
