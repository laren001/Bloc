import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Same layout as the Bloc brick mark — running-bond pattern, 4 rows.
// Each brick falls into place with a staggered delay, holds, fades out, loops.
const BRICKS = [
  { x: 0,   y: 0,   w: 16, h: 7, dim: false, delay: 0 },
  { x: 18,  y: 0,   w: 16, h: 7, dim: false, delay: 60 },

  { x: -8,  y: 9,   w: 16, h: 7, dim: false, delay: 140 },
  { x: 10,  y: 9,   w: 16, h: 7, dim: false, delay: 200 },
  { x: 28,  y: 9,   w: 8,  h: 7, dim: false, delay: 260 },

  { x: 0,   y: 18,  w: 16, h: 7, dim: false, delay: 340 },
  { x: 18,  y: 18,  w: 16, h: 7, dim: false, delay: 400 },

  { x: -8,  y: 27,  w: 16, h: 7, dim: true,  delay: 480 },
  { x: 10,  y: 27,  w: 16, h: 7, dim: false, delay: 540 },
  { x: 28,  y: 27,  w: 8,  h: 7, dim: true,  delay: 600 },
];

const CYCLE_DURATION = 2200;
const RISE_DURATION = 500;
const FADE_DURATION = 300;

function Brick({ config, color }) {
  // Two separate values: one purely for the bounce-in position (allowed to
  // overshoot past 1, since Easing.back needs that room), and one purely
  // for opacity (rises 0→1 linearly alongside it, then holds, then fades
  // 1→0). Keeping them separate means the position overshoot can never
  // leak into — and flicker — the opacity.
  const rise = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const hold = CYCLE_DURATION - config.delay - RISE_DURATION - FADE_DURATION;

    const cycle = Animated.sequence([
      Animated.delay(config.delay),
      Animated.parallel([
        Animated.timing(rise, {
          toValue: 1,
          duration: RISE_DURATION,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: RISE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(Math.max(hold, 0)),
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_DURATION,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      // Snap rise back to 0 instantly (opacity is already 0 here, so this
      // is invisible) so the next loop's bounce-in starts from the same
      // place every time.
      Animated.timing(rise, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]);

    const loop = Animated.loop(cycle, { resetBeforeIteration: true });
    loop.start();

    return () => loop.stop();
  }, []);

  const translateY = rise.interpolate({
    inputRange: [0, 1],
    outputRange: [-9, 0],
    extrapolate: 'extend', // let the back-easing overshoot slightly past 0
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: config.x,
        top: config.y,
        width: config.w,
        height: config.h,
        borderRadius: 1,
        backgroundColor: color,
        opacity: config.dim ? Animated.multiply(fade, 0.55) : fade,
        transform: [{ translateY }],
      }}
    />
  );
}

export default function LoadingBricks({ inline }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, inline ? styles.inline : { backgroundColor: theme.background }]}>
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
  inline: { flex: 0, paddingVertical: 40 },
  brickField: { width: 36, height: 34, position: 'relative' },
});