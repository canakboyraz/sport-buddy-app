import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon as any} size={80} color="#E0E0E0" />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}

      {actionLabel && onAction && (
        <Button
          mode="contained"
          onPress={onAction}
          style={styles.primaryButton}
        >
          {actionLabel}
        </Button>
      )}

      {secondaryActionLabel && onSecondaryAction && (
        <Button
          mode="outlined"
          onPress={onSecondaryAction}
          style={styles.secondaryButton}
        >
          {secondaryActionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    marginTop: 4,
    paddingHorizontal: 16,
  },
});
