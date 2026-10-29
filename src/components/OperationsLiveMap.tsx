import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  Compass,
  Radio,
  Truck,
  Navigation,
  CheckCircle2,
  Send,
  Zap,
  MapPin,
  Clock,
  Layers,
  Play,
  Pause,
  Maximize2,
  Gauge,
  Fuel,
  Phone,
  User,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Delivery, Vehicle, Driver } from '../types';

interface OperationsLiveMapProps {
  deliveries: Delivery[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onUpdateStatus: (deliveryId: string, status: Delivery['status']) => Promise<void>;
}

// Known Chennai Logistics Nodes with accurate coordinates
export interface GeoLocation {
  name: string;
  lat: number;
  lng: number;
  type: 'hub' | 'industrial' | 'port' | 'city' | 'airport';
}

const LOGISTICS_NODES: Record<string, GeoLocation> = {
  port: { name: 'Chennai Port Container Freight Hub', lat: 13.0844, lng: 80.2928, type: 'port' },
  central: { name: 'Central Railway Parcels Office', lat: 13.0827, lng: 80.2755, type: 'hub' },
  guindy: { name: 'Guindy Industrial Estate, Phase 2', lat: 13.0067, lng: 80.2025, type: 'industrial' },
  adyar: { name: 'Adyar Express Fulfilment Hub', lat: 13.0012, lng: 80.2565, type: 'city' },
  tnagar: { name: 'T. Nagar Retail Central Warehouse', lat: 13.0418, lng: 80.2341, type: 'city' },
  nungambakkam: { name: 'Nungambakkam Corporate Headquarters', lat: 13.0594, lng: 80.2425, type: 'city' },
  ambattur: { name: 'Ambattur Industrial Logistics Park', lat: 13.1143, lng: 80.1548, type: 'industrial' },
  sriperumbudur: { name: 'Sriperumbudur Manufacturing Facility', lat: 12.9675, lng: 79.9458, type: 'industrial' },
  airport: { name: 'Chennai International Cargo Terminal', lat: 12.9822, lng: 80.1636, type: 'airport' },
};

function resolveCoords(address: string): [number, number] {
  const lower = address.toLowerCase();
  if (lower.includes('port')) return [LOGISTICS_NODES.port.lat, LOGISTICS_NODES.port.lng];
  if (lower.includes('central') || lower.includes('railway')) return [LOGISTICS_NODES.central.lat, LOGISTICS_NODES.central.lng];
  if (lower.includes('guindy')) return [LOGISTICS_NODES.guindy.lat, LOGISTICS_NODES.guindy.lng];
  if (lower.includes('adyar')) return [LOGISTICS_NODES.adyar.lat, LOGISTICS_NODES.adyar.lng];
  if (lower.includes('t. nagar') || lower.includes('t nagar')) return [LOGISTICS_NODES.tnagar.lat, LOGISTICS_NODES.tnagar.lng];
  if (lower.includes('nungambakkam')) return [LOGISTICS_NODES.nungambakkam.lat, LOGISTICS_NODES.nungambakkam.lng];
  if (lower.includes('ambattur')) return [LOGISTICS_NODES.ambattur.lat, LOGISTICS_NODES.ambattur.lng];
  if (lower.includes('sriperumbudur')) return [LOGISTICS_NODES.sriperumbudur.lat, LOGISTICS_NODES.sriperumbudur.lng];
  if (lower.includes('airport')) return [LOGISTICS_NODES.airport.lat, LOGISTICS_NODES.airport.lng];
  // Default central Chennai
  return [13.0475, 80.2090];
}

export const OperationsLiveMap: React.FC<OperationsLiveMapProps> = ({
  deliveries,
  vehicles,
  drivers,
  onUpdateStatus,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [mapTileStyle, setMapTileStyle] = useState<'dark' | 'streets'>('dark');
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simProgress, setSimProgress] = useState<number>(0.35); // 0 to 1 along route

  // Active trips: assigned or in-transit
  const activeDeliveries = useMemo(() => {
    return deliveries.filter((d) => d.status === 'assigned' || d.status === 'in_transit');
  }, [deliveries]);

  const selectedDelivery = useMemo(() => {
    if (selectedDeliveryId) {
      const found = deliveries.find((d) => d.delivery_id === selectedDeliveryId);
      if (found) return found;
    }
    return activeDeliveries[0] || deliveries[0] || null;
  }, [selectedDeliveryId, activeDeliveries, deliveries]);

  // Simulation tick for vehicle motion along route
  useEffect(() => {
    if (!isSimulating || activeDeliveries.length === 0) return;
    const interval = setInterval(() => {
      setSimProgress((prev) => {
        const next = prev + 0.015 * simSpeed;
        return next > 0.98 ? 0.05 : next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, activeDeliveries.length]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Chennai logistics corridor
    const map = L.map(mapContainerRef.current, {
      center: [13.045, 80.22],
      zoom: 12,
      zoomControl: true,
    });

    const tileUrl =
      mapTileStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution =
      mapTileStyle === 'dark'
        ? '&copy; <a href="https://carto.com/">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 18,
    }).addTo(map);

    const routesLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    routesLayerRef.current = routesLayer;
    markersLayerRef.current = markersLayer;

    // Resize fix for container rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Style (Dark vs Streets)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl =
      mapTileStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);
  }, [mapTileStyle]);

  // Render Hub Pins, Route Polylines, and Moving Vehicles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !markersLayer || !routesLayer) return;

    markersLayer.clearLayers();
    routesLayer.clearLayers();

    // 1. Draw Logistics Hub Markers
    Object.entries(LOGISTICS_NODES).forEach(([key, node]) => {
      const isPort = node.type === 'port';
      const isIndustrial = node.type === 'industrial';
      const isAirport = node.type === 'airport';

      const hubHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: ${
            isPort ? 'rgba(6, 182, 212, 0.25)' : isIndustrial ? 'rgba(245, 158, 11, 0.25)' : isAirport ? 'rgba(168, 85, 247, 0.25)' : 'rgba(59, 130, 246, 0.25)'
          };"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background: ${
            isPort ? '#06b6d4' : isIndustrial ? '#f59e0b' : isAirport ? '#a855f7' : '#3b82f6'
          }; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.5);"></div>
        </div>
      `;

      const hubIcon = L.divIcon({
        className: 'hub-marker-icon',
        html: hubHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const hubMarker = L.marker([node.lat, node.lng], { icon: hubIcon });
      hubMarker.bindTooltip(
        `<div style="font-family: sans-serif; font-size: 11px; font-weight: 600;">${node.name}</div>`,
        { direction: 'top', className: 'hub-tooltip' }
      );
      markersLayer.addLayer(hubMarker);
    });

    // 2. Draw Active Route Polylines & Animated Moving Vehicle Markers
    activeDeliveries.forEach((del, idx) => {
      const pickupCoords = resolveCoords(del.pickup);
      const dropoffCoords = resolveCoords(del.dropoff);

      const isSelected = selectedDelivery?.delivery_id === del.delivery_id;
      const isBatch = Boolean(del.batch_id);

      // Check if there is another order in the same batch to draw multi-stop sequence!
      let secondStopCoords: [number, number] | null = null;
      if (isBatch) {
        const otherInBatch = activeDeliveries.find(
          (d) => d.batch_id === del.batch_id && d.delivery_id !== del.delivery_id
        );
        if (otherInBatch) {
          secondStopCoords = resolveCoords(otherInBatch.dropoff);
        }
      }

      // Draw Route Polyline
      const latlngs: [number, number][] = [pickupCoords, dropoffCoords];
      if (secondStopCoords) {
        latlngs.push(secondStopCoords);
      }

      const polyline = L.polyline(latlngs, {
        color: isBatch ? '#06b6d4' : isSelected ? '#38bdf8' : '#6366f1',
        weight: isSelected ? 5 : 3.5,
        opacity: isSelected ? 0.95 : 0.7,
        dashArray: del.status === 'in_transit' ? '8, 8' : undefined,
      });

      polyline.on('click', () => {
        setSelectedDeliveryId(del.delivery_id);
      });

      routesLayer.addLayer(polyline);

      // Interpolate current simulated GPS vehicle position along the route
      // Progress fraction
      const fraction = (simProgress + idx * 0.3) % 1;
      let currLat = pickupCoords[0] + (dropoffCoords[0] - pickupCoords[0]) * fraction;
      let currLng = pickupCoords[1] + (dropoffCoords[1] - pickupCoords[1]) * fraction;

      if (secondStopCoords && fraction > 0.5) {
        // Heading towards stop 2
        const subFraction = (fraction - 0.5) / 0.5;
        currLat = dropoffCoords[0] + (secondStopCoords[0] - dropoffCoords[0]) * subFraction;
        currLng = dropoffCoords[1] + (secondStopCoords[1] - dropoffCoords[1]) * subFraction;
      }

      const assignedV = vehicles.find((v) => v.vehicle_id === del.assigned_vehicle_id);
      const assignedD = drivers.find((d) => d.driver_id === del.assigned_driver_id);

      // Vehicle Custom DivIcon with pulsing radar waves
      const vehicleHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="position: absolute; top: -6px; width: 44px; height: 44px; border-radius: 50%; background: ${
            del.status === 'in_transit' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(99, 102, 241, 0.3)'
          }; animation: pulse 1.5s infinite;"></div>
          <div style="width: 34px; height: 34px; border-radius: 10px; background: ${
            isBatch ? 'linear-gradient(135deg, #0891b2, #2563eb)' : 'linear-gradient(135deg, #2563eb, #4f46e5)'
          }; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white;">
            🚚
          </div>
          <div style="margin-top: 3px; font-family: monospace; font-size: 10px; font-weight: 700; background: rgba(15, 23, 42, 0.95); color: #38bdf8; padding: 2px 6px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.5); white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
            ${del.assigned_vehicle_id} ${isBatch ? '· Multi-Stop' : ''}
          </div>
        </div>
      `;

      const vehicleIcon = L.divIcon({
        className: 'vehicle-marker-icon',
        html: vehicleHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const vehicleMarker = L.marker([currLat, currLng], { icon: vehicleIcon });

      vehicleMarker.on('click', () => {
        setSelectedDeliveryId(del.delivery_id);
      });

      // Rich Leaflet Popup
      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <strong style="color: #0284c7; font-size: 13px;">${del.assigned_vehicle_id}</strong>
            <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 10px; font-weight: 600;">
              ${del.status.toUpperCase()}
            </span>
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Driver:</strong> ${assignedD?.name || del.assigned_driver_id || 'Assigned'}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Order:</strong> ${del.delivery_id} (${del.weight_kg}kg)
          </div>
          ${del.batch_id ? `<div style="color: #0891b2; font-weight: 600; font-size: 11px; margin-bottom: 4px;">📦 Multi-Stop Co-Delivery Route</div>` : ''}
          <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
            To: ${del.dropoff}
          </div>
        </div>
      `;

      vehicleMarker.bindPopup(popupContent);
      markersLayer.addLayer(vehicleMarker);
    });
  }, [activeDeliveries, simProgress, selectedDelivery, vehicles, drivers]);

  // Center Map on Selected Delivery
  const handleCenterOnSelected = () => {
    if (!selectedDelivery || !mapInstanceRef.current) return;
    const coords = resolveCoords(selectedDelivery.dropoff);
    mapInstanceRef.current.flyTo(coords, 13, { duration: 1.2 });
  };

  return (
    <div className="space-y-6">
      {/* Top Map Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              <span>Real-Time GPS Fleet &amp; Multi-Stop Route Telemetry Map</span>
            </h3>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              <Radio className="w-3 h-3 animate-pulse" /> Live OpenStreetMap Tracking
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real geographical map with animated vehicle GPS coordinates, road network polylines, and multi-stop co-delivery sequences.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Tile style toggle */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setMapTileStyle('dark')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                mapTileStyle === 'dark' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌙 Dark Logistics
            </button>
            <button
              onClick={() => setMapTileStyle('streets')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                mapTileStyle === 'streets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🗺️ OpenStreetMap
            </button>
          </div>

          {/* Simulation Play / Pause */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition"
            title={isSimulating ? 'Pause GPS Animation' : 'Resume GPS Animation'}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isSimulating ? 'Pause' : 'Resume'}</span>
          </button>

          {/* Sim Speed Toggle */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs text-slate-300">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-2 py-0.5 rounded-md font-mono ${
                  simSpeed === spd ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Focus button */}
          {selectedDelivery && (
            <button
              onClick={handleCenterOnSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-semibold rounded-xl transition active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Center</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Real Leaflet Map + Telemetry Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Leaflet Map Viewport */}
        <div className="lg:col-span-2 relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl min-h-[520px] flex flex-col">
          {/* Map Container Element */}
          <div ref={mapContainerRef} className="w-full flex-1 min-h-[460px] z-10" />

          {/* Map Overlay Controls / Info Bar */}
          <div className="bg-slate-900/95 border-t border-slate-800 p-3 flex items-center justify-between text-xs text-slate-300 z-20">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span>Chennai Port &amp; Hubs</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>Industrial Zones</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                <span>{activeDeliveries.length} Active Vehicles</span>
              </span>
            </div>

            <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
              GPS Lat: 13.0475° N, Lng: 80.2090° E · OpenStreetMap Engine
            </span>
          </div>
        </div>

        {/* Right Column: Live Telemetry, Driver Details & Quick Handover Action */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Live Trip Telemetry</span>
              </h4>
              {selectedDelivery && (
                <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950 border border-cyan-800 px-2.5 py-0.5 rounded-full">
                  {selectedDelivery.delivery_id}
                </span>
              )}
            </div>

            {selectedDelivery ? (
              <div className="mt-4 space-y-3.5 text-xs">
                {/* Status chip */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Trip Status:</span>
                  <span
                    className={`font-semibold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-full border ${
                      selectedDelivery.status === 'in_transit'
                        ? 'bg-indigo-950 text-indigo-300 border-indigo-700 animate-pulse'
                        : selectedDelivery.status === 'assigned'
                        ? 'bg-blue-950 text-blue-300 border-blue-700'
                        : selectedDelivery.status === 'delivered'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}
                  >
                    {selectedDelivery.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Co-Delivery Multi-Stop Badge */}
                {selectedDelivery.batch_id && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/80 text-[11px] text-cyan-200 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Co-Delivery Multi-Stop Trip</span>
                      </span>
                      <span className="font-mono text-[10px] bg-cyan-900 px-1.5 py-0.2 rounded">
                        Stop #{selectedDelivery.stop_order || 1}
                      </span>
                    </div>
                    <p className="text-[10px] text-cyan-300/80">
                      Vehicle &amp; driver are bundled to deliver nearby addresses in 1 trip!
                    </p>
                  </div>
                )}

                {/* Speed & Battery Telemetry Gauges */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-semibold">
                      <Gauge className="w-3 h-3 text-cyan-400" />
                      <span>Speed</span>
                    </div>
                    <div className="text-base font-mono font-bold text-white mt-1">
                      {selectedDelivery.status === 'in_transit' ? `${Math.round(38 + simSpeed * 4)} km/h` : '0 km/h'}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-semibold">
                      <Fuel className="w-3 h-3 text-emerald-400" />
                      <span>Vehicle Fuel</span>
                    </div>
                    <div className="text-base font-mono font-bold text-emerald-400 mt-1">
                      {vehicles.find((v) => v.vehicle_id === selectedDelivery.assigned_vehicle_id)?.fuel_level || 92}%
                    </div>
                  </div>
                </div>

                {/* Route Waypoints */}
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-semibold block">Origin / Pickup:</span>
                      <span className="text-slate-200 font-medium">{selectedDelivery.pickup}</span>
                    </div>
                  </div>
                  <div className="border-l-2 border-slate-800 ml-1 pl-3 py-0.5 text-slate-500 font-mono text-[10px]">
                    Distance: ~{selectedDelivery.distance_km || 14.5} km · GPS Route Locked
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-semibold block">Destination / Dropoff:</span>
                      <span className="text-slate-100 font-bold">{selectedDelivery.dropoff}</span>
                    </div>
                  </div>
                </div>

                {/* Driver & Unit Cards */}
                <div className="space-y-2 text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-cyan-400" /> Vehicle:
                    </span>
                    <strong className="text-white font-mono">
                      {selectedDelivery.assigned_vehicle_id || 'Not Assigned'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-400" /> Driver:
                    </span>
                    <strong className="text-white">
                      {drivers.find((d) => d.driver_id === selectedDelivery.assigned_driver_id)?.name ||
                        selectedDelivery.assigned_driver_id ||
                        'Not Assigned'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Package Weight:</span>
                    <strong className="text-slate-200 font-mono">{selectedDelivery.weight_kg} kg</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No delivery selected</p>
            )}
          </div>

          {/* Quick Action Button */}
          {selectedDelivery && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              {selectedDelivery.status === 'assigned' && (
                <button
                  onClick={() => onUpdateStatus(selectedDelivery.delivery_id, 'in_transit')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Signal Transit Departure</span>
                </button>
              )}

              {selectedDelivery.status === 'in_transit' && (
                <button
                  onClick={() => onUpdateStatus(selectedDelivery.delivery_id, 'delivered')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {selectedDelivery.batch_id
                      ? `Confirm Stop #${selectedDelivery.stop_order || 1} Handover (Proceed to Next Stop)`
                      : 'Confirm Delivery Handover (Release Resources)'}
                  </span>
                </button>
              )}

              {selectedDelivery.status === 'delivered' && (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-center text-xs text-emerald-300">
                  ✅ Delivery Completed! Resources released back to available pool.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
