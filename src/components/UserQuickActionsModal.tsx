import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Portal, Modal as PaperModal, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
    visible: boolean;
    onClose?: () => void;
    onDismiss?: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
    userId?: string;
    userName?: string;
    onNavigateToProfile?: () => void;
    onSendMessage?: () => void;
    onBlock?: () => void;
};

export default function UserQuickActionsModal({
    visible,
    onClose,
    onDismiss,
    onDelete,
    onEdit,
    userId,
    userName,
    onNavigateToProfile,
    onSendMessage,
    onBlock
}: Props) {
    const handleClose = () => {
        if (onDismiss) onDismiss();
        if (onClose) onClose();
    };

    // Eğer userId varsa, yeni stil kullan (Profil görüntüleme)
    if (userId) {
        return (
            <Portal>
                <PaperModal visible={visible} onDismiss={handleClose} contentContainerStyle={styles.paperModal}>
                    <Text style={styles.modalTitle}>{userName || 'Kullanıcı'}</Text>
                    <Divider style={styles.divider} />

                    {onNavigateToProfile && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => { onNavigateToProfile(); handleClose(); }}>
                            <MaterialCommunityIcons name="account" size={24} color="#6200ee" />
                            <Text style={styles.actionButtonText}>Profili Görüntüle</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                        </TouchableOpacity>
                    )}

                    {onSendMessage && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => { onSendMessage(); handleClose(); }}>
                            <MaterialCommunityIcons name="message-text" size={24} color="#6200ee" />
                            <Text style={styles.actionButtonText}>Mesaj Gönder</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                        </TouchableOpacity>
                    )}

                    {onBlock && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => { onBlock(); handleClose(); }}>
                            <MaterialCommunityIcons name="block-helper" size={24} color="#F44336" />
                            <Text style={[styles.actionButtonText, { color: '#F44336' }]}>Engelle</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                        </TouchableOpacity>
                    )}

                    <Button mode="outlined" onPress={handleClose} style={styles.closeButton}>
                        Kapat
                    </Button>
                </PaperModal>
            </Portal>
        );
    }

    // Eski stil (onEdit/onDelete varsa)
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.backdrop}>
                <View style={styles.container}>
                    <Text style={styles.title}>Hızlı İşlemler</Text>
                    {onEdit && (
                        <TouchableOpacity style={styles.button} onPress={onEdit}>
                            <Text style={styles.buttonText}>Düzenle</Text>
                        </TouchableOpacity>
                    )}
                    {onDelete && (
                        <TouchableOpacity style={styles.button} onPress={onDelete}>
                            <Text style={styles.buttonText}>Sil</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.button} onPress={handleClose}>
                        <Text style={styles.buttonText}>Kapat</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    button: {
        width: '100%',
        paddingVertical: 10,
        marginTop: 8,
        backgroundColor: '#1976d2',
        borderRadius: 4,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    paperModal: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    divider: {
        marginBottom: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#f5f5f5',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
        flex: 1,
    },
    closeButton: {
        marginTop: 8,
        borderRadius: 8,
    },
});
