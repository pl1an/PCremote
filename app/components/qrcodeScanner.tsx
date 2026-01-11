import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { Text, View, Button } from 'react-native';


interface QrcodeScannerProps {
    onScanned?: (data: string) => void;
}

export default function QrcodeScanner({ onScanned }: QrcodeScannerProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (!permission?.granted) requestPermission();
    }, [permission]);

    if (!permission) return <View />;
    return (
        <CameraView
        style={{ flex: 1}}
        barcodeScannerSettings={{
            barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={({ data }) => {
            if (scanned) return;
            setScanned(true);
            console.log("QR data:", data);
            if (onScanned) onScanned(data);
        }}
        />
    );
}
