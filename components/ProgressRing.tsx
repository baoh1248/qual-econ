
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography } from '../styles/commonStyles';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showText?: boolean;
  text?: string;
}

export default function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  color = colors.primary,
  backgroundColor = colors.border,
  showText = true,
  text
}: ProgressRingProps) {
  console.log('ProgressRing rendered with progress:', progress);
  
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: false,
    }).start();
    
    const rotationAnimation = Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    
    rotationAnimation.start();
    
    return () => {
      rotationAnimation.stop();
    };
  }, [progress, animatedProgress, rotationAnim]);
  
  const segments = 60;
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.backgroundCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: backgroundColor,
        }
      ]} />
      
      <Animated.View 
        style={[
          styles.segmentsContainer, 
          { 
            width: size, 
            height: size,
            transform: [{
              rotate: rotationAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              })
            }]
          }
        ]}
      >
        {Array.from({ length: segments }).map((_, index) => {
          const angle = (360 / segments) * index;
          const segmentSize = strokeWidth * 0.9;
          const radius = (size - strokeWidth) / 2;
          
          const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
          const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.segment,
                {
                  width: segmentSize,
                  height: segmentSize,
                  borderRadius: segmentSize / 2,
                  position: 'absolute',
                  left: size / 2 + x - segmentSize / 2,
                  top: size / 2 + y - segmentSize / 2,
                  opacity: animatedProgress.interpolate({
                    inputRange: [0, (index / segments) * 100, ((index + 1) / segments) * 100, 100],
                    outputRange: [0, 0, 1, 1],
                    extrapolate: 'clamp',
                  }),
                  backgroundColor: color,
                  transform: [{
                    scale: animatedProgress.interpolate({
                      inputRange: [0, (index / segments) * 100, ((index + 1) / segments) * 100, 100],
                      outputRange: [0.5, 0.5, 1, 1],
                      extrapolate: 'clamp',
                    })
                  }]
                }
              ]}
            />
          );
        })}
      </Animated.View>
      
      {showText && (
        <View style={styles.textContainer}>
          <Animated.Text 
            style={[
              styles.progressText, 
              { 
                color,
                opacity: animatedProgress.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0.5, 1],
                })
              }
            ]}
          >
            {text || `${Math.round(progress)}%`}
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundCircle: {
    position: 'absolute',
  },
  segmentsContainer: {
    position: 'absolute',
  },
  segment: {
    // Individual segment styles are set inline
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  progressText: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});
