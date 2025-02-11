import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  selectedCategories: string[];
  handleCategorySelection: (category: string) => void;
};

const ControlPanel: React.FC<Props> = ({
  selectedCategories,
  handleCategorySelection,
}) => {
  const categories = [
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

  return (
    <View style={controlPanelStyles.container}>
      <View style={controlPanelStyles.statusRow}>
        <View style={controlPanelStyles.batteryIndicator}>
          <MaterialIcons
            name="battery-charging-full"
            size={16}
            color="#2c3e50"
          />
          <Text style={controlPanelStyles.batteryText}>Battery: 100%</Text>
        </View>
        <Text style={controlPanelStyles.radiusText}>Radius: 5km</Text>
      </View>
      <TouchableOpacity style={controlPanelStyles.refreshButton}>
        <Text style={controlPanelStyles.refreshText}>Refresh</Text>
      </TouchableOpacity>
      <View style={controlPanelStyles.categoryHeader}>
        <Text style={controlPanelStyles.sectionTitle}>Categories</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => handleCategorySelection(category)}
            style={[
              controlPanelStyles.categoryButton,
              selectedCategories.includes(category) &&
                controlPanelStyles.selectedCategory,
            ]}
          >
            <Text style={controlPanelStyles.categoryText}>
              {category.charAt(0).toUpperCase() +
                category.slice(1).replace(/_/g, " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const controlPanelStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  batteryIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  batteryText: {
    fontSize: 14,
    color: "#2c3e50",
    marginLeft: 8,
  },
  radiusText: {
    fontSize: 14,
    color: "#2c3e50",
  },
  refreshButton: {
    backgroundColor: "#ecf0f1",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  refreshText: {
    color: "#3498db",
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  categoriesContainer: {
    paddingBottom: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#3498db",
  },
  selectedCategory: {
    backgroundColor: "#3498db",
  },
  categoryText: {
    color: "#2c3e50",
  },
});

export default ControlPanel;
