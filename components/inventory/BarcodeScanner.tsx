
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, TextInput, Alert } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

// ─── Web Scanner using getUserMedia + BarcodeDetector / manual entry ────────

const WebBarcodeScanner: React.FC<BarcodeScannerProps> = ({ visible, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [hasBarcodeAPI, setHasBarcodeAPI] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanned, setScanned] = useState(false);
  const lastScannedRef = useRef('');

  useEffect(() => {
    if (!visible) return;
    setScanned(false);
    setCameraError('');
    setManualBarcode('');
    lastScannedRef.current = '';

    // Check for BarcodeDetector API
    const hasBD = typeof (window as any).BarcodeDetector !== 'undefined';
    setHasBarcodeAPI(hasBD);

    if (!hasBD) return; // no camera scanning, manual entry only

    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        startDetection();
      } catch (err: any) {
        if (!cancelled) setCameraError(err.message || 'Could not access camera');
      }
    };

    const startDetection = () => {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'qr_code', 'data_matrix'],
      });

      const detect = async () => {
        if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
          if (!cancelled) animFrameRef.current = requestAnimationFrame(detect);
          return;
        }
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0 && !cancelled) {
            const data = barcodes[0].rawValue;
            if (data && data !== lastScannedRef.current) {
              lastScannedRef.current = data;
              setScanned(true);
              onScan(data);
              // cooldown
              setTimeout(() => { if (!cancelled) setScanned(false); }, 1500);
            }
          }
        } catch (_) { /* detection failed this frame, keep trying */ }
        if (!cancelled) animFrameRef.current = requestAnimationFrame(detect);
      };

      animFrameRef.current = requestAnimationFrame(detect);
    };

    startCamera();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [visible, onScan]);

  const handleManualSubmit = () => {
    const code = manualBarcode.trim();
    if (!code) return;
    onScan(code);
    setManualBarcode('');
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.scannerContainer}>
        {hasBarcodeAPI && !cameraError ? (
          <>
            {/* Camera feed */}
            <video
              ref={videoRef as any}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                objectFit: 'cover', background: '#000',
              } as any}
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef as any} style={{ display: 'none' } as any} />

            {/* Header */}
            <View style={styles.scannerHeader}>
              <TouchableOpacity style={styles.scannerCloseBtn} onPress={onClose}>
                <Icon name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Scan Barcode</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Viewfinder */}
            <View style={styles.viewfinder}>
              <View style={styles.viewfinderFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.viewfinderHint}>
                {scanned ? 'Scanned! Processing...' : 'Point camera at barcode'}
              </Text>
            </View>

            {/* Manual entry fallback at bottom */}
            <View style={styles.manualEntryBar}>
              <TextInput
                style={styles.manualInput}
                placeholder="Or type barcode manually..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={manualBarcode}
                onChangeText={setManualBarcode}
                onSubmitEditing={handleManualSubmit}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.manualSubmitBtn} onPress={handleManualSubmit}>
                <Icon name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.scannerFooter}>
              <TouchableOpacity style={styles.cancelScanButton} onPress={onClose}>
                <Text style={styles.cancelScanText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* No BarcodeDetector or camera error — manual entry mode */
          <View style={styles.manualOnlyContainer}>
            <View style={styles.manualOnlyContent}>
              <Icon name="barcode-outline" size={48} color={colors.primary} />
              <Text style={styles.manualOnlyTitle}>Enter Barcode</Text>
              {cameraError ? (
                <Text style={styles.manualOnlySubtext}>
                  Camera unavailable: {cameraError}
                </Text>
              ) : (
                <Text style={styles.manualOnlySubtext}>
                  Your browser doesn't support camera barcode detection.{'\n'}
                  Type or paste the barcode number below.
                </Text>
              )}
              <View style={styles.manualOnlyInputRow}>
                <TextInput
                  style={styles.manualOnlyInput}
                  placeholder="Enter barcode number"
                  placeholderTextColor={colors.textSecondary}
                  value={manualBarcode}
                  onChangeText={setManualBarcode}
                  onSubmitEditing={handleManualSubmit}
                  autoFocus
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.manualOnlySubmitBtn, !manualBarcode.trim() && { opacity: 0.5 }]}
                  onPress={handleManualSubmit}
                  disabled={!manualBarcode.trim()}
                >
                  <Text style={styles.manualOnlySubmitText}>Add</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

// ─── Native Scanner using expo-camera ───────────────────────────────────────

let CameraView: any = null;
let useCameraPermissions: any = null;

if (Platform.OS !== 'web') {
  try {
    const expoCam = require('expo-camera');
    CameraView = expoCam.CameraView;
    useCameraPermissions = expoCam.useCameraPermissions;
  } catch (_) { /* expo-camera not available */ }
}

const NativeBarcodeScanner: React.FC<BarcodeScannerProps> = ({ visible, onClose, onScan }) => {
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [null, () => {}];
  const [scanned, setScanned] = useState(false);
  const lastScannedRef = useRef<string>('');
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      lastScannedRef.current = '';
    }
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, [visible]);

  const handleBarCodeScanned = useCallback(({ data }: { type: string; data: string }) => {
    if (scanned || data === lastScannedRef.current) return;

    setScanned(true);
    lastScannedRef.current = data;
    onScan(data);

    cooldownRef.current = setTimeout(() => {
      setScanned(false);
    }, 1500);
  }, [scanned, onScan]);

  if (!visible) return null;

  if (!CameraView) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.permissionContent}>
            <Text style={styles.permissionText}>Camera not available on this device.</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.permissionContent}>
            <Text style={styles.permissionText}>Requesting camera permission...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.permissionContent}>
            <Icon name="camera-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              We need camera access to scan item barcodes.
            </Text>
            <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
              <Text style={styles.grantButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13', 'ean8', 'upc_a', 'upc_e',
              'code128', 'code39', 'code93',
              'itf14', 'codabar', 'qr', 'datamatrix',
            ],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        <View style={styles.scannerHeader}>
          <TouchableOpacity style={styles.scannerCloseBtn} onPress={onClose}>
            <Icon name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Scan Barcode</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.viewfinder}>
          <View style={styles.viewfinderFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.viewfinderHint}>
            {scanned ? 'Scanned! Processing...' : 'Point camera at barcode'}
          </Text>
        </View>

        <View style={styles.scannerFooter}>
          <TouchableOpacity style={styles.cancelScanButton} onPress={onClose}>
            <Text style={styles.cancelScanText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main export: picks web vs native ───────────────────────────────────────

const BarcodeScanner: React.FC<BarcodeScannerProps> = (props) => {
  if (Platform.OS === 'web') {
    return <WebBarcodeScanner {...props} />;
  }
  return <NativeBarcodeScanner {...props} />;
};

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  scannerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: typography.sizes.lg,
    fontWeight: '700',
  },
  viewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderFrame: {
    width: 260,
    height: 160,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: '#FFFFFF',
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: '#FFFFFF',
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: '#FFFFFF',
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: '#FFFFFF',
  },
  viewfinderHint: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    marginTop: spacing.lg,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scannerFooter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    alignItems: 'center',
  },
  cancelScanButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cancelScanText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
  // Manual entry bar (overlaid on camera view)
  manualEntryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  manualInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  manualSubmitBtn: {
    padding: spacing.sm,
  },
  // Manual-only mode (no camera)
  manualOnlyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualOnlyContent: {
    width: '85%',
    maxWidth: 380,
    alignItems: 'center',
  },
  manualOnlyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  manualOnlySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  manualOnlyInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.lg,
  },
  manualOnlyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  manualOnlySubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualOnlySubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.sizes.sm,
  },
  // Permission styles
  permissionContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  permissionText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  grantButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginBottom: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  closeButtonText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
});

export default BarcodeScanner;
