
import { GoogleGenAI } from "@google/genai";
import { Visitor, DeliveryRecord, KeyLog } from "../types";

export const getAdminInsights = async (visitors: Visitor[], deliveries: DeliveryRecord[], keyLogs: KeyLog[] = []) => {
  // Always initialize GoogleGenAI with a named parameter inside the function to use the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // FIX: Truncate and clean data to prevent massive payloads and structure issues that trigger 500 RPC errors
    const vTrim = visitors.slice(0, 15).map(v => ({ n: v.name, c: v.company, p: v.purpose, t: v.checkInTime }));
    const dTrim = deliveries.slice(0, 15).map(d => ({ c: d.company, f: d.deliveryFor, t: d.timestamp }));
    const kTrim = keyLogs.slice(0, 15).map(k => ({ n: k.keyName, b: k.borrowerName, s: k.status }));

    const summaryPrompt = `
      Analyze the following front desk activity summaries for today:
      
      Visitors Summary (subset): ${JSON.stringify(vTrim)}
      Deliveries Summary (subset): ${JSON.stringify(dTrim)}
      Key Activity Summary (subset): ${JSON.stringify(kTrim)}

      Tasks:
      1. Provide a short, professional executive summary of the day's operations (max 3 sentences).
      2. Provide 3 high-impact bullet points of insights (e.g., peak arrival patterns, security status of unreturned keys, or delivery trends).
      
      Focus on operational efficiency and security.
    `;

    // Use ai.models.generateContent to query GenAI with both the model name and prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: summaryPrompt,
      config: {
        systemInstruction: "You are an intelligent office management assistant. Provide concise, helpful insights based on visitor, delivery, and security asset data. If the data is empty, state that the desk is currently quiet.",
      },
    });

    // Access the .text property directly (it's a getter, not a method)
    return response.text;
  } catch (error: any) {
    console.error("Gemini Insights Error Detail:", error);
    // Return a more descriptive fallback if possible
    if (error?.message?.includes('XHR') || error?.message?.includes('Rpc')) {
      return "Operational intelligence is temporarily unavailable due to a connection handshake issue. Please check your network or API quota.";
    }
    return "The AI consultant is currently offline. Review the logs manually for insights.";
  }
};
