import { useState } from "react";
import { View, StyleSheet } from "react-native";

type Section<T> = {
  title: string;
  data: T[];
};

type Props<T> = {
  sections: Section<T>[];
  ListHeader: React.ComponentType<{
    section: Section<T>;
    expanded: boolean;
    onToggle: () => void;
  }>;
  ListItem: React.ComponentType<{
    item: T;
    section: Section<T>;
  }>;
};

export function DropdownList<T>({ sections, ListHeader, ListItem }: Props<T>) {
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  const handleToggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <View>
      {sections.map((section) => {
        const isExpanded = !!expandedSections[section.title];
        return (
          <View key={section.title} style={styles.sectionContainer}>
            <ListHeader
              section={section}
              expanded={isExpanded}
              onToggle={() => handleToggleSection(section.title)}
            />
            {isExpanded &&
              section.data.map((item, index) => (
                <ListItem
                  key={index.toString()}
                  item={item}
                  section={section}
                />
              ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 12,
  },
});
