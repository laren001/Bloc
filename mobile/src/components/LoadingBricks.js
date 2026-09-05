import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Same layout as the Bloc brick mark — running-bond pattern, 4 rows.
// Each brick falls into place with a staggered delay, holds, fades out, loops.
const BRICKS = [
  { x: 0,   y: 0,   w: 65, h: 30, dim: false, delay: 0 },
  { x: 75,  y: 0,   w: 65, h: 30, dim: false, delay: 60 },

  { x: -32, y: 37,  w: 65, h: 30, dim: false, delay: 140 },
  { x: 42,  y: 37,  w: 65, h: 30, dim: false, delay: 200 },
  { x: 117, y: 37,  w: 32, h: 30, dim: false, delay: 260 },

  { x: 0,   y: 75,  w: 65, h: 30, dim: false, delay: 340 },
  { x: 75,  y: 75,  w: 65, h: 30, dim: false, delay: 400 },

  { x: -32, y: 112, w: 65, h: 30, dim: true,  delay: 480 },
  { x: 42,  y: 112, w: 65, h: 30, dim: false, delay: 540 },
  { x: 117, y: 112, w: 32, h: 30, dim: true,  delay: 600 },
];

const CYCLE_DURATION = 2200;

function Brick({ config, color }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      progress.setValue(0);
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
        Animated.delay(CYCLE_DURATION - config.delay - 500 - 300),
        Animated.timing(progress, {
          toValue: 2,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [-35, 0, 0],
    extrapolate: 'clamp',
  });

  const opacity = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: config.x,
        top: config.y,
        width: config.w,
        height: config.h,
        borderRadius: 5,
        backgroundColor: color,
        opacity: config.dim ? Animated.multiply(opacity, 0.55) : opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

export default function LoadingBricks() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.brickField}>
        {BRICKS.map((b, i) => (
          <Brick key={i} config={b} color={theme.textPrimary} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brickField: { width: 150, height: 145, position: 'relative' },
});
