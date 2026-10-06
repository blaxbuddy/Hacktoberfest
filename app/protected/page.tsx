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
  Users,
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
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function DashboardPage() {
  /* ── state ── */
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [showEvacuation, setShowEvacuation] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'analytics'>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [evacuationData, setEvacuationData] = useState<any>(null);
  const [loadingEvacuation, setLoadingEvacuation] = useState(false);
  const [pulseActive, setPulseActive] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /* ── fetch incidents ── */
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setIncidents(data.incidents || []);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
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
      () => setUserLocation({ lat: 28.6139, lng: 77.209 }), // fallback: New Delhi
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
      setEvacuationData({ route: 'Unable to generate evacuation route. Move to higher ground and away from danger zones.', dangerZones: [], evacuationWaypoints: [] });
    } finally {
      setLoadingEvacuation(false);
    }
  };

  const handleNewIncident = (incident: Incident) => {
    setIncidents(prev => [incident, ...prev]);
  };

  /* ─────────────── RENDER ─────────────── */
  return (
    <div className="min-h-screen bg-[#080c14] text-white font-sans">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080c14]/80 backdrop-blur-xl">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 ${pulseActive ? 'scale-105' : 'scale-100'} transition-transform duration-1000`}>
                <Shield size={16} className="text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#080c14]" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">SafeNet</div>
              <div className="text-[10px] text-white/40 tracking-wider uppercase">Emergency Response</div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="hidden md:flex items-center gap-6">
            <StatBadge icon={AlertTriangle} value={stats.critical} label="Critical" color="text-red-400" />
            <StatBadge icon={Activity} value={stats.active} label="Active" color="text-orange-400" />
            <StatBadge icon={CheckCircle} value={stats.resolved} label="Resolved" color="text-green-400" />
            <StatBadge icon={TrendingUp} value={stats.total} label="Total" color="text-blue-400" />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Online indicator */}
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${isOnline ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden sm:inline">{isOnline ? 'Live' : 'Offline'}</span>
            </div>

            {/* Evacuation btn */}
            <button
              onClick={handleEvacuation}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-semibold border border-orange-500/30 transition-all"
            >
              <Navigation size={13} />
              <span className="hidden sm:inline">Evacuate</span>
            </button>

            {/* Report btn */}
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all"
            >
              <Camera size={13} />
              <span>Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">

        {/* Alert Banner for critical incidents */}
        {stats.critical > 0 && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm">
            <span className={`w-2 h-2 rounded-full bg-red-400 ${pulseActive ? 'opacity-100' : 'opacity-30'} transition-opacity duration-500`} />
            <span className="text-red-400 font-bold">ALERT:</span>
            <span className="text-white/70">{stats.critical} critical incident{stats.critical > 1 ? 's' : ''} active in your area. Stay vigilant and follow evacuation instructions.</span>
            <button onClick={handleEvacuation} className="ml-auto flex items-center gap-1 text-red-400 hover:text-red-300 font-semibold whitespace-nowrap">
              Get Route <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
          {(['map', 'list', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
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
                    <MapPin size={14} className="text-blue-400" />
                    <span className="text-sm font-semibold">Live Incident Heatmap</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <HeatmapLegend />
                    <button onClick={fetchIncidents} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all">
                      <RefreshCw size={13} />
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
                    <Clock size={14} className="text-purple-400" /> Recent Incidents
                  </span>
                  <span className="text-xs text-white/30">{incidents.filter(i => i.status === 'active').length} active</span>
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
                <button onClick={() => setShowReport(true)} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/30">
                  Report First Incident
                </button>
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
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 ring-1 ${cfg.ring}/30`}>
            <Icon size={18} className={cfg.color} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white">{incident.title}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              {incident.status === 'active' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold">● LIVE</span>}
            </div>
            <p className="text-sm text-white/50 mt-1">{incident.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
              <span className="flex items-center gap-1"><MapPin size={10} /> {incident.address || `${incident.lat?.toFixed(4)}, ${incident.lng?.toFixed(4)}`}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(incident.created_at)}</span>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-white/30 hover:text-white p-1 transition-colors">
            <Eye size={16} />
          </button>
        </div>

        {expanded && incident.ai_analysis && (
          <div className="mt-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Bot size={13} className="text-purple-400" />
              <span className="text-xs font-bold text-purple-400">Gemma 4 AI Analysis</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{incident.ai_analysis}</p>
          </div>
        )}

        {expanded && incident.image_url && (
          <div className="mt-3 rounded-xl overflow-hidden">
            <img src={incident.image_url} alt="Incident" className="w-full max-h-64 object-cover" />
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
      <div className="rounded-2xl border border-white/8 bg-[#0f1520] p-5">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-blue-400" /> Severity Distribution</h3>
        <div className="space-y-3">
          {(Object.entries(bySeverity) as [Severity, number][]).map(([sev, count]) => {
            const cfg = SEVERITY_CONFIG[sev];
            const pct = incidents.length ? (count / incidents.length) * 100 : 0;
            return (
              <div key={sev} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-16 ${cfg.color}`}>{cfg.label}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${cfg.bg.replace('/20', '')} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-white/40 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident type breakdown */}
      <div className="rounded-2xl border border-white/8 bg-[#0f1520] p-5">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Activity size={14} className="text-purple-400" /> Incident Types</h3>
        <div className="space-y-3">
          {INCIDENT_TYPES.map(({ value, label, icon: Icon, color }) => {
            const count = byType[value] || 0;
            const pct = (count / maxCount) * 100;
            return (
              <div key={value} className="flex items-center gap-3">
                <Icon size={13} className={`${color} w-4 shrink-0`} />
                <span className="text-xs text-white/60 w-24 shrink-0">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-white/40 w-4 text-right">{count}</span>
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
        <div key={label} className="rounded-2xl border border-white/8 bg-[#0f1520] p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
            <Icon size={22} className="text-white" />
          </div>
          <div>
            <div className="text-2xl font-extrabold">{value}</div>
            <div className="text-xs text-white/40">{label}</div>
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

  const [step, setStep] = useState<'form' | 'camera' | 'analyzing' | 'review'>('form');
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

  // cleanup camera on unmount
  useEffect(() => () => { cameraStream?.getTracks().forEach(t => t.stop()); }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setStep('camera');
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch {
      fileRef.current?.click();
    }
  };

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
        // If Supabase not configured, still add locally
        const mockIncident: Incident = {
          id: Date.now().toString(),
          ...form,
          image_url: imageBase64 || undefined,
          ai_analysis: aiAnalysis,
          status: 'active',
          created_at: new Date().toISOString(),
        };
        onSubmit(mockIncident);
        onClose();
      }
    } catch {
      // Offline fallback
      const mockIncident: Incident = {
        id: Date.now().toString(),
        ...form,
        image_url: imageBase64 || undefined,
        ai_analysis: aiAnalysis,
        status: 'active',
        created_at: new Date().toISOString(),
      };
      onSubmit(mockIncident);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0f1520] rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <div className="font-bold text-sm">Report Incident</div>
              <div className="text-[11px] text-white/40">Analyzed by Gemma 4 AI</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Camera view */}
        {step === 'camera' && (
          <div className="relative flex-1 bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-x-0 bottom-0 p-6 flex justify-center">
              <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white border-4 border-white/50 hover:scale-95 transition-transform shadow-2xl" />
            </div>
            <button onClick={() => { cameraStream?.getTracks().forEach(t => t.stop()); setStep('form'); }}
              className="absolute top-4 left-4 p-2 rounded-full bg-black/60 text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Analyzing */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <Bot size={28} className="text-purple-400" />
              </div>
              <div className="absolute inset-0 rounded-2xl border-2 border-purple-500/50 animate-ping" />
            </div>
            <div className="text-center">
              <div className="font-bold text-white">Gemma 4 Analyzing...</div>
              <div className="text-sm text-white/40 mt-1">AI is assessing severity and incident type</div>
            </div>
          </div>
        )}

        {/* Form */}
        {(step === 'form' || step === 'review') && (
          <div className="overflow-y-auto flex-1 p-5 space-y-4">

            {/* Photo capture section */}
            <div>
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Photo Evidence</label>
              {imageBase64 ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={imageBase64} alt="Incident" className="w-full max-h-48 object-cover" />
                  <button onClick={() => { setImageBase64(null); setAiAnalysis(''); setStep('form'); }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={startCamera}
                    className="flex flex-col items-center gap-2 py-6 rounded-xl border border-dashed border-white/20 hover:border-red-500/50 hover:bg-red-500/5 transition-all">
                    <Camera size={22} className="text-red-400" />
                    <span className="text-xs font-semibold text-white/60">Take Photo</span>
                  </button>
                  <button onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center gap-2 py-6 rounded-xl border border-dashed border-white/20 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
                    <Upload size={22} className="text-blue-400" />
                    <span className="text-xs font-semibold text-white/60">Upload Image</span>
                  </button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>

            {/* AI Analysis result */}
            {aiAnalysis && (
              <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={13} className="text-purple-400" />
                  <span className="text-xs font-bold text-purple-400">Gemma 4 Analysis</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed max-h-28 overflow-y-auto">{aiAnalysis}</p>
              </div>
            )}

            {/* Incident Type */}
            <div>
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Incident Type</label>
              <div className="grid grid-cols-4 gap-2">
                {INCIDENT_TYPES.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    onClick={() => setForm(f => ({ ...f, incident_type: value }))}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      form.incident_type === value
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/8 bg-white/3 text-white/40 hover:border-white/15'
                    }`}
                  >
                    <Icon size={14} className={form.incident_type === value ? color : ''} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Severity</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(SEVERITY_CONFIG) as [Severity, typeof SEVERITY_CONFIG[Severity]][]).map(([sev, cfg]) => (
                  <button
                    key={sev}
                    onClick={() => setForm(f => ({ ...f, severity: sev }))}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      form.severity === sev
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : 'border-white/8 text-white/30 hover:border-white/15'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Brief incident description..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/25 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Details</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Provide additional context about the incident..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/25 transition-colors resize-none"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Location</label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Street address or landmark..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/25 transition-colors"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={e => setForm(f => ({ ...f, lat: parseFloat(e.target.value) }))}
                  placeholder="Latitude"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/25 transition-colors"
                />
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={e => setForm(f => ({ ...f, lng: parseFloat(e.target.value) }))}
                  placeholder="Longitude"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/25 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {(step === 'form' || step === 'review') && (
          <div className="px-5 py-4 border-t border-white/5 shrink-0">
            <button
              onClick={handleSubmit}
              disabled={!form.title || submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg shadow-red-500/20"
            >
              {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? 'Submitting...' : 'Submit Incident Report'}
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0f1520] rounded-2xl border border-orange-500/30 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-orange-500/20 shrink-0 bg-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Navigation size={16} className="text-orange-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-orange-300">Evacuation Routes</div>
              <div className="text-[11px] text-white/40">AI-generated by Gemma 4</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                  <Navigation size={28} className="text-orange-400" />
                </div>
                <div className="absolute inset-0 rounded-2xl border-2 border-orange-500/50 animate-ping" />
              </div>
              <div className="text-center">
                <div className="font-bold text-white">Calculating Safe Routes...</div>
                <div className="text-sm text-white/40 mt-1">Gemma 4 analyzing danger zones</div>
              </div>
            </div>
          ) : (
            <>
              {/* Warning banner */}
              <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                <AlertTriangle size={13} />
                <span className="font-semibold">EMERGENCY — Follow these instructions immediately</span>
              </div>

              {/* Waypoints */}
              {data?.evacuationWaypoints?.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Route Waypoints</div>
                  <div className="space-y-2">
                    {data.evacuationWaypoints.map((wp: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 border border-white/8">
                        <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400">
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{wp.label}</div>
                          <div className="text-[11px] text-white/30 font-mono">{wp.lat?.toFixed(4)}, {wp.lng?.toFixed(4)}</div>
                        </div>
                        <Navigation size={13} className="ml-auto text-orange-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI route text */}
              <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={13} className="text-purple-400" />
                  <span className="text-xs font-bold text-purple-400">Gemma 4 Evacuation Plan</span>
                </div>
                <div className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{data?.route || 'No route data available.'}</div>
              </div>
            </>
          )}
        </div>

        {/* Close */}
        <div className="px-5 py-4 border-t border-white/5 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:text-white hover:border-white/20 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
