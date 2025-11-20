import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
};

export default function UserQuickActionsModal({ visible, onClose, onDelete, onEdit }: Props) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
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
                    <TouchableOpacity style={styles.button} onPress={onClose}>
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
});
