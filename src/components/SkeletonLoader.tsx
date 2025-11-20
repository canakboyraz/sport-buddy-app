import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';

export const SkeletonList = ({ count, type }: { count: number, type: string }) => {
    return (
        <View>
            {Array.from({ length: count }).map((_, index) => (
                <Card key={index} style={styles.card}>
                    <Card.Content>
                        <View style={styles.skeletonHeader} />
                        <View style={styles.skeletonLine} />
                        <View style={styles.skeletonLine} />
                    </Card.Content>
                </Card>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
        marginHorizontal: 16,
        opacity: 0.5,
    },
    skeletonHeader: {
        height: 40,
        width: '40%',
        backgroundColor: '#e0e0e0',
        marginBottom: 10,
        borderRadius: 4,
    },
    skeletonLine: {
        height: 16,
        width: '80%',
        backgroundColor: '#e0e0e0',
        marginBottom: 8,
        borderRadius: 4,
    },
});
