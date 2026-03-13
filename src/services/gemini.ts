import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Opportunity {
  id: string;
  company: string;
  role: string;
  eligibility: string;
  deadline: string;
  deadlineDate?: string; // ISO string for countdown
  link: string;
  sourceType: 'screenshot' | 'text' | 'manual' | 'chat';
  rawContent?: string;
  createdAt: number;
  safetyScore: number; // 0-100
  safetyReasoning: string;
  verificationStatus?: 'unverified' | 'verified' | 'suspicious' | 'fraud';
  verificationReport?: string;
  verifiedAt?: number;
}

export async function analyzeOpportunityImage(base64Image: string): Promise<Partial<Opportunity>> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this screenshot of a job/internship opportunity.
    Extract key details clearly and assess legitimacy.
    
    JSON Schema:
    - company: string (Official company name)
    - role: string (Job title)
    - eligibility: string (Brief requirements)
    - deadline: string (Readable date)
    - deadlineDate: string (ISO 8601 format if possible, else empty)
    - link: string (Application URL)
    - safetyScore: number (0-100)
    - safetyReasoning: string (Clear, bulleted points for readability)
    
    Return ONLY JSON.
  `;

  const result = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          role: { type: Type.STRING },
          eligibility: { type: Type.STRING },
          deadline: { type: Type.STRING },
          deadlineDate: { type: Type.STRING },
          link: { type: Type.STRING },
          safetyScore: { type: Type.NUMBER },
          safetyReasoning: { type: Type.STRING },
        }
      }
    }
  });

  try {
    return JSON.parse(result.text || "{}");
  } catch (e) {
    return {};
  }
}

export async function parseChatLog(text: string): Promise<Partial<Opportunity>[]> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Extract all unique internship/job opportunities from the following chat log.
    Be efficient and precise. Ignore casual conversation.
    
    For each opportunity, provide:
    - company, role, eligibility, deadline, deadlineDate (ISO), link, safetyScore (0-100), safetyReasoning (concise explanation).
    
    Text:
    ${text}
    
    Return an array of JSON objects.
  `;

  const result = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            company: { type: Type.STRING },
            role: { type: Type.STRING },
            eligibility: { type: Type.STRING },
            deadline: { type: Type.STRING },
            deadlineDate: { type: Type.STRING },
            link: { type: Type.STRING },
            safetyScore: { type: Type.NUMBER },
            safetyReasoning: { type: Type.STRING },
          }
        }
      }
    }
  });

  try {
    return JSON.parse(result.text || "[]");
  } catch (e) {
    return [];
  }
}

export async function chatAboutOpportunities(query: string, opportunities: Opportunity[]): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const context = opportunities.length > 0 
    ? `Current opportunities: ${opportunities.map(o => `${o.company} (${o.role})`).join(', ')}`
    : "No opportunities tracked.";

  const prompt = `
    You are OppTracker AI, a helpful assistant for students.
    ${context}
    
    User Query: ${query}
    
    Answer the user's question based on the tracked opportunities. 
    If they ask for deadlines, summarize them. If they ask "what should I apply to?", give recommendations.
    Be concise and professional.
  `;

  const result = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }]
  });

  return result.text || "I'm sorry, I couldn't process that request.";
}

export async function verifyOpportunity(opp: Partial<Opportunity>): Promise<{ status: 'verified' | 'suspicious' | 'fraud'; report: string; score: number }> {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `
    Perform a deep verification of the following internship/job opportunity.
    Use Google Search to check:
    1. Does the company "${opp.company}" exist and is it legitimate?
    2. Is there an official mention of this "${opp.role}" role on their website or official social media?
    3. Is the link "${opp.link}" an official domain or a known phishing/suspicious domain?
    4. Are there any reports of scams related to this specific posting?
    
    Opportunity Details:
    Company: ${opp.company}
    Role: ${opp.role}
    Link: ${opp.link}
    Eligibility: ${opp.eligibility}
    
    Provide a detailed verification report and a final status.
    Status must be one of: 'verified', 'suspicious', 'fraud'.
    Score must be 0-100.
    
    Return JSON:
    - status: string
    - report: string (detailed findings with sources)
    - score: number
  `;

  const result = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING },
          report: { type: Type.STRING },
          score: { type: Type.NUMBER },
        }
      }
    }
  });

  try {
    const data = JSON.parse(result.text || "{}");
    return {
      status: data.status || 'suspicious',
      report: data.report || 'Verification failed to produce a report.',
      score: data.score || 50
    };
  } catch (e) {
    return { status: 'suspicious', report: 'Error during verification process.', score: 50 };
  }
}

export async function checkSafety(content: string): Promise<{ score: number; reasoning: string }> {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `
    Analyze the following job/internship opportunity content for legitimacy and safety.
    Use Google Search to cross-reference any company names, links, or contact details mentioned.
    
    Identify red flags like:
    - Asking for payment/security deposit.
    - Non-company email domains (e.g., @gmail.com for a big tech role).
    - Poor grammar or urgent/threatening language.
    - Suspicious links or domains that don't match the company.
    - Lack of official presence for the mentioned role.
    
    Content:
    ${content}
    
    Return JSON:
    - score: number (0-100)
    - reasoning: string (detailed explanation with findings from search if applicable)
  `;

  const result = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
        }
      }
    }
  });

  try {
    return JSON.parse(result.text || '{"score": 50, "reasoning": "Analysis failed."}');
  } catch (e) {
    return { score: 50, reasoning: "Could not analyze content." };
  }
}
