import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Place = {
  properties: {
    place_id: string;
    name: string;
    categories: string[];
    formatted: string;
    opening_hours?: string;
    website?: string;
  };
};

type Props = {
  places: Place[];
  onPlacePress: (place: Place) => void;
  showSaveButton?: boolean;
  savedPlaces?: string[];
  onSave?: (placeId: string) => void;
  onUnsave?: (placeId: string) => void;
};

const PlacesList: React.FC<Props> = ({
  places,
  onPlacePress,
  showSaveButton = true,
  savedPlaces = [],
  onSave,
  onUnsave,
}) => {
  const isPlaceSaved = (placeId: string) => savedPlaces.includes(placeId);

  return (
    <FlatList
      data={places}
      keyExtractor={(item) => item.properties.place_id}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No places found nearby.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onPlacePress(item)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {item.properties.name}
            </Text>
            {showSaveButton && (
              <TouchableOpacity
                onPress={() => {
                  if (!onSave || !onUnsave) return;
                  isPlaceSaved(item.properties.place_id)
                    ? onUnsave(item.properties.place_id)
                    : onSave(item.properties.place_id);
                }}
                style={styles.saveButton}
              >
                <MaterialIcons
                  name={
                    isPlaceSaved(item.properties.place_id)
                      ? "bookmark"
                      : "bookmark-border"
                  }
                  size={24}
                  color="#3498db"
                />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.category} numberOfLines={1}>
            {item.properties.categories.join(" • ")}
          </Text>
          {item.properties.opening_hours && (
            <View style={styles.hoursContainer}>
              <MaterialIcons
                name="access-time"
                size={16}
                color="#27ae60"
                style={styles.icon}
              />
              <Text style={styles.hoursText}>
                {item.properties.opening_hours}
              </Text>
            </View>
          )}
          <Text style={styles.address} numberOfLines={1}>
            {item.properties.formatted}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    flex: 1,
  },
  category: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 8,
  },
  hoursContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  icon: {
    marginRight: 4,
  },
  hoursText: {
    fontSize: 12,
    color: "#27ae60",
  },
  address: {
    fontSize: 12,
    color: "#95a5a6",
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#95a5a6",
    textAlign: "center",
  },
  saveButton: {
    padding: 4,
  },
});

export default PlacesList;
