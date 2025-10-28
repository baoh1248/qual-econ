
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../app/integrations/supabase/client';
import uuid from 'react-native-uuid';

const THEME_STORAGE_KEY = '@app_theme_color';

interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => Promise<void>;
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType>({
  themeColor: '#0066FF',
  setThemeColor: async () => {},
  isLoading: true,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeManager = () => {
  const [themeColor, setThemeColorState] = useState<string>('#0066FF');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from storage and Supabase
  const loadTheme = useCallback(async () => {
    try {
      console.log('Loading theme...');
      
      // First, try to load from AsyncStorage for immediate display
      const storedColor = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedColor) {
        console.log('Loaded theme from storage:', storedColor);
        setThemeColorState(storedColor);
      }

      // Then, try to load from Supabase if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('User authenticated, loading theme from Supabase');
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme_color')
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No preferences found, create default
            console.log('No preferences found, creating default');
            const newId = uuid.v4() as string;
            const { error: insertError } = await supabase
              .from('user_preferences')
              .insert({
                id: newId,
                user_id: user.id,
                theme_color: storedColor || '#0066FF',
              });
            
            if (insertError) {
              console.error('Error creating preferences:', insertError);
            }
          } else {
            console.error('Error loading theme from Supabase:', error);
          }
        } else if (data?.theme_color) {
          console.log('Loaded theme from Supabase:', data.theme_color);
          setThemeColorState(data.theme_color);
          await AsyncStorage.setItem(THEME_STORAGE_KEY, data.theme_color);
        }
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save theme to storage and Supabase
  const setThemeColor = useCallback(async (color: string) => {
    try {
      console.log('Setting theme color:', color);
      setThemeColorState(color);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(THEME_STORAGE_KEY, color);

      // Save to Supabase if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('Saving theme to Supabase');
        const { error } = await supabase
          .from('user_preferences')
          .update({ 
            theme_color: color,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error saving theme to Supabase:', error);
        } else {
          console.log('Theme saved to Supabase successfully');
        }
      }
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  return {
    themeColor,
    setThemeColor,
    isLoading,
  };
};
