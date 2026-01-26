
import React, { memo } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { commonStyles } from '../styles/commonStyles';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  index?: number;
  elevated?: boolean;
}

const AnimatedCard = memo(({ 
  children, 
  style, 
  delay = 0, 
  index = 0,
  elevated = false 
}: AnimatedCardProps) => {
  const animationDelay = delay + (index * 30);

  return (
    <Animated.View
      entering={FadeInUp.delay(animationDelay).duration(400).springify()}
      style={[elevated ? commonStyles.cardElevated : commonStyles.card, style]}
    >
      {children}
    </Animated.View>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

export default AnimatedCard;
