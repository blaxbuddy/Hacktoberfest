'use client';

import { useEffect, useRef, useState } from 'react';

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  lat: number;
  lng: number;
  incident_type: string;
  status: string;
  address?: string;
}

interface EvacuationData {
  evacuationWaypoints?: { lat: number; lng: number; label: string }[];
  dangerZones?: { lat: number; lng: number; radius: number }[];
}

interface Props {
  incidents: Incident[];
  userLocation: { lat: number; lng: number } | null;
  evacuationData: EvacuationData | null;
  onMapClick?: (lat: number, lng: number) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
};

const TYPE_EMOJI: Record<string, string> = {
  fire:           '🔥',
  flood:          '🌊',
  accident:       '🚗',
  medical:        '🏥',
  criminal:       '🚨',
  infrastructure: '⚡',
  other:          '⚠️',
};

export default function IncidentMap({ incidents, userLocation, evacuationData, onMapClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const heatLayerRef = useRef<any>(null);
  const evacuationLayerRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [tooltip, setTooltip] = useState<{ incident: Incident; x: number; y: number } | null>(null);

  /* ── Bootstrap Leaflet + heat plugin ── */
  useEffect(() => {
    if (typeof window === 'undefined' || leafletMapRef.current) return;

    const initMap = async () => {
      // Dynamically load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const L = (await import('leaflet')).default;

      if (!mapRef.current || leafletMapRef.current) return;

      const center: [number, number] = [
        userLocation?.lat || incidents[0]?.lat || 28.6139,
        userLocation?.lng || incidents[0]?.lng || 77.209,
      ];

      const map = L.map(mapRef.current, {
        center,
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
      });

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
      }).addTo(map);

      // Click handler
      map.on('click', (e: any) => {
        onMapClick?.(e.latlng.lat, e.latlng.lng);
      });

      leafletMapRef.current = map;
      setMapReady(true);
    };

    initMap();
  }, []);

  /* ── Update markers and heatmap when incidents change ── */
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const L = (window as any).L || null;
    updateMap();
  }, [incidents, mapReady]);

  /* ── Update evacuation overlay ── */
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current || !evacuationData) return;
    drawEvacuationOverlay();
  }, [evacuationData, mapReady]);

  /* ── User location marker ── */
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current || !userLocation) return;
    addUserMarker();
  }, [userLocation, mapReady]);

  async function updateMap() {
    const L = (await import('leaflet')).default;
    const map = leafletMapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Remove old heat layer
    if (heatLayerRef.current) {
      heatLayerRef.current.remove();
      heatLayerRef.current = null;
    }

    if (incidents.length === 0) return;

    // ── Heatmap using canvas circles ──
    const heatPoints = incidents
      .filter(i => i.lat && i.lng)
      .map(i => {
        const intensity = i.severity === 'critical' ? 1 : i.severity === 'high' ? 0.7 : i.severity === 'medium' ? 0.4 : 0.2;
        return { lat: i.lat, lng: i.lng, intensity, radius: i.severity === 'critical' ? 200 : 100 };
      });

    // Draw heat circles as SVG overlays
    heatPoints.forEach(pt => {
      const color = pt.intensity > 0.8 ? '#ef4444' : pt.intensity > 0.5 ? '#f97316' : pt.intensity > 0.3 ? '#eab308' : '#22c55e';
      const circle = L.circle([pt.lat, pt.lng], {
        radius: pt.radius,
        fillColor: color,
        fillOpacity: 0.18 * pt.intensity,
        color: color,
        weight: 1,
        opacity: 0.3 * pt.intensity,
      }).addTo(map);
      markersRef.current.push(circle);
    });

    // ── Incident markers ──
    incidents.forEach(incident => {
      if (!incident.lat || !incident.lng) return;

      const color = SEVERITY_COLORS[incident.severity] || '#6b7280';
      const emoji = TYPE_EMOJI[incident.incident_type] || '⚠️';

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
          ">
            ${incident.severity === 'critical' ? `
              <div style="
                position: absolute;
                inset: 0;
                border-radius: 50%;
                border: 2px solid ${color};
                opacity: 0.5;
                animation: ping 1.5s ease-in-out infinite;
              "></div>
            ` : ''}
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: ${color}22;
              border: 2px solid ${color};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              box-shadow: 0 0 12px ${color}44;
              cursor: pointer;
              transition: transform 0.2s;
            " onmouseenter="this.style.transform='scale(1.15)'" onmouseleave="this.style.transform='scale(1)'">
              ${emoji}
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([incident.lat, incident.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="
            font-family: Inter, sans-serif;
            min-width: 200px;
            background: #0f1520;
            border-radius: 12px;
            overflow: hidden;
            color: #e2e8f0;
          ">
            <div style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                <span style="font-size:18px">${emoji}</span>
                <strong style="font-size:13px; color:white">${incident.title}</strong>
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:100px; background:${color}22; color:${color}; border:1px solid ${color}44">
                  ${incident.severity.toUpperCase()}
                </span>
                ${incident.status === 'active' ? '<span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:100px; background:#22c55e22; color:#22c55e; border:1px solid #22c55e44">● LIVE</span>' : ''}
              </div>
            </div>
            <div style="padding:12px; font-size:11px; color:rgba(255,255,255,0.5);">
              📍 ${incident.address || `${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)}`}
            </div>
          </div>
        `, {
          maxWidth: 280,
          className: 'dark-popup',
        });

      markersRef.current.push(marker);
    });

    // Fit bounds
    const validIncidents = incidents.filter(i => i.lat && i.lng);
    if (validIncidents.length > 0) {
      const bounds = L.latLngBounds(validIncidents.map(i => [i.lat, i.lng]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }

  async function addUserMarker() {
    const L = (await import('leaflet')).default;
    const map = leafletMapRef.current;
    if (!userLocation) return;

    const userIcon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative; width:20px; height:20px;">
          <div style="
            position:absolute; inset:-8px;
            border-radius:50%;
            background:rgba(59,130,246,0.15);
            border:1px solid rgba(59,130,246,0.3);
            animation: ping 2s ease-in-out infinite;
          "></div>
          <div style="
            width:20px; height:20px;
            border-radius:50%;
            background:#3b82f6;
            border:3px solid white;
            box-shadow:0 0 0 2px #3b82f6, 0 2px 8px rgba(0,0,0,0.5);
          "></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<div style="font-family:Inter,sans-serif;font-size:12px;color:#e2e8f0;padding:4px 8px;background:#0f1520">📍 Your Location</div>', { className: 'dark-popup' });
  }

  async function drawEvacuationOverlay() {
    const L = (await import('leaflet')).default;
    const map = leafletMapRef.current;

    // Clear old evacuation layers
    evacuationLayerRef.current.forEach(l => l.remove());
    evacuationLayerRef.current = [];

    if (!evacuationData) return;

    // Danger zone circles
    evacuationData.dangerZones?.forEach((zone) => {
      if (!zone.lat || !zone.lng) return;
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius * 111000, // convert degrees to meters approx
        fillColor: '#ef4444',
        fillOpacity: 0.12,
        color: '#ef4444',
        weight: 2,
        opacity: 0.6,
        dashArray: '6, 4',
      }).addTo(map);
      evacuationLayerRef.current.push(circle);
    });

    // Evacuation route polyline
    const waypoints = evacuationData.evacuationWaypoints;
    if (waypoints && waypoints.length > 0 && userLocation) {
      const routePoints: [number, number][] = [
        [userLocation.lat, userLocation.lng],
        ...waypoints.map(wp => [wp.lat, wp.lng] as [number, number]),
      ];

      const routeLine = L.polyline(routePoints, {
        color: '#22c55e',
        weight: 4,
        opacity: 0.9,
        dashArray: '10, 6',
      }).addTo(map);
      evacuationLayerRef.current.push(routeLine);

      // Waypoint markers
      waypoints.forEach((wp, i) => {
        const wpIcon = L.divIcon({
          className: '',
          html: `
            <div style="
              display:flex; align-items:center; gap:6px;
              background:#0f1520; border:2px solid #22c55e;
              border-radius:20px; padding:3px 10px 3px 6px;
              white-space:nowrap; font-family:Inter,sans-serif;
              box-shadow:0 4px 12px rgba(0,0,0,0.5);
            ">
              <div style="
                width:20px; height:20px; border-radius:50%;
                background:#22c55e; color:white;
                font-size:10px; font-weight:bold;
                display:flex; align-items:center; justify-content:center;
              ">${i + 1}</div>
              <span style="font-size:11px; font-weight:600; color:#22c55e">${wp.label}</span>
            </div>
          `,
          iconSize: [120, 28],
          iconAnchor: [10, 14],
        });
        const m = L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(map);
        evacuationLayerRef.current.push(m);
      });

      // Zoom to evacuation route
      const allPoints: [number, number][] = routePoints;
      map.fitBounds(L.latLngBounds(allPoints), { padding: [60, 60] });
    }
  }

  return (
    <div className="relative">
      {/* Leaflet popup dark styles */}
      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #0f1520 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 12px !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.8) !important;
          padding: 0 !important;
        }
        .dark-popup .leaflet-popup-content { margin: 0 !important; }
        .dark-popup .leaflet-popup-tip { background: #0f1520 !important; }
        .dark-popup .leaflet-popup-close-button { color: rgba(255,255,255,0.4) !important; right: 8px !important; top: 8px !important; }
        .leaflet-container { background: #080c14 !important; }
        @keyframes ping {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      {/* Map container */}
      <div ref={mapRef} style={{ height: '480px', width: '100%' }} />

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 bg-[#080c14] flex items-center justify-center gap-3 text-white/40 text-sm">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          Loading map…
        </div>
      )}

      {/* Legend */}
      {mapReady && (
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 px-3 py-2.5 rounded-xl bg-[#0f1520]/95 border border-white/8 backdrop-blur text-[10px]">
          <div className="font-bold text-white/60 uppercase tracking-wider mb-0.5">Severity</div>
          {[
            { label: 'Critical', color: '#ef4444' },
            { label: 'High',     color: '#f97316' },
            { label: 'Medium',   color: '#eab308' },
            { label: 'Low',      color: '#22c55e' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <span className="text-white/50">{label}</span>
            </div>
          ))}
          {evacuationData && (
            <>
              <div className="border-t border-white/8 my-1" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 rounded" style={{ background: '#22c55e' }} />
                <span className="text-green-400">Evacuation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 rounded border border-red-500 border-dashed" />
                <span className="text-red-400">Danger Zone</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* User location badge */}
      {userLocation && mapReady && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0f1520]/95 border border-blue-500/30 text-[11px] text-blue-400 backdrop-blur">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          You are here
        </div>
      )}
    </div>
  );
}
