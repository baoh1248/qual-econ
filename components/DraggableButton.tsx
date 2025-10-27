
import React, { useCallback, useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Dimensions, Platform, View } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
} from 'react-native-reanimated';
import Icon from './Icon';
import { commonStyles } from '../styles/commonStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DraggableButtonProps {
  icon: string;
  iconSize?: number;
  iconColor?: string;
  backgroundColor: string;
  size?: number;
  initialX?: number;
  initialY?: number;
  onPress: () => void;
}

type ContextType = {
  startX: number;
  startY: number;
};

// Web/Desktop version using mouse events
const DraggableButtonWeb: React.FC<DraggableButtonProps> = ({
  icon,
  iconSize = 28,
  iconColor = '#FFFFFF',
  backgroundColor,
  size = 56,
  initialX = SCREEN_WIDTH - 80,
  initialY = SCREEN_HEIGHT - 180,
  onPress,
}) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0, buttonX: 0, buttonY: 0 });

  const handleMouseDown = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX || e.touches?.[0]?.clientX || 0,
      y: e.clientY || e.touches?.[0]?.clientY || 0,
      buttonX: position.x,
      buttonY: position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e: any) => {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    
    const deltaX = clientX - dragStartPos.current.x;
    const deltaY = clientY - dragStartPos.current.y;
    
    const newX = dragStartPos.current.buttonX + deltaX;
    const newY = dragStartPos.current.buttonY + deltaY;
    
    // Constrain to screen bounds with padding
    const minX = 10;
    const maxX = SCREEN_WIDTH - size - 10;
    const minY = 10;
    const maxY = SCREEN_HEIGHT - size - 10;
    
    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    });
  }, [isDragging, size]);

  const handleMouseUp = useCallback((e: any) => {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.clientX || e.changedTouches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.changedTouches?.[0]?.clientY || 0;
    
    const deltaX = Math.abs(clientX - dragStartPos.current.x);
    const deltaY = Math.abs(clientY - dragStartPos.current.y);
    
    setIsDragging(false);
    
    // If moved less than 5 pixels, treat as click
    if (deltaX < 5 && deltaY < 5) {
      onPress();
    }
  }, [isDragging, onPress]);

  // Add event listeners for mouse move and up on mount
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
      const handleGlobalMouseUp = (e: MouseEvent) => handleMouseUp(e);
      const handleGlobalTouchMove = (e: TouchEvent) => handleMouseMove(e);
      const handleGlobalTouchEnd = (e: TouchEvent) => handleMouseUp(e);

      if (isDragging) {
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        document.addEventListener('touchmove', handleGlobalTouchMove);
        document.addEventListener('touchend', handleGlobalTouchEnd);
      }

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <View
      style={[
        styles.container,
        {
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
        } as any,
      ]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleMouseDown}
      onResponderMove={handleMouseMove}
      onResponderRelease={handleMouseUp}
    >
      <View
        style={[
          styles.button,
          {
            backgroundColor,
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: isDragging ? 0.8 : 1,
          },
        ]}
      >
        <Icon name={icon} size={iconSize} color={iconColor} />
      </View>
    </View>
  );
};

// Mobile version using gesture handler
const DraggableButtonMobile: React.FC<DraggableButtonProps> = ({
  icon,
  iconSize = 28,
  iconColor = '#FFFFFF',
  backgroundColor,
  size = 56,
  initialX = SCREEN_WIDTH - 80,
  initialY = SCREEN_HEIGHT - 180,
  onPress,
}) => {
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const isDragging = useSharedValue(false);
  const opacity = useSharedValue(1);

  const handlePress = useCallback(() => {
    if (!isDragging.value) {
      onPress();
    }
  }, [onPress, isDragging]);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, ContextType>({
    onStart: (_, context) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
      isDragging.value = false;
      opacity.value = withSpring(0.8);
    },
    onActive: (event, context) => {
      // Mark as dragging if moved more than 5 pixels
      if (Math.abs(event.translationX) > 5 || Math.abs(event.translationY) > 5) {
        isDragging.value = true;
      }

      // Calculate new position
      const newX = context.startX + event.translationX;
      const newY = context.startY + event.translationY;

      // Constrain to screen bounds with padding
      const minX = 10;
      const maxX = SCREEN_WIDTH - size - 10;
      const minY = 10;
      const maxY = SCREEN_HEIGHT - size - 10;

      translateX.value = Math.max(minX, Math.min(maxX, newX));
      translateY.value = Math.max(minY, Math.min(maxY, newY));
    },
    onEnd: () => {
      opacity.value = withSpring(1);
      // Add a slight delay before allowing press again
      setTimeout(() => {
        isDragging.value = false;
      }, 100);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor,
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Icon name={icon} size={iconSize} color={iconColor} />
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

// Main component that chooses the right implementation
const DraggableButton: React.FC<DraggableButtonProps> = (props) => {
  // Use web version for web platform, mobile version for native
  if (Platform.OS === 'web') {
    return <DraggableButtonWeb {...props} />;
  }
  return <DraggableButtonMobile {...props} />;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 9999,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    ...commonStyles.shadowLg,
  },
});

export default DraggableButton;
