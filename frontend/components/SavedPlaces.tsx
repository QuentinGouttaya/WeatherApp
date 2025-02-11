import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PlacesList from "./PlacesList";

type Props = {
  places: any[];
  savedPlaces: string[];
  onSavePlace: (placeId: string) => void;
};

const SavedPlaces: React.FC<Props> = ({ places, savedPlaces, onSavePlace }) => {
  const savedPlacesData = places.filter((p) =>
    savedPlaces.includes(p.properties.place_id),
  );

  return (
    <View style={styles.container}>
      {savedPlacesData.length > 0 ? (
        <PlacesList
          places={savedPlacesData}
          onPlacePress={() => {}}
          showSaveButton={false}
        />
      ) : (
        <Text style={styles.emptyText}>No saved places yet</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#7f8c8d",
    fontSize: 16,
  },
});

export default SavedPlaces;
