import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  weather: {
    current?: {
      wind_speed_10m: number;
      precipitation: number;
    };
  };
  batteryLevel: number;
};

const Alerts: React.FC<Props> = ({ weather, batteryLevel }) => {
  const alerts = [];

  if (weather?.current) {
    if (weather.current.wind_speed_10m > 15) {
      alerts.push("High wind conditions");
    }
    if (weather.current.precipitation > 5) {
      alerts.push("Heavy precipitation");
    }
  }

  if (batteryLevel < 0.3) {
    alerts.push("Low device battery");
  }

  if (!alerts.length) return null;

  return (
    <View style={styles.container} accessibilityLabel="Alerts">
      <MaterialIcons name="warning" size={24} color="#e74c3c" />
      <View style={styles.alertsList}>
        {alerts.map((alert, index) => (
          <Text key={index} style={styles.alertText}>
            • {alert}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8d7da",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  alertsList: {
    marginLeft: 12,
  },
  alertText: {
    color: "#721c24",
    fontSize: 14,
  },
});

export default Alerts;
