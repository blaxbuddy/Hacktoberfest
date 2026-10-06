'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  Camera,
  MapPin,
  Wifi,
  WifiOff,
  Shield,
  Flame,
  Droplets,
  Car,
  Zap,
  Activity,
  Navigation,
  X,
  Send,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronRight,
  Bot,
  Upload,
  FileWarning,
} from 'lucide-react';
import IncidentMap from '@/components/incident-map';

/* ───────────────────── types ───────────────────── */
type Severity = 'critical' | 'high' | 'medium' | 'low';
type IncidentType = 'fire' | 'flood' | 'accident' | 'medical' | 'criminal' | 'infrastructure' | 'other';
type Status = 'active' | 'resolved' | 'monitoring';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  lat: number;
  lng: number;
  image_url?: string;
  ai_analysis?: string;
  incident_type: IncidentType;
  address?: string;
  status: Status;
  created_at: string;
}

/* ───────────────────── constants ───────────────────── */
const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; ring: string; label: string }> = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/20', ring: 'ring-red-500', label: 'CRITICAL' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/20', ring: 'ring-orange-500', label: 'HIGH' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/20', ring: 'ring-yellow-500', label: 'MEDIUM' },
  low:      { color: 'text-green-400', bg: 'bg-green-500/20', ring: 'ring-green-500', label: 'LOW' },
};

const INCIDENT_ICONS: Record<IncidentType, React.ElementType> = {
  fire: Flame,
  flood: Droplets,
  accident: Car,
  medical: Activity,
  criminal: Shield,
  infrastructure: Zap,
  other: AlertTriangle,
};

const INCIDENT_TYPES: { value: IncidentType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'fire',           label: 'Fire',           icon: Flame,         color: 'text-red-400' },
  { value: 'flood',          label: 'Flood',          icon: Droplets,      color: 'text-blue-400' },
  { value: 'accident',       label: 'Accident',       icon: Car,           color: 'text-orange-400' },
  { value: 'medical',        label: 'Medical',        icon: Activity,      color: 'text-pink-400' },
  { value: 'criminal',       label: 'Criminal',       icon: Shield,        color: 'text-purple-400' },
  { value: 'infrastructure', label: 'Infrastructure', icon: Zap,           color: 'text-yellow-400' },
  { value: 'other',          label: 'Other',          icon: AlertTriangle, color: 'text-gray-400' },
];

/* ───────────────────── helpers ───────────────────── */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ═══════════════════════════════════════════════════
   DUMMY DATA FOR SHOWCASE
══════════════════════════════════════════════════════ */
const DUMMY_INCIDENTS: Incident[] = [
  {
    id: '1',
    title: 'Major Fire - Tech Park',
    description: 'A large fire has broken out on the 4th floor of Building A. Smoke is spreading rapidly.',
    severity: 'critical',
    incident_type: 'fire',
    lat: 28.6120,
    lng: 77.2295,
    address: 'Connaught Place, New Delhi',
    status: 'active',
    ai_analysis: 'CRITICAL WARNING: Fire signatures detected in multiple windows. Smoke density is high, indicating restricted ventilation. Immediate evacuation of all floors is required.',
    image_url: 'https://images.unsplash.com/photo-1602980068989-cb21ea50a80e?auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Multi-vehicle Collision',
    description: 'Three cars involved in a severe crash on the main highway. Traffic is blocked.',
    severity: 'high',
    incident_type: 'accident',
    lat: 28.6200,
    lng: 77.2100,
    address: 'Ring Road, Delhi',
    status: 'active',
    ai_analysis: 'HIGH SEVERITY: Multi-vehicle pileup detected. Possible structural damage to vehicles. Emergency medical services should be dispatched.',
    created_at: new Date(Date.now() - 900000).toISOString()
  },
  {
    id: '3',
    title: 'Waterlogging - Underpass',
    description: 'Heavy rains have flooded the underpass, stranding several vehicles.',
    severity: 'medium',
    incident_type: 'flood',
    lat: 28.5950,
    lng: 77.2150,
    address: 'South Ex Underpass',
    status: 'active',
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD PAGE
══════════════════════════════════════════════════════ */
export default function DashboardPage() {
  /* ── state ── */
  const [incidents, setIncidents] = useState<Incident[]>(DUMMY_INCIDENTS);
  const [isOnline, setIsOnline] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [showEvacuation, setShowEvacuation] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'analytics'>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [evacuationData, setEvacuationData] = useState<any>(null);
  const [loadingEvacuation, setLoadingEvacuation] = useState(false);
  const [pulseActive, setPulseActive] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /* ── fetch incidents (disabled for dummy showcase) ── */
  const fetchIncidents = useCallback(async () => {
    // Keeping dummy data active
    setIsOnline(true);
  }, []);

  /* ── realtime polling every 15 s ── */
  useEffect(() => {
    fetchIncidents();
    pollRef.current = setInterval(fetchIncidents, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchIncidents]);

  /* ── geolocation ── */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation({ lat: 28.6139, lng: 77.209 }), // fallback
    );
  }, []);

  /* ── pulse animation toggle ── */
  useEffect(() => {
    const t = setInterval(() => setPulseActive(p => !p), 2000);
    return () => clearInterval(t);
  }, []);

  /* ── stats ── */
  const stats = {
    total: incidents.length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    active: incidents.filter(i => i.status === 'active').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
  };

  /* ── evacuation ── */
  const handleEvacuation = async () => {
    setLoadingEvacuation(true);
    setShowEvacuation(true);
    try {
      const res = await fetch('/api/evacuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidents: incidents.filter(i => i.status === 'active'),
          userLat: userLocation?.lat,
          userLng: userLocation?.lng,
          incidentType: incidents[0]?.incident_type || 'other',
        }),
      });
      const data = await res.json();
      setEvacuationData(data);
    } catch (e) {
      setEvacuationData({ route: 'Unable to generate route. Move to higher ground and away from danger zones.', dangerZones: [], evacuationWaypoints: [] });
    } finally {
      setLoadingEvacuation(false);
    }
  };

  const handleNewIncident = (incident: Incident) => {
    setIncidents(prev => [incident, ...prev]);
  };

  /* ─────────────── RENDER ─────────────── */
  return (
    <div className="min-h-screen bg-[#080c14] text-white font-sans selection:bg-red-500/30">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080c14]/80 backdrop-blur-xl">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 ${pulseActive ? 'scale-105' : 'scale-100'} transition-transform duration-1000`}>
                <Shield size={16} className="text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#080c14]" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">SafeNet</div>
              <div className="text-[10px] text-white/40 tracking-wider uppercase">Live Dashboard</div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm font-medium">
             <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${isOnline ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
               {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
               <span>{isOnline ? 'System Online' : 'Offline Mode'}</span>
             </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-screen-xl mx-auto px-4 py-8">

        {/* ── CENTRAL ACTION BUTTONS ── */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-8 py-10 mb-8 relative">
          {/* Subtle background glow behind buttons */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <button 
            onClick={() => setShowReport(true)} 
            className="group relative z-10 flex flex-col items-center justify-center w-full max-w-[320px] py-10 rounded-3xl bg-gradient-to-br from-red-500 to-orange-600 shadow-[0_0_60px_-15px_rgba(239,68,68,0.7)] hover:scale-105 transition-all duration-300 border border-white/20"
          >
            <Camera size={64} className="text-white mb-3 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-white font-black text-2xl tracking-wide uppercase">Report</span>
            <span className="text-white/80 text-sm mt-1 font-medium bg-black/20 px-3 py-1 rounded-full">Snap Photo & AI Assess</span>
          </button>
          
          <button 
            onClick={handleEvacuation} 
            className="group relative z-10 flex flex-col items-center justify-center w-full max-w-[280px] py-10 rounded-3xl border-2 border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20 shadow-[0_0_40px_-15px_rgba(249,115,22,0.4)] hover:scale-105 transition-all duration-300"
          >
            <Navigation size={56} className="text-orange-400 mb-2 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-orange-400 font-bold text-xl tracking-wide uppercase">Evacuate</span>
          </button>
        </div>

        {/* Alert Banner for critical incidents */}
        {stats.critical > 0 && (
          <div className="mb-8 flex items-center gap-3 px-5 py-4 rounded-xl bg-red-500/10 border border-red-500/30 text-base">
            <span className={`w-3 h-3 rounded-full bg-red-400 ${pulseActive ? 'opacity-100' : 'opacity-30'} transition-opacity duration-500`} />
            <span className="text-red-400 font-bold">CRITICAL ALERT:</span>
            <span className="text-white/80">{stats.critical} critical incident{stats.critical > 1 ? 's' : ''} active in your area. Stay vigilant.</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
          {(['map', 'list', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── MAP VIEW ── */}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Map */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl overflow-hidden border border-white/8 shadow-2xl bg-[#0f1520]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-blue-400" />
                    <span className="text-sm font-semibold">Live Incident Heatmap</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <HeatmapLegend />
                    <button onClick={fetchIncidents} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
                <IncidentMap
                  incidents={incidents}
                  userLocation={userLocation}
                  evacuationData={evacuationData}
                  onMapClick={(lat: number, lng: number) => {
                    // Pre-fill location in report form
                    setShowReport(true);
                  }}
                />
              </div>
            </div>

            {/* Sidebar: recent incidents */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white/8 bg-[#0f1520] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Clock size={16} className="text-purple-400" /> Recent Incidents
                  </span>
                  <span className="text-xs text-white/40 font-medium bg-white/5 px-2 py-1 rounded-md">{incidents.filter(i => i.status === 'active').length} active</span>
                </div>
                <div className="overflow-y-auto max-h-[480px] divide-y divide-white/5">
                  {incidents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-white/30 gap-3">
                      <Eye size={28} />
                      <p className="text-sm">No incidents reported yet</p>
                    </div>
                  ) : (
                    incidents.map(incident => (
                      <IncidentCard key={incident.id} incident={incident} />
                    ))
                  )}
                </div>
              </div>

              {/* Gemma AI badge */}
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Bot size={16} className="text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-300">Powered by Gemma 4</div>
                  <div className="text-[11px] text-white/40">AI incident analysis & evacuation</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {activeTab === 'list' && (
          <div className="grid gap-4">
            {incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-white/30 gap-4">
                <FileWarning size={40} />
                <p className="text-lg font-medium">No incidents reported</p>
              </div>
            ) : (
              incidents.map(incident => (
                <IncidentDetailCard key={incident.id} incident={incident} onRefresh={fetchIncidents} />
              ))
            )}
          </div>
        )}

        {/* ── ANALYTICS VIEW ── */}
        {activeTab === 'analytics' && (
          <AnalyticsView incidents={incidents} />
        )}
      </main>

      {/* ── REPORT MODAL ── */}
      {showReport && (
        <ReportModal
          onClose={() => setShowReport(false)}
          onSubmit={handleNewIncident}
          userLocation={userLocation}
        />
      )}

      {/* ── EVACUATION PANEL ── */}
      {showEvacuation && (
        <EvacuationPanel
          data={evacuationData}
          loading={loadingEvacuation}
          onClose={() => setShowEvacuation(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════ */

function StatBadge({ icon: Icon, value, label, color }: { icon: React.ElementType; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className={color} />
      <span className={`text-sm font-bold ${color}`}>{value}</span>
      <span className="text-xs text-white/30">{label}</span>
    </div>
  );
}

function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
      <span>Low</span>
      <div className="flex gap-0.5">
        {['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'].map((c, i) => (
          <div key={i} className={`w-3 h-2 rounded-sm ${c} opacity-70`} />
        ))}
      </div>
      <span>Critical</span>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const cfg = SEVERITY_CONFIG[incident.severity];
  const Icon = INCIDENT_ICONS[incident.incident_type];
  return (
    <div className="px-4 py-3 hover:bg-white/3 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Icon size={13} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white truncate">{incident.title}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} shrink-0`}>{cfg.label}</span>
          </div>
          <p className="text-[11px] text-white/40 mt-0.5 truncate">{incident.address || `${incident.lat?.toFixed(3)}, ${incident.lng?.toFixed(3)}`}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-white/30">{timeAgo(incident.created_at)}</span>
            {incident.status === 'active' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold">LIVE</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentDetailCard({ incident, onRefresh }: { incident: Incident; onRefresh: () => void }) {
  const cfg = SEVERITY_CONFIG[incident.severity];
  const Icon = INCIDENT_ICONS[incident.incident_type];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-2xl border bg-[#0f1520] overflow-hidden transition-all ${incident.severity === 'critical' ? 'border-red-500/30' : 'border-white/8'}`}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 ring-1 ${cfg.ring}/30`}>
            <Icon size={22} className={cfg.color} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-bold text-lg text-white">{incident.title}</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              {incident.status === 'active' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold uppercase tracking-wider">● Live Incident</span>}
            </div>
            <p className="text-sm text-white/60 mt-2">{incident.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
              <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded"><MapPin size={12} /> {incident.address || `${incident.lat?.toFixed(4)}, ${incident.lng?.toFixed(4)}`}</span>
              <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded"><Clock size={12} /> {timeAgo(incident.created_at)}</span>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all">
            <Eye size={20} />
          </button>
        </div>

        {expanded && incident.ai_analysis && (
          <div className="mt-5 p-5 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Bot size={16} className="text-purple-400" />
              <span className="text-sm font-bold text-purple-400">Gemma 4 AI Analysis</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{incident.ai_analysis}</p>
          </div>
        )}

        {expanded && incident.image_url && (
          <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
            <img src={incident.image_url} alt="Incident" className="w-full max-h-96 object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsView({ incidents }: { incidents: Incident[] }) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  const byType: Record<string, number> = {};
  incidents.forEach(i => {
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    byType[i.incident_type] = (byType[i.incident_type] || 0) + 1;
  });
  const maxCount = Math.max(...Object.values(byType), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Severity breakdown */}
      <div className="rounded-2xl border border-white/8 bg-[#0f1520] p-6">
        <h3 className="text-base font-bold mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-blue-400" /> Severity Distribution</h3>
        <div className="space-y-4">
          {(Object.entries(bySeverity) as [Severity, number][]).map(([sev, count]) => {
            const cfg = SEVERITY_CONFIG[sev];
            const pct = incidents.length ? (count / incidents.length) * 100 : 0;
            return (
              <div key={sev} className="flex items-center gap-4">
                <span className={`text-sm font-bold w-20 ${cfg.color}`}>{cfg.label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${cfg.bg.replace('/20', '')} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-semibold text-white/50 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident type breakdown */}
      <div className="rounded-2xl border border-white/8 bg-[#0f1520] p-6">
        <h3 className="text-base font-bold mb-6 flex items-center gap-2"><Activity size={16} className="text-purple-400" /> Incident Types</h3>
        <div className="space-y-4">
          {INCIDENT_TYPES.map(({ value, label, icon: Icon, color }) => {
            const count = byType[value] || 0;
            const pct = (count / maxCount) * 100;
            return (
              <div key={value} className="flex items-center gap-4">
                <Icon size={16} className={`${color} w-5 shrink-0`} />
                <span className="text-sm font-medium text-white/70 w-28 shrink-0">{label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-semibold text-white/50 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats cards */}
      {[
        { label: 'Total Incidents', value: incidents.length, icon: AlertTriangle, color: 'from-blue-600 to-cyan-600' },
        { label: 'Active Now', value: incidents.filter(i => i.status === 'active').length, icon: Activity, color: 'from-orange-600 to-red-600' },
        { label: 'Critical Alerts', value: incidents.filter(i => i.severity === 'critical').length, icon: Flame, color: 'from-red-600 to-pink-600' },
        { label: 'Resolved', value: incidents.filter(i => i.status === 'resolved').length, icon: CheckCircle, color: 'from-green-600 to-teal-600' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-2xl border border-white/8 bg-[#0f1520] p-6 flex items-center gap-5">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
            <Icon size={26} className="text-white" />
          </div>
          <div>
            <div className="text-3xl font-black text-white">{value}</div>
            <div className="text-sm font-medium text-white/50">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   REPORT MODAL
══════════════════════════════════════════════════════ */
function ReportModal({
  onClose,
  onSubmit,
  userLocation,
}: {
  onClose: () => void;
  onSubmit: (incident: Incident) => void;
  userLocation: { lat: number; lng: number } | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Default step is camera now instead of form, to directly open camera!
  const [step, setStep] = useState<'form' | 'camera' | 'analyzing' | 'review'>('camera');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'high' as Severity,
    incident_type: 'other' as IncidentType,
    address: '',
    lat: userLocation?.lat || 28.6139,
    lng: userLocation?.lng || 77.209,
  });

  // Start camera automatically when modal opens
  useEffect(() => {
    if (step === 'camera') {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          setCameraStream(stream);
          setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
        })
        .catch(() => {
          // Fallback if camera is unavailable
          setStep('form');
        });
    }
    return () => { cameraStream?.getTracks().forEach(t => t.stop()); };
  }, [step]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8);
    setImageBase64(base64);
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    analyzeImage(base64);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImageBase64(base64);
      analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64: string) => {
    setStep('analyzing');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mode: 'incident' }),
      });
      const data = await res.json();
      setAiAnalysis(data.result || '');

      // Auto-fill form from AI response
      const text = data.result || '';
      if (text.toLowerCase().includes('critical')) setForm(f => ({ ...f, severity: 'critical' }));
      else if (text.toLowerCase().includes('high')) setForm(f => ({ ...f, severity: 'high' }));
      else if (text.toLowerCase().includes('medium')) setForm(f => ({ ...f, severity: 'medium' }));

      const typeMatch = INCIDENT_TYPES.find(t => text.toLowerCase().includes(t.value));
      if (typeMatch) setForm(f => ({ ...f, incident_type: typeMatch.value }));

    } catch {
      setAiAnalysis('Unable to analyze image. Please fill in details manually.');
    } finally {
      setStep('review');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          image_url: imageBase64,
          ai_analysis: aiAnalysis,
        }),
      });
      const data = await res.json();
      if (data.incident) {
        onSubmit(data.incident);
        onClose();
      } else {
        const mockIncident: Incident = { id: Date.now().toString(), ...form, image_url: imageBase64 || undefined, ai_analysis: aiAnalysis, status: 'active', created_at: new Date().toISOString() };
        onSubmit(mockIncident);
        onClose();
      }
    } catch {
      const mockIncident: Incident = { id: Date.now().toString(), ...form, image_url: imageBase64 || undefined, ai_analysis: aiAnalysis, status: 'active', created_at: new Date().toISOString() };
      onSubmit(mockIncident);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 transition-all">
      <div className="w-full max-w-lg bg-[#0f1520] sm:rounded-2xl border-t sm:border border-white/10 shadow-2xl overflow-hidden h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0 bg-[#080c14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Camera size={20} className="text-red-400" />
            </div>
            <div>
              <div className="font-bold text-base text-white">Report Incident</div>
              <div className="text-[12px] text-white/50">Add context and AI analysis</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Camera view */}
        {step === 'camera' && (
          <div className="relative flex-1 bg-black flex flex-col">
            <div className="flex-1 relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              {/* Camera reticle / overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-50">
                <div className="w-64 h-64 border-2 border-dashed border-white rounded-3xl" />
              </div>
            </div>
            <div className="bg-black py-8 px-6 flex flex-col items-center gap-4 shrink-0 border-t border-white/10">
              <p className="text-white/60 text-sm font-medium">Point at the incident and capture</p>
              <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white border-4 border-red-500 hover:scale-95 transition-transform shadow-[0_0_30px_rgba(239,68,68,0.5)]" />
              <button onClick={() => { cameraStream?.getTracks().forEach(t => t.stop()); setStep('form'); }} className="text-white/50 text-sm hover:text-white mt-2 underline underline-offset-4">Skip Photo / Enter Manually</button>
            </div>
          </div>
        )}

        {/* Analyzing */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center flex-1 bg-[#0f1520] gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Bot size={36} className="text-white animate-bounce" />
              </div>
              <div className="absolute inset-0 rounded-3xl border-4 border-purple-500/50 animate-ping" />
            </div>
            <div className="text-center">
              <div className="font-bold text-xl text-white">Gemma 4 is Analyzing...</div>
              <div className="text-base text-white/50 mt-2">Classifying incident type & severity</div>
            </div>
          </div>
        )}

        {/* Form */}
        {(step === 'form' || step === 'review') && (
          <div className="overflow-y-auto flex-1 p-6 space-y-6">

            {/* Photo preview / upload */}
            <div className="mb-2">
              {imageBase64 ? (
                <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white/10">
                  <img src={imageBase64} alt="Incident preview" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-sm font-medium text-white">Photo Captured</span>
                  </div>
                  <button onClick={() => { setImageBase64(null); setAiAnalysis(''); setStep('camera'); }}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold hover:bg-black transition-all">
                    Retake Photo
                  </button>
                </div>
              ) : (
                <button onClick={() => setStep('camera')} className="w-full py-8 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all flex flex-col items-center gap-3">
                  <Camera size={32} className="text-white/50" />
                  <span className="text-sm font-semibold text-white/70">Click to Open Camera</span>
                </button>
              )}
            </div>

            {/* AI Analysis result */}
            {aiAnalysis && (
              <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/30 p-5 shadow-inner">
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={18} className="text-purple-400" />
                  <span className="text-sm font-bold text-purple-300">Gemma 4 Assessment</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed font-medium">{aiAnalysis}</p>
              </div>
            )}

            {/* User Input fields */}
            <div className="bg-white/3 rounded-2xl p-5 border border-white/5 space-y-5">
              <h3 className="font-bold text-white mb-2 text-lg">Add Context</h3>
              
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Short Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="E.g. Fire in main lobby..."
                  className="w-full bg-[#080c14] border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Extra Details (Optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Any other details to help responders..."
                  rows={2}
                  className="w-full bg-[#080c14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all resize-none"
                />
              </div>

              <div className="pt-2">
                 <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-3">AI-Detected Severity (Tap to override)</label>
                 <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(SEVERITY_CONFIG) as [Severity, typeof SEVERITY_CONFIG[Severity]][]).map(([sev, cfg]) => (
                    <button
                      key={sev}
                      onClick={() => setForm(f => ({ ...f, severity: sev }))}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        form.severity === sev
                          ? `${cfg.bg} ${cfg.color} border-current shadow-lg shadow-${cfg.color}/20`
                          : 'border-white/10 bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {(step === 'form' || step === 'review') && (
          <div className="p-5 border-t border-white/10 bg-[#080c14] shrink-0">
            <button
              onClick={handleSubmit}
              disabled={!form.title || submitting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            >
              {submitting ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
              {submitting ? 'Broadcasting to Network...' : 'Broadcast Incident Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EVACUATION PANEL
══════════════════════════════════════════════════════ */
function EvacuationPanel({
  data,
  loading,
  onClose,
}: {
  data: any;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-[#0f1520] rounded-2xl border border-orange-500/40 shadow-[0_0_50px_rgba(249,115,22,0.2)] overflow-hidden max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-orange-500/30 shrink-0 bg-orange-500/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Navigation size={24} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-lg text-orange-400 leading-tight">Evacuation Routes</div>
              <div className="text-xs font-semibold text-white/60">Gemma 4 Tactical Plan</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white bg-black/20">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-orange-500/20 flex items-center justify-center">
                  <Navigation size={36} className="text-orange-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-3xl border-4 border-orange-500/50 animate-ping" />
              </div>
              <div className="text-center">
                <div className="font-bold text-xl text-white">Plotting Safe Routes...</div>
                <div className="text-base text-white/50 mt-2">Gemma 4 is avoiding danger zones</div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Warning banner */}
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <span className="font-bold text-sm leading-snug">EMERGENCY: Follow these tactical instructions immediately. Move quickly but safely.</span>
              </div>

              {/* Waypoints */}
              {data?.evacuationWaypoints?.length > 0 && (
                <div>
                  <div className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">Route Checkpoints</div>
                  <div className="space-y-3">
                    {data.evacuationWaypoints.map((wp: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-orange-500/30">
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-base font-bold text-white">{wp.label}</div>
                          <div className="text-[11px] text-white/40 font-mono mt-0.5">LAT {wp.lat?.toFixed(4)} | LNG {wp.lng?.toFixed(4)}</div>
                        </div>
                        <Navigation size={18} className="ml-auto text-orange-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI route text */}
              <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-5">
                <div className="flex items-center gap-2 mb-3 border-b border-purple-500/20 pb-3">
                  <Bot size={18} className="text-purple-400" />
                  <span className="text-sm font-bold text-purple-400 uppercase tracking-widest">Tactical Briefing</span>
                </div>
                <div className="text-sm text-white/80 leading-relaxed font-medium whitespace-pre-wrap">{data?.route || 'No route data available.'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
