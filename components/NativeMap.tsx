/**
 * NativeMap - Web implementation using Leaflet (OpenStreetMap)
 * Imports leaflet from npm (bundled) and injects CSS at runtime.
 * Exports MapView/Marker matching the react-native-maps API.
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
import * as L from 'leaflet';

// ── CSS injection ────────────────────────────────────────────────────────────
// Leaflet needs CSS for tiles/controls to render. We inject it once at runtime.

const LEAFLET_CSS = `
.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,
.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,
.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0}
.leaflet-container{overflow:hidden;outline-offset:1px;font-family:inherit}
.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{-webkit-user-select:none;user-select:none;-webkit-user-drag:none}
.leaflet-tile::selection{background:transparent}
img.leaflet-tile{object-fit:fill}
.leaflet-tile-container{pointer-events:none}
.leaflet-map-pane{z-index:2}
.leaflet-tile-pane{z-index:200}
.leaflet-overlay-pane{z-index:400}
.leaflet-shadow-pane{z-index:500}
.leaflet-marker-pane{z-index:600}
.leaflet-tooltip-pane{z-index:650}
.leaflet-popup-pane{z-index:700}
.leaflet-control{position:relative;z-index:800;pointer-events:auto}
.leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}
.leaflet-top{top:0}.leaflet-right{right:0}.leaflet-bottom{bottom:0}.leaflet-left{left:0}
.leaflet-control-zoom{border-radius:5px;border:2px solid rgba(0,0,0,.2);background-clip:padding-box}
.leaflet-control-zoom a{width:30px;height:30px;line-height:30px;text-align:center;text-decoration:none;color:#333;background:#fff;display:block;font:bold 18px 'Lucida Console',Monaco,monospace}
.leaflet-control-zoom a:hover{background:#f4f4f4}
.leaflet-control-zoom-in{border-top-left-radius:3px;border-top-right-radius:3px;border-bottom:1px solid #ccc}
.leaflet-control-zoom-out{border-bottom-left-radius:3px;border-bottom-right-radius:3px}
.leaflet-touch .leaflet-control-zoom a{width:36px;height:36px;line-height:36px;font-size:22px}
.leaflet-popup-content-wrapper{background:#fff;border-radius:12px;padding:1px;box-shadow:0 3px 14px rgba(0,0,0,.2)}
.leaflet-popup-content{margin:13px 24px 13px 20px;line-height:1.3;font-size:13px;min-height:1px}
.leaflet-popup-close-button{position:absolute;top:0;right:0;border:none;background:transparent;font:16px/14px Tahoma,Verdana,sans-serif;color:#757575;cursor:pointer;padding:4px 4px 0 0;width:18px;height:14px;text-align:center;text-decoration:none}
.leaflet-popup-tip-container{width:40px;height:20px;position:absolute;left:50%;margin-top:-1px;margin-left:-20px;overflow:hidden;pointer-events:none}
.leaflet-popup-tip{width:17px;height:17px;padding:1px;margin:-10px auto 0;transform:rotate(45deg);background:#fff;box-shadow:0 3px 14px rgba(0,0,0,.2)}
.leaflet-attribution-flag{display:none!important}
.leaflet-control-attribution{font-size:10px;background:rgba(255,255,255,.8);padding:0 5px;border-radius:3px}
.leaflet-grab{cursor:grab}.leaflet-dragging .leaflet-grab{cursor:grabbing}
`;

let cssInjected = false;

function ensureCSS() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = LEAFLET_CSS;
  document.head.appendChild(style);
}

// ── Shared context ───────────────────────────────────────────────────────────

const MapContext = createContext<L.Map | null>(null);

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
    const mapRef = useRef<L.Map | null>(null);
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
          const bounds = L.latLngBounds(
            coords.map((c: any) => L.latLng(c.latitude, c.longitude)),
          );
          const pad = options?.edgePadding || { top: 50, right: 50, bottom: 50, left: 50 };
          mapRef.current.fitBounds(bounds, {
            padding: [pad.top, pad.right] as [number, number],
            animate: options?.animated !== false,
          });
        }
      },
    }));

    useEffect(() => {
      let cancelled = false;

      try {
        ensureCSS();

        if (!containerRef.current) {
          onError?.();
          return;
        }

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

        if (!cancelled) {
          setReady(true);
          // Leaflet needs a tick to measure the container correctly
          setTimeout(() => map.invalidateSize(), 100);
          onMapReady?.();
        }
      } catch (err) {
        console.error('Leaflet map init error:', err);
        if (!cancelled) onError?.();
      }

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
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!map || !coordinate) return;

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
