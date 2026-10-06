import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { incidents, userLat, userLng, incidentType } = await req.json();

    const prompt = `You are an emergency evacuation expert AI (Gemma 4). 
    
User Location: ${userLat}, ${userLng}
Incident Type: ${incidentType}
Active Incidents: ${JSON.stringify(incidents?.slice(0, 5))}

Generate a detailed evacuation plan with:
1. **PRIMARY ROUTE**: Most direct safe path away from danger zones
2. **SECONDARY ROUTE**: Alternative route if primary is blocked
3. **SAFE ZONES**: Nearest assembly points and emergency shelters
4. **DO NOT GO**: Areas to strictly avoid
5. **TIME ESTIMATE**: How quickly to evacuate
6. **What to take**: Critical items to bring
7. **Emergency Contacts**: Who to call

Format as clear, numbered instructions. Be specific about directions (North/South/East/West). This is life-critical information.`;

    const response = await ai.models.generateContent({
      model: 'gemma-3-27b-it',
      contents: [prompt],
    });

    // Parse structured route data for map visualization
    const routeText = response.text || '';
    
    // Generate waypoints based on incident locations (mock spatial logic)
    const dangerZones = incidents?.map((inc: any) => ({
      lat: inc.lat,
      lng: inc.lng,
      radius: inc.severity === 'critical' ? 0.01 : inc.severity === 'high' ? 0.005 : 0.002,
    })) || [];

    return NextResponse.json({ 
      route: routeText,
      dangerZones,
      evacuationWaypoints: generateEvacuationWaypoints(userLat, userLng, dangerZones),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateEvacuationWaypoints(
  userLat: number, 
  userLng: number, 
  dangerZones: { lat: number; lng: number; radius: number }[]
) {
  // Generate safe direction away from danger zones
  if (!userLat || !userLng) return [];
  
  // Simple heuristic: move away from center of mass of danger zones
  if (dangerZones.length === 0) {
    return [
      { lat: userLat + 0.01, lng: userLng + 0.01, label: 'Checkpoint 1' },
      { lat: userLat + 0.02, lng: userLng + 0.015, label: 'Safe Zone' },
    ];
  }

  const centerLat = dangerZones.reduce((s, z) => s + z.lat, 0) / dangerZones.length;
  const centerLng = dangerZones.reduce((s, z) => s + z.lng, 0) / dangerZones.length;
  
  const dirLat = userLat - centerLat;
  const dirLng = userLng - centerLng;
  const mag = Math.sqrt(dirLat * dirLat + dirLng * dirLng) || 1;
  
  return [
    { lat: userLat + (dirLat / mag) * 0.005, lng: userLng + (dirLng / mag) * 0.005, label: 'Move Here' },
    { lat: userLat + (dirLat / mag) * 0.012, lng: userLng + (dirLng / mag) * 0.012, label: 'Assembly Point' },
    { lat: userLat + (dirLat / mag) * 0.020, lng: userLng + (dirLng / mag) * 0.020, label: '🏥 Safe Zone' },
  ];
}
