import React from "react";
import { View, Text, StyleSheet } from "react-native";

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

type Props = {
  weather: WeatherData | null;
};

const WeatherCard: React.FC<Props> = ({ weather }) => {
  if (!weather) return null;

  const { current, hourly } = weather;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Current Weather</Text>
      <Text style={styles.temp}>{current.temperature_2m}°C</Text>
      <Text style={styles.info}>Wind: {current.wind_speed_10m} km/h</Text>
      <Text style={styles.info}>Precipitation: {current.precipitation} mm</Text>
      <Text style={styles.title}>Hourly Forecast</Text>
      {hourly.temperature_2m.slice(0, 5).map((temp, index) => (
        <Text key={index} style={styles.hourlyTemp}>
          {index + 1}h: {temp}°C
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ecf0f1",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  temp: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3498db",
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  hourlyTemp: {
    fontSize: 14,
    color: "#2c3e50",
    marginBottom: 4,
  },
});

export default WeatherCard;
