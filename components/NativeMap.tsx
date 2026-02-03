/**
 * NativeMap - Web fallback
 * On web, react-native-maps is not available.
 * Exports stub components that match the react-native-maps API.
 * MapView triggers onError so LiveMap can show its fallback UI.
 */

import React, { forwardRef, useEffect } from 'react';
import { View } from 'react-native';

const MapView = forwardRef<any, any>((props, _ref) => {
  useEffect(() => {
    if (props.onError) {
      props.onError();
    }
  }, []);

  return <View style={props.style} />;
});

MapView.displayName = 'MapView';

const Marker: React.FC<any> = () => null;
const Callout: React.FC<any> = () => null;
const PROVIDER_GOOGLE = null;

export default MapView;
export { Marker, Callout, PROVIDER_GOOGLE };
