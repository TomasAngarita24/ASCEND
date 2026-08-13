import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from './AnimatedPressable';
import { colors, spacing } from '../theme';

export type MainTab = 'home' | 'workouts' | 'profile';

interface TabConfig {
  id: MainTab;
  icon: string;
  label: string;
}

interface BottomTabBarProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

const tabs: TabConfig[] = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'workouts', icon: 'fitness-center', label: 'Rutinas' },
  { id: 'profile', icon: 'account-circle', label: 'Perfil' },
];

export default function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps): React.JSX.Element {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <View key={tab.id} style={styles.tabSlot}>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isActive }}
                onPress={() => onTabChange(tab.id)}
                style={styles.tab}
              >
                <MaterialIcons
                  color={isActive ? colors.accent : colors.muted}
                  name={tab.icon}
                  size={26}
                />
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  numberOfLines={1}
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
              </AnimatedPressable>
            </View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    minHeight: 64,
    paddingHorizontal: spacing(1),
    paddingTop: spacing(1),
  },
  safeArea: {
    backgroundColor: colors.surface,
  },
  tab: {
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: spacing(0.75),
  },
  tabSlot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
});
