import React, { useRef, useImperativeHandle, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";

interface Location {
  coords: {
    latitude: number;
    longitude: number;
  };
}

interface Place {
  properties: {
    place_id?: string;
    name: string;
    lat: number;
    lon: number;
    categories: string[];
  };
}

interface MapDisplayProps {
  location: Location | null;
  places: Place[];
  radius: number;
  onPlacePress: (place: Place) => void;
}

const MapDisplay = React.forwardRef<MapView, MapDisplayProps>(
  ({ location, places, radius, onPlacePress }, ref) => {
    const mapRef = useRef<MapView>(null);

    // Expose centerMap method to parent component
    useImperativeHandle(ref, () => ({
      centerMap: () => {
        if (mapRef.current && location) {
          mapRef.current.animateToRegion(
            {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            },
            500,
          );
        }
      },
    }));

    // Generate stable markers
    const markers = useMemo(() => {
      return places.map((place) => (
        <Marker
          key={`marker-${place.properties.place_id || place.properties.name}`}
          coordinate={{
            latitude: place.properties.lat,
            longitude: place.properties.lon,
          }}
          title={place.properties.name}
          description={place.properties.categories.join(", ")}
          pinColor="#e74c3c"
          onPress={() => onPlacePress(place)}
        />
      ));
    }, [places, onPlacePress]);

    // Fallback UI for loading state
    if (!location?.coords) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Acquiring location...</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          showsScale
        >
          {/* Circle representing the search radius */}
          <Circle
            center={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            radius={radius}
            strokeWidth={2}
            strokeColor="rgba(52, 152, 219, 0.5)"
            fillColor="rgba(52, 152, 219, 0.2)"
          />
          {/* Markers for places */}
          {markers}
        </MapView>
        {/* Center Position Button */}
        <TouchableOpacity
          onPress={() =>
            mapRef.current?.animateToRegion(
              {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              },
              500,
            )
          }
          style={styles.centerButton}
        >
          <MaterialIcons name="my-location" size={24} color="black" />
        </TouchableOpacity>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#3498db",
  },
  centerButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
});

export default MapDisplay;
