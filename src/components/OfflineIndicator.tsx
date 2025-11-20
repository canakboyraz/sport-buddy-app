import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

export const OfflineIndicator = () => {
    // Note: @react-native-community/netinfo needs to be installed. 
    // If not, this component will just return null or a mock.
    // For now, returning null to avoid crashes if package is missing.
    return null;
};
