import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { RangeSlider } from "@/components";
import { DateRangePicker } from "@/components";
import { PrimaryButton, SecondaryButton } from "@/components";

export const FilterPanelScreen: React.FC<{
  onApply: (filters: any) => void;
  onClear: () => void;
}> = ({ onApply, onClear }) => {
  const theme = useTheme();
  const [calories, setCalories] = useState<[number, number]>([0, 3000]);
  const [protein, setProtein] = useState<[number, number]>([0, 200]);
  const [carbs, setCarbs] = useState<[number, number]>([0, 400]);
  const [fat, setFat] = useState<[number, number]>([0, 150]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <RangeSlider
          label="Calories"
          min={0}
          max={5000}
          step={10}
          value={calories}
          onChange={setCalories}
        />
        <RangeSlider
          label="Protein (g)"
          min={0}
          max={300}
          step={1}
          value={protein}
          onChange={setProtein}
        />
        <RangeSlider
          label="Carbs (g)"
          min={0}
          max={500}
          step={1}
          value={carbs}
          onChange={setCarbs}
        />
        <RangeSlider
          label="Fat (g)"
          min={0}
          max={200}
          step={1}
          value={fat}
          onChange={setFat}
        />
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onChangeRange={setDateRange}
        />
      </ScrollView>
      <View>
        <PrimaryButton
          label="Apply filters"
          onPress={() => onApply({ calories, protein, carbs, fat, dateRange })}
        />
        <SecondaryButton label="Clear" onPress={onClear} />
      </View>
    </View>
  );
};
