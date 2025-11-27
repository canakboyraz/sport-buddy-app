import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Card, Text, Chip, Avatar, Button, useTheme, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SportSession } from '../types';
import { format } from 'date-fns';
import { Circle, Svg } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { getSkillLevelLabel } from '../utils/skillLevelUtils';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '../utils/dateLocale';

type Props = {
    item: SportSession;
    sportIcon: string;
    distance: string | null;
    onPress: () => void;
    onLocationPress: (lat?: number, long?: number) => void;
};

const SessionCard = ({ item, sportIcon, distance, onPress, onLocationPress }: Props) => {
    const theme = useTheme();
    const { t } = useTranslation();
    const sessionDate = new Date(item.session_date);
    const participantsCount = item.participants?.filter(p => p.status === 'approved').length || 0;
    const isFull = participantsCount >= item.max_participants;
    const progress = item.max_participants > 0 ? participantsCount / item.max_participants : 0;

    // Circular progress component
    const CircularProgress = () => {
        const size = 20;
        const strokeWidth = 2;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const strokeDashoffset = circumference - (progress * circumference);

        return (
            <View style={styles.circularProgressContainer}>
                <Svg width={size} height={size} style={styles.circularProgressSvg}>
                    {/* Background circle */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={theme.colors.surfaceVariant}
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Progress circle */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={isFull ? '#F44336' : theme.colors.primary}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                </Svg>
                <View style={styles.circularProgressText}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurface, fontSize: 7, fontWeight: 'bold' }}>
                        {participantsCount}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={onPress} mode="elevated">
            {/* Gradient Header with Sport Icon */}
            <LinearGradient
                colors={
                    theme.dark
                        ? [theme.colors.primaryContainer, theme.colors.secondaryContainer]
                        : ['#6200ee', '#9c27b0']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientHeader}
            >
                <View style={styles.headerContent}>
                    <Avatar.Icon
                        size={30}
                        icon={sportIcon}
                        style={styles.sportIconAvatar}
                        color="white"
                    />
                    <View style={styles.headerTextContainer}>
                        <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <View style={styles.sportBadge}>
                            <Text variant="labelSmall" style={styles.sportBadgeText}>
                                {item.sport?.name}
                            </Text>
                            <View style={styles.skillBadge}>
                                <MaterialCommunityIcons name="medal" size={8} color="white" />
                                <Text variant="labelSmall" style={styles.skillBadgeText}>
                                    {getSkillLevelLabel(item.skill_level)}
                                </Text>
                            </View>
                        </View>
                    </View>
                    {distance && (
                        <View style={styles.distanceBadge}>
                            <MaterialCommunityIcons name="map-marker" size={10} color="white" />
                            <Text variant="labelSmall" style={styles.distanceBadgeText}>
                                {distance}
                            </Text>
                        </View>
                    )}
                </View>
            </LinearGradient>

            {/* Card Content */}
            <Card.Content style={styles.cardContent}>
                {/* Date and Time Row */}
                <View style={styles.infoRow}>
                    <View style={[styles.infoBox, { backgroundColor: theme.colors.primaryContainer + '40' }]}>
                        <MaterialCommunityIcons name="calendar-clock" size={12} color={theme.colors.primary} />
                        <Text variant="bodySmall" style={[styles.infoBoxText, { color: theme.colors.onSurface }]}>
                            {format(sessionDate, 'd MMM', { locale: getDateLocale() })}
                        </Text>
                        <Text variant="labelSmall" style={[styles.infoBoxSubtext, { color: theme.colors.onSurfaceVariant }]}>
                            {format(sessionDate, 'HH:mm', { locale: getDateLocale() })}
                        </Text>
                    </View>

                    {/* Participants Info */}
                    <View style={[styles.infoBox, { backgroundColor: isFull ? '#F4433640' : theme.colors.secondaryContainer + '40' }]}>
                        <CircularProgress />
                        <Text variant="bodySmall" style={[styles.infoBoxText, { color: theme.colors.onSurface, marginTop: 1 }]}>
                            {participantsCount}/{item.max_participants}
                        </Text>
                        <Text variant="labelSmall" style={[styles.infoBoxSubtext, { color: theme.colors.onSurfaceVariant }]}>
                            {isFull ? t('session.full').toUpperCase() : t('session.participants')}
                        </Text>
                    </View>
                </View>

                {/* Location Row */}
                <TouchableOpacity
                    style={[styles.locationRow, { backgroundColor: theme.colors.surfaceVariant }]}
                    onPress={() => onLocationPress(item.latitude, item.longitude)}
                >
                    <MaterialCommunityIcons name="map-marker-outline" size={12} color={theme.colors.primary} />
                    <Text
                        variant="bodySmall"
                        style={[styles.locationText, { color: theme.colors.onSurface }]}
                        numberOfLines={1}
                    >
                        {item.location || t('session.noLocationSelected')}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={12} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
            </Card.Content>

            {/* Action Buttons */}
            <Card.Actions style={styles.cardActions}>
                <Button
                    mode="outlined"
                    onPress={onPress}
                    style={styles.detailsButton}
                    labelStyle={styles.detailsButtonLabel}
                    icon="information-outline"
                >
                    {t('session.details')}
                </Button>
                <Button
                    mode="contained"
                    onPress={onPress}
                    disabled={isFull}
                    style={[styles.joinButton, isFull && styles.joinButtonDisabled]}
                    labelStyle={styles.joinButtonLabel}
                    icon={isFull ? 'close-circle' : 'account-plus'}
                >
                    {isFull ? t('session.full') : t('session.join')}
                </Button>
            </Card.Actions>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 8,
        borderRadius: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    gradientHeader: {
        padding: 8,
        paddingBottom: 6,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sportIconAvatar: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 6,
    },
    cardTitle: {
        color: 'white',
        fontWeight: '700',
        marginBottom: 1,
        fontSize: 14,
    },
    sportBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    sportBadgeText: {
        color: 'white',
        opacity: 0.9,
        fontWeight: '500',
        fontSize: 10,
    },
    skillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 4,
        gap: 2,
    },
    skillBadgeText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 8,
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 2,
    },
    distanceBadgeText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 9,
    },
    cardContent: {
        paddingTop: 6,
        paddingBottom: 3,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 4,
    },
    infoBox: {
        flex: 1,
        padding: 4,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoBoxText: {
        fontWeight: '600',
        marginTop: 1,
        textAlign: 'center',
        fontSize: 11,
    },
    infoBoxSubtext: {
        marginTop: 0,
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 10,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        borderRadius: 6,
        gap: 4,
    },
    locationText: {
        flex: 1,
        fontWeight: '500',
        fontSize: 11,
    },
    cardActions: {
        paddingHorizontal: 6,
        paddingBottom: 6,
        paddingTop: 1,
        gap: 4,
    },
    detailsButton: {
        flex: 1,
        borderRadius: 6,
        borderWidth: 1.5,
    },
    detailsButtonLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
    joinButton: {
        flex: 1,
        borderRadius: 6,
    },
    joinButtonDisabled: {
        backgroundColor: '#9E9E9E',
    },
    joinButtonLabel: {
        fontSize: 11,
        fontWeight: '700',
    },
    circularProgressContainer: {
        width: 20,
        height: 20,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    circularProgressSvg: {
        position: 'absolute',
    },
    circularProgressText: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SessionCard;
