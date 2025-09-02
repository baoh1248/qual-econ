
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../styles/commonStyles';

interface ProgressRingProps {
  progress: number; // 0-100
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
  
  // Create a simple circular progress using multiple small segments
  const segments = 40; // Number of segments around the circle
  const activeSegments = Math.round((progress / 100) * segments);
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background circle */}
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
      
      {/* Progress segments */}
      <View style={[styles.segmentsContainer, { width: size, height: size }]}>
        {Array.from({ length: segments }).map((_, index) => {
          const angle = (360 / segments) * index;
          const isActive = index < activeSegments;
          const segmentSize = strokeWidth * 0.8;
          const radius = (size - strokeWidth) / 2;
          
          // Calculate position for each segment
          const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
          const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
          
          return (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  width: segmentSize,
                  height: segmentSize,
                  borderRadius: segmentSize / 2,
                  backgroundColor: isActive ? color : 'transparent',
                  position: 'absolute',
                  left: size / 2 + x - segmentSize / 2,
                  top: size / 2 + y - segmentSize / 2,
                }
              ]}
            />
          );
        })}
      </View>
      
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.progressText, { color }]}>
            {text || `${Math.round(progress)}%`}
          </Text>
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
