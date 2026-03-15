import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { simulationData, conversationHistory, followUpQuestion } = await request.json();

    if (!simulationData) {
      return NextResponse.json(
        { error: 'Simulation data is required' },
        { status: 400 }
      );
    }

    // Prepare data summary for AI (not minute-by-minute, only final stats)
    const dataSummary = {
      overview: {
        currentTime: simulationData.simulationInfo.currentTime,
        currentDay: simulationData.simulationInfo.currentDay,
        totalPatients: simulationData.summary.totalPatients,
        totalDeaths: simulationData.summary.totalDeaths,
        totalTransfers: simulationData.summary.totalTransfers,
        minutesSimulated: simulationData.summary.minutesSimulated,
      },
      globalStats: simulationData.summary.globalStats,
      departmentStates: simulationData.currentSnapshot.departmentStates,
      deathAnalysis: {
        totalDeaths: simulationData.events.totalDeaths,
        deathsByCause: simulationData.events.deathRecords.reduce((acc: any, death: any) => {
          acc[death.causeOfDeath] = (acc[death.causeOfDeath] || 0) + 1;
          return acc;
        }, {}),
        avgMortalityRisk: simulationData.events.deathRecords.length > 0
          ? (simulationData.events.deathRecords.reduce((sum: number, d: any) => sum + (d.mortalityRisk || 0), 0) / simulationData.events.deathRecords.length).toFixed(2)
          : 0,
      },
      patientTypesBreakdown: simulationData.patientJourneys.reduce((acc: any, p: any) => {
        acc[p.patientType] = (acc[p.patientType] || 0) + 1;
        return acc;
      }, {}),
      severityBreakdown: simulationData.patientJourneys.reduce((acc: any, p: any) => {
        acc[p.severity] = (acc[p.severity] || 0) + 1;
        return acc;
      }, {}),
      transferData: simulationData.events.completedTransfers.length > 0 ? {
        totalTransfers: simulationData.events.completedTransfers.length,
        transferReasons: simulationData.events.completedTransfers.reduce((acc: any, t: any) => {
          acc[t.reason] = (acc[t.reason] || 0) + 1;
          return acc;
        }, {}),
      } : null,
      cityMode: simulationData.simulationInfo.isCityMode,
    };

    // Build messages array for conversation
    const messages: any[] = [
      {
        role: 'system',
        content: `You are an expert hospital operations analyst and consultant. You analyze hospital simulation data and provide actionable insights and improvement recommendations. You engage in helpful conversations to help hospital administrators optimize their operations, reduce mortality, and improve patient flow.

Context about the current simulation:
- Day: ${dataSummary.overview.currentDay}
- Current Time: ${dataSummary.overview.currentTime}
- Total Patients: ${dataSummary.overview.totalPatients}
- Total Deaths: ${dataSummary.overview.totalDeaths}
- Mortality Rate: ${dataSummary.overview.totalPatients > 0 ? ((dataSummary.overview.totalDeaths / dataSummary.overview.totalPatients) * 100).toFixed(2) : 0}%
- System Utilization: ${dataSummary.globalStats.overallUtilization.toFixed(2)}%

Key Data:
${JSON.stringify(dataSummary, null, 2)}

Be conversational, specific, and actionable in your responses. When users ask follow-up questions, reference previous context and provide detailed, practical advice.`,
      },
    ];

    // If this is a follow-up question, include conversation history
    if (followUpQuestion && conversationHistory && conversationHistory.length > 0) {
      // Add previous messages (limit to last 10 to avoid token limits)
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach((msg: any) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    } else {
      // Initial analysis prompt
      const initialPrompt = `Analyze this hospital simulation data and provide a comprehensive initial assessment.

**Simulation Overview:**
- Day: ${dataSummary.overview.currentDay}
- Current Time: ${dataSummary.overview.currentTime}
- Total Patients: ${dataSummary.overview.totalPatients}
- Total Deaths: ${dataSummary.overview.totalDeaths}
- Mortality Rate: ${dataSummary.overview.totalPatients > 0 ? ((dataSummary.overview.totalDeaths / dataSummary.overview.totalPatients) * 100).toFixed(2) : 0}%
- Simulation Duration: ${dataSummary.overview.minutesSimulated} minutes

**System Statistics:**
- Total Occupied: ${dataSummary.globalStats.totalOccupied}
- Total Capacity: ${dataSummary.globalStats.totalCapacity}
- System Utilization: ${dataSummary.globalStats.overallUtilization.toFixed(2)}%
- Total Queued: ${dataSummary.globalStats.totalQueued}
- Blocked Departments: ${dataSummary.globalStats.totalBlocked}

Please provide:
1. **Critical Issues** - Most urgent problems
2. **Capacity Analysis** - Over/under-utilized departments
3. **Mortality Insights** - What's causing deaths and how to reduce them
4. **Queue Management** - Recommendations for reducing wait times
5. **Priority Actions** - Top 3-5 specific actions

Be concise and actionable. I'm ready to answer follow-up questions about specific departments, improvements, or strategies.`;

      messages.push({
        role: 'user',
        content: initialPrompt,
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const analysis = completion.choices[0].message.content;

    return NextResponse.json({
      success: true,
      analysis: analysis,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error analyzing simulation:', error);
    return NextResponse.json(
      { error: 'Failed to analyze simulation data', details: error.message },
      { status: 500 }
    );
  }
}
