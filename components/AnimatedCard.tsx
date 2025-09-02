
import React, { memo } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { 
  FadeIn,
  SlideInUp
} from 'react-native-reanimated';
import { commonStyles } from '../styles/commonStyles';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  index?: number;
}

const AnimatedCard = memo(({ children, style, delay = 0, index = 0 }: AnimatedCardProps) => {
  console.log('AnimatedCard rendered');
  
  const animationDelay = delay + (index * 50); // Reduced delay for faster animations

  return (
    <Animated.View
      entering={SlideInUp.delay(animationDelay).duration(300).springify()} // Faster animation
      style={[commonStyles.card, style]}
    >
      {children}
    </Animated.View>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

export default AnimatedCard;
