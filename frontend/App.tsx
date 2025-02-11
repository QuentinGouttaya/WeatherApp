import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Modal,
  Animated,
  useWindowDimensions,
} from "react-native";
import MapDisplay from "./components/MapDisplay"; // Import the MapDisplay component
import WeatherCard from "./components/WeatherCard";
import Alerts from "./components/Alerts";
import ControlPanel from "./components/ControlPanel";
import PlacesList from "./components/PlacesList";
import SavedPlaces from "./components/SavedPlaces";
import * as Location from "expo-location";
import * as Battery from "expo-battery";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { MaterialIcons } from "@expo/vector-icons";

type WeatherData = {
  current: {
    temperature_2m: number;
    wind_speed_10m: number;
    precipitation: number;
  };
  hourly: {
    temperature_2m: number[];
  };
};

type Place = {
  properties: {
    place_id: string;
    name: string;
    lat: number;
    lon: number;
    categories: string[];
    formatted: string;
    opening_hours?: string;
    website?: string;
  };
};

type TabType = "weather" | "alerts" | "places" | "saved" | "login";

export default function App() {
  const { height } = useWindowDimensions();
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [radius, setRadius] = useState(5000);
  const [error, setError] = useState("");
  const [refreshInterval, setRefreshInterval] = useState(300000);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("weather");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "commercial.supermarket",
    "catering.restaurant",
    "entertainment.cinema",
  ]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const overlayHeight = useRef(new Animated.Value(0.8)).current;
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );
  const [initialLoad, setInitialLoad] = useState(true);
  const [savedPlaces, setSavedPlaces] = useState<string[]>([]);
  const SUPPORTED_CATEGORIES = [
    "catering.restaurant",
    "catering.cafe",
    "catering.fast_food",
    "catering.bar",
    "commercial.supermarket",
    "commercial.shopping_mall",
    "commercial.clothing",
    "commercial.convenience",
    "service.financial.atm",
    "service.vehicle.fuel",
    "service.post_office",
    "healthcare.pharmacy",
    "healthcare.hospital",
    "healthcare.clinic",
  ];

  // Load saved places
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const saved = await AsyncStorage.getItem("savedPlaces");
        if (saved) setSavedPlaces(JSON.parse(saved));
      } catch (error) {
        console.error("Error loading saved places:", error);
      }
    };
    loadSaved();
  }, []);

  // Save/Load battery status
  useEffect(() => {
    const setupBattery = async () => {
      try {
        const initialBattery = await Battery.getBatteryLevelAsync();
        setBatteryLevel(initialBattery);
        const subscription = Battery.addBatteryLevelListener(
          ({ batteryLevel }) => {
            setBatteryLevel(batteryLevel);
            updateBatterySettings(batteryLevel);
          },
        );
        return () => subscription.remove();
      } catch (err) {
        setError("Battery monitoring failed");
      }
    };
    setupBattery();
  }, []);

  // Location tracking
  useEffect(() => {
    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission required");
          setInitialLoad(false);
          return;
        }
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(initialLocation);
        setInitialLoad(false);
        const sub = await Location.watchPositionAsync(
          {
            accuracy:
              batteryLevel < 0.3
                ? Location.Accuracy.Low
                : Location.Accuracy.High,
            timeInterval: 30000,
            distanceInterval: 50,
          },
          (newLocation) => setLocation(newLocation),
        );
        locationSubscription.current = sub;
      } catch (err) {
        setError(err.message);
        setInitialLoad(false);
      }
    };
    startWatching();
    return () => locationSubscription.current?.remove();
  }, [batteryLevel]);

  const updateBatterySettings = (level: number) => {
    const newRadius = level < 0.3 ? 10000 : 5000;
    setRadius(newRadius);
    setRefreshInterval(level < 0.3 ? 600000 : 300000);
  };

  const validateCategories = (categories: string[]) => {
    return categories.filter((cat) => SUPPORTED_CATEGORIES.includes(cat));
  };

  const handleCategorySelection = (cat: string) => {
    setSelectedCategories((prev) => {
      const updated = prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat];
      return validateCategories(updated);
    });
  };

  const fetchData = useCallback(async () => {
    if (!location || selectedCategories.length === 0) return;
    setIsLoading(true);
    try {
      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:5000"
          : "http://localhost:5000";
      const [weatherRes, placesRes] = await Promise.all([
        axios.get(`${baseUrl}/weather`, {
          params: {
            lat: location.coords.latitude,
            lon: location.coords.longitude,
          },
        }),
        axios.get(`${baseUrl}/places`, {
          params: {
            lat: location.coords.latitude,
            lon: location.coords.longitude,
            radius,
            categories: validateCategories(selectedCategories).join(","),
          },
        }),
      ]);
      setWeather(weatherRes.data);
      const features = placesRes.data.features || [];
      const processedPlaces = features.map((f: any) => ({
        properties: {
          ...f.properties,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        },
      }));
      setPlaces(processedPlaces);
    } catch (err: any) {
      console.error("Error fetching data:", err.response?.data || err.message);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [location, radius, selectedCategories]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const toggleOverlay = () => {
    Animated.timing(overlayHeight, {
      toValue: isOverlayVisible ? 0 : 1, // Animate between 0 and 1
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsOverlayVisible(!isOverlayVisible);
  };

  const handleSavePlace = async (placeId: string) => {
    const newSaved = [...savedPlaces, placeId];
    setSavedPlaces(newSaved);
    await AsyncStorage.setItem("savedPlaces", JSON.stringify(newSaved));
  };

  const handleUnsavePlace = async (placeId: string) => {
    const newSaved = savedPlaces.filter((id) => id !== placeId);
    setSavedPlaces(newSaved);
    await AsyncStorage.setItem("savedPlaces", JSON.stringify(newSaved));
  };

  const handlePlacePress = (place: Place) => {
    setSelectedPlace(place);
    // Extract city from formatted address (assuming format: "Address, City, Country")
    const addressParts = place.properties.formatted.split(", ");
    const city = addressParts.length > 1 ? addressParts[1] : "";
    // Create search query with name and city
    const searchQuery = encodeURIComponent(`${place.properties.name} ${city}`);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
    setPlaceDetailsUrl(googleMapsUrl);
  };

  const [placeDetailsUrl, setPlaceDetailsUrl] = useState<string | null>(null);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setError("");
            fetchData();
          }}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (initialLoad) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Initializing Services...</Text>
      </View>
    );
  }

  const overlayStyle = {
    ...styles.overlay,
    height: overlayHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, height * 0.9], // Increased height to 90%
    }),
  };

  return (
    <View style={styles.container}>
      {/* Map Display */}
      <MapDisplay
        location={location}
        places={places}
        radius={radius}
        onPlacePress={handlePlacePress}
      />

      {/* Refresh Data Button */}
      <TouchableOpacity onPress={fetchData} style={styles.refreshButton}>
        <MaterialIcons name="refresh" size={24} color="black" />
      </TouchableOpacity>

      {/* Hide Overlay Button */}
      <TouchableOpacity onPress={toggleOverlay} style={styles.toggleButton}>
        <Text style={styles.toggleButtonText}>
          {isOverlayVisible ? "▼ Hide" : "▲ Show"}
        </Text>
      </TouchableOpacity>

      {/* Overlay Content */}
      <Animated.View style={overlayStyle}>
        {/* Control Panel */}
        <ControlPanel
          selectedCategories={selectedCategories}
          handleCategorySelection={handleCategorySelection}
        />

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab("weather")}
            style={[
              styles.tabButton,
              activeTab === "weather" && styles.activeTab,
            ]}
          >
            <Text>Weather</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("alerts")}
            style={[
              styles.tabButton,
              activeTab === "alerts" && styles.activeTab,
            ]}
          >
            <Text>Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("places")}
            style={[
              styles.tabButton,
              activeTab === "places" && styles.activeTab,
            ]}
          >
            <Text>Places</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("saved")}
            style={[
              styles.tabButton,
              activeTab === "saved" && styles.activeTab,
            ]}
          >
            <Text>Saved</Text>
          </TouchableOpacity>
        </View>

        {/* Active Tab Content */}
        {activeTab === "weather" && weather && (
          <WeatherCard weather={weather} />
        )}
        {activeTab === "alerts" && (
          <Alerts weather={weather} batteryLevel={batteryLevel} />
        )}
        {activeTab === "places" && (
          <PlacesList places={places} onPlacePress={handlePlacePress} />
        )}
        {activeTab === "saved" && (
          <SavedPlaces
            savedPlaces={savedPlaces}
            onPlacePress={handlePlacePress}
          />
        )}
      </Animated.View>

      {/* Selected Place Modal */}
      {selectedPlace && (
        <Modal visible={!!selectedPlace} animationType="slide">
          <View style={styles.modalContainer}>
            <TouchableOpacity
              onPress={() => {
                setSelectedPlace(null);
                setPlaceDetailsUrl(null);
              }}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            {placeDetailsUrl ? (
              <WebView
                source={{ uri: placeDetailsUrl }}
                style={styles.webview}
              />
            ) : (
              <View style={styles.placeDetails}>
                <Text style={styles.placeName}>
                  {selectedPlace.properties.name}
                </Text>
                <Text style={styles.placeCategory}>
                  {selectedPlace.properties.categories.join(" • ")}
                </Text>
                <Text style={styles.placeAddress}>
                  {selectedPlace.properties.formatted}
                </Text>
                {selectedPlace.properties.opening_hours && (
                  <Text style={styles.detailText}>
                    Opening Hours: {selectedPlace.properties.opening_hours}
                  </Text>
                )}
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#3498db",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 16,
    padding: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: 10,
  },
  retryText: {
    color: "white",
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#2c3e50",
  },
  webviewContainer: {
    flex: 1,
    paddingTop: 40,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    padding: 16,
    maxHeight: "80%",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  tabButton: {
    padding: 12,
    borderRadius: 30,
    backgroundColor: "#ecf0f1",
    minWidth: 80,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#3498db",
  },
  toggleButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 40,
  },
  webview: {
    flex: 1,
  },
  placeDetails: {
    flex: 1,
    padding: 20,
  },
  placeName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  placeCategory: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 16,
  },
  placeAddress: {
    fontSize: 14,
    color: "#95a5a6",
    marginBottom: 20,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 20,
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 20,
  },
  closeText: {
    color: "white",
    fontWeight: "600",
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
  refreshButton: {
    position: "absolute",
    top: 20,
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
