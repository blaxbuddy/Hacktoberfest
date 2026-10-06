import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ incidents: data || [] });
  } catch (error: any) {
    console.error("Supabase GET error, falling back to mock data:", error.message);
    // Fallback mock data if the table hasn't been created yet
    const mockIncidents = [
      {
        id: '1',
        title: 'Building Fire - Sector 14',
        description: 'Large fire reported on 3rd floor of residential complex.',
        severity: 'critical',
        incident_type: 'fire',
        lat: 28.6280,
        lng: 77.2180,
        address: 'Sector 14, Delhi',
        status: 'active',
        ai_analysis: 'CRITICAL fire incident. Immediate evacuation required.',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Flash Flood - Ring Road',
        description: 'Road flooded due to heavy rainfall.',
        severity: 'high',
        incident_type: 'flood',
        lat: 28.6050,
        lng: 77.2050,
        address: 'Ring Road near ITO',
        status: 'active',
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];
    return NextResponse.json({ incidents: mockIncidents });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const {
      title,
      description,
      severity,
      lat,
      lng,
      image_url,
      ai_analysis,
      incident_type,
      address,
    } = body;

    const { data, error } = await supabase
      .from('incidents')
      .insert([
        {
          title,
          description,
          severity,
          lat,
          lng,
          image_url,
          ai_analysis,
          incident_type,
          address,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ incident: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { id, status } = await req.json();

    const { data, error } = await supabase
      .from('incidents')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ incident: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
