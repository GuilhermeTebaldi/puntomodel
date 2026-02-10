
import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, MessageCircle, Star, ChevronRight } from 'lucide-react';
import { fetchModelsAll, fetchModelsByCityAll, ModelProfileData } from '../services/models';
import { useI18n } from '../translations/i18n';

const toWhatsappDigits = (phone?: string) => (phone ? phone.replace(/\D/g, '') : '');

interface MapViewProps {
  onClose: () => void;
  onViewProfile: (model: ModelProfileData) => void;
  query?: string;
  searchCoords?: [number, number] | null;
}

const MapView: React.FC<MapViewProps> = ({ onClose, onViewProfile, query, searchCoords }) => {
  const { t, translateError } = useI18n();
  const [selectedModel, setSelectedModel] = useState<ModelProfileData | null>(null);
  const [models, setModels] = useState<ModelProfileData[]>([]);
  const [error, setError] = useState('');
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState(4);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const searchCircleRef = useRef<L.Circle | null>(null);
  const lastCenteredRef = useRef<string>('');
  const userInteractedRef = useRef(false);
  const didInitialFitRef = useRef(false);
  const lastQueryRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;
    const normalizedQuery = query?.trim() || '';

    const load = () => {
      fetchModelsAll()
        .then((data) => {
          if (!mounted) return;
          setModels(data);
          setError('');
        })
        .catch((err) => {
          if (!mounted) return;
          setError(err instanceof Error ? translateError(err.message) : t('errors.loadMap'));
        });
    };

    if (lastQueryRef.current !== normalizedQuery) {
      lastQueryRef.current = normalizedQuery;
      didInitialFitRef.current = false;
      setSearchCenter(null);
      userInteractedRef.current = false;
    }

    load();
    const intervalId = window.setInterval(load, 20000);

    if (searchCoords && normalizedQuery) {
      setSearchCenter(searchCoords);
    } else if (normalizedQuery) {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(normalizedQuery)}`
      )
        .then((res) => res.json())
        .then((data) => {
          const first = Array.isArray(data) ? data[0] : null;
          const lat = first?.lat ? Number(first.lat) : null;
          const lon = first?.lon ? Number(first.lon) : null;
          if (!mounted) return;
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            setSearchCenter([lat, lon]);
          }
        })
        .catch(() => undefined);
    }

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [query, t, translateError]);

  useEffect(() => {
    if (!mapRef.current || !searchCenter) return;
    if (userInteractedRef.current) return;
    const key = `${searchCenter[0].toFixed(6)},${searchCenter[1].toFixed(6)}`;
    if (lastCenteredRef.current === key) return;
    mapRef.current.setView(searchCenter, 12);
    lastCenteredRef.current = key;
  }, [searchCenter]);

  useEffect(() => {
    if (!selectedModel) return;
    const updated = models.find((model) => model.id === selectedModel.id);
    if (updated && updated.isOnline !== selectedModel.isOnline) {
      setSelectedModel(updated);
    }
  }, [models, selectedModel]);

  const modelsWithLocation = useMemo(
    () =>
      models.filter(
        (model) =>
          typeof model.location?.lat === 'number' && typeof model.location?.lon === 'number'
      ),
    [models]
  );

  const positions = useMemo(
    () =>
      modelsWithLocation.map((model) => [model.location!.lat as number, model.location!.lon as number] as [number, number]),
    [modelsWithLocation]
  );

  const buildSpreadPositionFromPoint = (
    centerPoint: L.Point,
    index: number,
    total: number,
    map: L.Map
  ) => {
    if (total <= 1) return map.containerPointToLatLng(centerPoint);
    const ringSize = 8;
    const ring = Math.floor(index / ringSize);
    const slot = index % ringSize;
    const slotsInRing = Math.min(ringSize, total - ring * ringSize);
    const angle = (slot / slotsInRing) * Math.PI * 2;
    const radius = 26 + ring * 14;
    const offsetPoint = L.point(Math.cos(angle) * radius, Math.sin(angle) * radius);
    const spreadPoint = centerPoint.add(offsetPoint);
    return map.containerPointToLatLng(spreadPoint);
  };

  const defaultCenter = useMemo(() => {
    if (positions.length === 0) return [-14.235, -51.9253] as [number, number];
    if (positions.length === 1) return positions[0];
    const avgLat = positions.reduce((sum, pos) => sum + pos[0], 0) / positions.length;
    const avgLon = positions.reduce((sum, pos) => sum + pos[1], 0) / positions.length;
    return [avgLat, avgLon] as [number, number];
  }, [positions]);

  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  const createMarkerIcon = (model: ModelProfileData, isActive: boolean) =>
    L.divIcon({
      className: 'punto-marker-wrapper',
      iconSize: [46, 56],
      iconAnchor: [23, 56],
      html: `
        <div class="punto-marker ${isActive ? 'is-active' : ''} ${model.isOnline === false ? 'is-offline' : 'is-online'}">
          <div class="punto-marker-photo">
            ${model.photos?.[0] ? `<img src="${model.photos[0]}" alt="${model.name}" />` : ''}
          </div>
        </div>
      `,
    });

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map('punto-map', {
      center: [-14.235, -51.9253],
      zoom: 4,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapZoom(map.getZoom());
    map.on('dragstart zoomstart', () => {
      userInteractedRef.current = true;
    });
    map.on('zoomend', () => {
      setMapZoom(map.getZoom());
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();
    if (searchCircleRef.current) {
      searchCircleRef.current.remove();
      searchCircleRef.current = null;
    }

    const shouldSpread = mapZoom >= 14;
    if (!shouldSpread) {
      modelsWithLocation.forEach((model) => {
        const marker = L.marker([model.location!.lat as number, model.location!.lon as number], {
          icon: createMarkerIcon(model, selectedModel?.id === model.id),
        }).addTo(
          markersRef.current!
        );
        marker.on('click', () => setSelectedModel(model));
      });
    } else {
      const groups: Array<{ center: L.Point; models: ModelProfileData[] }> = [];
      const threshold = 34;

      modelsWithLocation.forEach((model) => {
        const lat = model.location!.lat as number;
        const lon = model.location!.lon as number;
        const point = mapRef.current!.latLngToContainerPoint([lat, lon]);
        let group = groups.find((item) => item.center.distanceTo(point) <= threshold);
        if (!group) {
          groups.push({ center: point, models: [model] });
          return;
        }
        const nextCount = group.models.length + 1;
        const averaged = L.point(
          (group.center.x * (nextCount - 1) + point.x) / nextCount,
          (group.center.y * (nextCount - 1) + point.y) / nextCount
        );
        group.center = averaged;
        group.models.push(model);
      });

      groups.forEach((group) => {
        group.models.forEach((model, index) => {
          const position = buildSpreadPositionFromPoint(group.center, index, group.models.length, mapRef.current!);
          const marker = L.marker(position, {
            icon: createMarkerIcon(model, selectedModel?.id === model.id),
          }).addTo(
            markersRef.current!
          );
          marker.on('click', () => setSelectedModel(model));
        });
      });
    }

    if (searchCenter) {
      searchCircleRef.current = L.circle(searchCenter, {
        radius: 5000,
        color: '#e3262e',
        weight: 1,
        fillColor: '#e3262e',
        fillOpacity: 0.08,
      }).addTo(mapRef.current);
    }

    if (!didInitialFitRef.current && !userInteractedRef.current) {
      if (searchCenter) {
        mapRef.current.setView(searchCenter, 12);
        lastCenteredRef.current = `${searchCenter[0].toFixed(6)},${searchCenter[1].toFixed(6)}`;
      } else {
        mapRef.current.setView(defaultCenter, 4);
      }
      didInitialFitRef.current = true;
    }
  }, [modelsWithLocation, positions, defaultCenter, selectedModel, searchCenter, mapZoom]);

  return (
    <div className="fixed inset-0 z-[150] bg-[#f8f9fa] flex flex-col animate-in fade-in duration-300">
      <style>
        {`
          .punto-marker-wrapper {
            background: transparent;
            border: none;
          }
          .punto-marker {
            width: 46px;
            height: 56px;
            background: #16a34a;
            border-radius: 24px 24px 24px 4px;
            position: relative;
            transform: rotate(-45deg);
            box-shadow: 0 10px 20px rgba(0,0,0,0.18);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .punto-marker.is-offline {
            background: #dc2626;
          }
          .punto-marker.is-active {
            transform: rotate(-45deg) scale(1.08);
            box-shadow: 0 14px 24px rgba(22,163,74,0.35);
          }
          .punto-marker.is-offline.is-active {
            box-shadow: 0 14px 24px rgba(220,38,38,0.35);
          }
          .punto-marker-photo {
            width: 30px;
            height: 30px;
            background: #fff;
            border-radius: 50%;
            position: absolute;
            top: 8px;
            left: 8px;
            overflow: hidden;
            transform: rotate(45deg);
            border: 2px solid #fff;
          }
          .punto-marker-photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .leaflet-container {
            z-index: 0;
          }
        `}
      </style>
      {/* Map Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm z-20">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-gray-500 font-bold hover:text-[#e3262e] transition-colors"
        >
          <X size={20} />
          <span className="text-sm uppercase tracking-wider">{t('map.close')}</span>
        </button>
        <div className="text-center flex-1">
          <p className="text-xs font-bold text-gray-400 uppercase">{t('map.companionsIn')}</p>
          <p className="text-sm font-black text-gray-900">{query?.trim() ? query.trim().toUpperCase() : t('map.defaultRegion')}</p>
        </div>
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 relative overflow-hidden bg-gray-200 z-10">
        <div id="punto-map" className="w-full h-full" />
        {modelsWithLocation.length === 0 && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 font-semibold pointer-events-none">
            {t('map.noLocations')}
          </div>
        )}
      </div>

      {/* Model Info Bar (Bottom Sheet style) */}
      <div className={`absolute bottom-0 left-0 right-0 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-[40px] transition-transform duration-500 ease-out z-50 ${
        selectedModel ? 'translate-y-0' : 'translate-y-full'
      }`}>
        {selectedModel && (
          <div className="p-6 md:p-8 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative">
                  {selectedModel.photos?.[0] ? (
                    <img 
                      src={selectedModel.photos[0]} 
                      alt={selectedModel.name} 
                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-3xl object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-3xl bg-gray-100" />
                  )}
                  <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white ${selectedModel.isOnline === false ? 'bg-red-500' : 'bg-green-500'}`}></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl md:text-2xl font-black text-gray-900">
                      {selectedModel.name}{selectedModel.age ? `, ${selectedModel.age}` : ''}
                    </h3>
                    {selectedModel.featured && (
                      <div className="flex items-center bg-yellow-400 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold">
                        <Star size={10} fill="currentColor" className="mr-1" />
                        {t('common.premium').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 font-medium flex items-center gap-1 mt-1">
                    <MapPin size={14} /> {selectedModel.location?.city ? `${selectedModel.location.city}, ${selectedModel.location.state || ''}` : t('featured.locationMissing')}
                  </p>
                  {selectedModel.phone && (
                    <p className="text-gray-400 text-xs font-bold mt-2 uppercase tracking-widest">{selectedModel.phone}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {selectedModel.phone && (
                  <a 
                    href={`https://wa.me/${toWhatsappDigits(selectedModel.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-green-100"
                  >
                    <MessageCircle size={20} />
                    WhatsApp
                  </a>
                )}
                <button 
                  onClick={() => onViewProfile(selectedModel)}
                  className="bg-[#e3262e] text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  {t('map.viewProfile')}
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedModel(null)}
              className="absolute top-4 right-6 text-gray-300 hover:text-gray-500"
            >
              <X size={24} />
            </button>
          </div>
        )}
      </div>
      {error && (
        <div className="absolute bottom-6 left-6 bg-white border border-red-100 text-red-500 text-xs font-semibold px-4 py-2 rounded-full shadow">
          {error}
        </div>
      )}
    </div>
  );
};

export default MapView;
