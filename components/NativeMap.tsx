/**
 * NativeMap - Web implementation using Leaflet (OpenStreetMap)
 * Exports MapView/Marker components matching the react-native-maps API
 * so LiveMap.tsx works on both web and native without changes.
 */

import React, {
  forwardRef,
  useEffect,
  useRef,
  useImperativeHandle,
  useState,
  createContext,
  useContext,
} from 'react';
import { View } from 'react-native';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Shared context so Marker children can access the Leaflet map instance
const MapContext = createContext<any>(null);

let leafletLoadPromise: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if ((window as any).L) return Promise.resolve();
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return leafletLoadPromise;
}

function deltaToZoom(delta: number): number {
  if (delta >= 40) return 3;
  if (delta >= 20) return 4;
  if (delta >= 10) return 5;
  if (delta >= 5) return 7;
  if (delta >= 1) return 9;
  if (delta >= 0.5) return 10;
  if (delta >= 0.1) return 12;
  if (delta >= 0.05) return 13;
  if (delta >= 0.01) return 15;
  if (delta >= 0.005) return 16;
  return 17;
}

// ── MapView ──────────────────────────────────────────────────────────────────

const MapView = forwardRef<any, any>(
  ({ style, initialRegion, onMapReady, onError, children }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region: any, duration?: number) => {
        if (mapRef.current) {
          mapRef.current.flyTo(
            [region.latitude, region.longitude],
            deltaToZoom(region.latitudeDelta),
            { duration: (duration || 500) / 1000 },
          );
        }
      },
      fitToCoordinates: (coords: any[], options?: any) => {
        if (mapRef.current && coords.length > 0) {
          const L = (window as any).L;
          const bounds = L.latLngBounds(
            coords.map((c: any) => [c.latitude, c.longitude]),
          );
          const pad = options?.edgePadding || { top: 50, right: 50, bottom: 50, left: 50 };
          mapRef.current.fitBounds(bounds, {
            padding: [pad.top, pad.right],
            animate: options?.animated !== false,
          });
        }
      },
    }));

    useEffect(() => {
      let cancelled = false;

      loadLeaflet()
        .then(() => {
          if (cancelled || !containerRef.current) return;
          const L = (window as any).L;

          const map = L.map(containerRef.current, {
            center: [
              initialRegion?.latitude ?? 39.8283,
              initialRegion?.longitude ?? -98.5795,
            ],
            zoom: deltaToZoom(initialRegion?.latitudeDelta ?? 40),
            zoomControl: true,
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          }).addTo(map);

          mapRef.current = map;
          setReady(true);
          // Leaflet sometimes needs a tick to measure the container
          setTimeout(() => map.invalidateSize(), 100);
          onMapReady?.();
        })
        .catch(() => {
          if (!cancelled) onError?.();
        });

      return () => {
        cancelled = true;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }, []);

    return (
      <View style={style}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
        {ready && (
          <MapContext.Provider value={mapRef.current}>
            {children}
          </MapContext.Provider>
        )}
      </View>
    );
  },
);

MapView.displayName = 'MapView';

// ── Marker ───────────────────────────────────────────────────────────────────

const Marker: React.FC<any> = ({
  coordinate,
  title,
  description,
  pinColor,
  onPress,
}) => {
  const map = useContext(MapContext);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !coordinate) return;

    const L = (window as any).L;

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:28px;height:28px;border-radius:50%;
        background:${pinColor || '#4CAF50'};
        border:2px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,.3);
        display:flex;align-items:center;justify-content:center;
      "><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([coordinate.latitude, coordinate.longitude], {
      icon,
    }).addTo(map);

    if (title || description) {
      marker.bindPopup(
        `<b>${title || ''}</b>${description ? '<br/>' + description : ''}`,
      );
    }

    if (onPress) marker.on('click', onPress);

    markerRef.current = marker;

    return () => {
      if (markerRef.current) markerRef.current.remove();
    };
  }, [map, coordinate?.latitude, coordinate?.longitude, title, description, pinColor]);

  return null;
};

// ── Stubs ────────────────────────────────────────────────────────────────────

const Callout: React.FC<any> = () => null;
const PROVIDER_GOOGLE = null;

export default MapView;
export { Marker, Callout, PROVIDER_GOOGLE };
