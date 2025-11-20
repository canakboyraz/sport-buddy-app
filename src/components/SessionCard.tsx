import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, Avatar, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SportSession } from '../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type Props = {
    item: SportSession;
    sportIcon: string;
    distance: string | null;
    onPress: () => void;
    onLocationPress: (lat?: number, long?: number) => void;
};

const SessionCard = ({ item, sportIcon, distance, onPress, onLocationPress }: Props) => {
    const theme = useTheme();
    const sessionDate = new Date(item.session_date);
    const participantsCount = item.participants?.filter(p => p.status === 'approved').length || 0;
    const isFull = participantsCount >= item.max_participants;

    return (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={onPress} mode="elevated">
            <Card.Content>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Avatar.Icon
                            size={36}
                            icon={sportIcon}
                            style={{ backgroundColor: theme.colors.primaryContainer }}
                            color={theme.colors.primary}
                        />
                        <View style={styles.headerText}>
                            <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>{item.title}</Text>
                            <Text variant="bodySmall" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                                {item.sport?.name} • {item.skill_level}
                            </Text>
                        </View>
                    </View>
                    {distance && (
                        <Chip icon="map-marker" mode="outlined" compact textStyle={{ fontSize: 10 }}>
                            {distance}
                        </Chip>
                    )}
                </View>

                <View style={styles.details}>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="calendar" size={13} color={theme.colors.onSurfaceVariant} />
                        <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
                            {format(sessionDate, 'd MMMM yyyy, HH:mm', { locale: tr })}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={13} color={theme.colors.onSurfaceVariant} />
                        <TouchableOpacity onPress={() => onLocationPress(item.latitude, item.longitude)}>
                            <Text style={[styles.detailText, styles.link, { color: theme.colors.primary }]}>
                                {item.location || 'Konum seçilmedi'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="account-group" size={13} color={theme.colors.onSurfaceVariant} />
                        <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
                            {participantsCount} / {item.max_participants} Katılımcı
                        </Text>
                        {isFull && <Chip style={styles.fullChip} textStyle={{ color: 'white', fontSize: 10 }}>DOLU</Chip>}
                    </View>
                </View>
            </Card.Content>
            <Card.Actions>
                <Button mode="text" onPress={onPress}>Detayları Gör</Button>
                <Button
                    mode="contained"
                    onPress={onPress}
                    disabled={isFull}
                    style={{ borderRadius: 20 }}
                >
                    {isFull ? 'Dolu' : 'Katıl'}
                </Button>
            </Card.Actions>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 10,
        borderRadius: 10,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerText: {
        marginLeft: 8,
        flex: 1,
    },
    title: {
        fontWeight: 'bold',
    },
    subtitle: {
        textTransform: 'capitalize',
    },
    details: {
        marginTop: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
    },
    detailText: {
        marginLeft: 5,
        fontSize: 12,
    },
    link: {
        textDecorationLine: 'underline',
    },
    fullChip: {
        marginLeft: 8,
        backgroundColor: '#F44336',
        height: 24,
    },
});

export default SessionCard;
