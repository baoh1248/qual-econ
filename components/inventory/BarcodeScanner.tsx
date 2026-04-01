
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, TextInput, Animated } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  /** Feedback message to display after a scan (e.g. "Added 1 Paper Towels"). Pauses scanning while shown. */
  scanFeedback?: string | null;
}

// ─── Web Scanner using Quagga2 for auto-detection ───────────────────────────

const WebBarcodeScanner: React.FC<BarcodeScannerProps> = ({ visible, onClose, onScan, scanFeedback }) => {
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [initializing, setInitializing] = useState(true);
  const pausedRef = useRef(false);
  const quaggaRef = useRef<any>(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  // Pause/resume scanning based on scanFeedback
  useEffect(() => {
    pausedRef.current = !!scanFeedback;
    if (scanFeedback) {
      Animated.timing(feedbackAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(feedbackAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [scanFeedback, feedbackAnim]);

  useEffect(() => {
    if (!visible) return;
    setCameraError('');
    setManualBarcode('');
    setInitializing(true);
    pausedRef.current = false;

    let cancelled = false;

    const initQuagga = async () => {
      try {
        const Quagga = (await import('@ericblade/quagga2')).default;
        quaggaRef.current = Quagga;
        if (cancelled) return;

        // Wait for the DOM ref to be available
        await new Promise<void>(resolve => {
          const check = () => {
            if (scannerRef.current || cancelled) return resolve();
            setTimeout(check, 50);
          };
          check();
        });
        if (cancelled || !scannerRef.current) return;

        Quagga.init({
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: scannerRef.current,
            constraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          decoder: {
            readers: [
              'ean_reader',
              'ean_8_reader',
              'upc_reader',
              'upc_e_reader',
              'code_128_reader',
              'code_39_reader',
              'code_93_reader',
            ],
          },
          locate: true,
          frequency: 10,
        }, (err: any) => {
          if (cancelled) return;
          if (err) {
            setCameraError(err.message || 'Could not start camera');
            setInitializing(false);
            return;
          }
          Quagga.start();
          setInitializing(false);
        });

        Quagga.onDetected((result: any) => {
          if (cancelled || pausedRef.current) return;
          const code = result?.codeResult?.code;
          if (code) {
            onScan(code);
          }
        });
      } catch (err: any) {
        if (!cancelled) {
          setCameraError(err.message || 'Failed to initialize scanner');
          setInitializing(false);
        }
      }
    };

    initQuagga();

    return () => {
      cancelled = true;
      try {
        if (quaggaRef.current) {
          quaggaRef.current.offDetected();
          quaggaRef.current.stop();
        }
      } catch (_) { /* ignore cleanup errors */ }
    };
  }, [visible, onScan]);

  const handleManualSubmit = () => {
    const code = manualBarcode.trim();
    if (!code) return;
    onScan(code);
    setManualBarcode('');
  };

  if (!visible) return null;

  // Camera error — show manual-only mode
  if (cameraError) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
        <View style={styles.manualOnlyContainer}>
          <View style={styles.manualOnlyContent}>
            <Icon name="barcode-outline" size={48} color={colors.primary} />
            <Text style={styles.manualOnlyTitle}>Enter Barcode</Text>
            <Text style={styles.manualOnlySubtext}>
              Camera unavailable: {cameraError}
            </Text>
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
      </Modal>
    );
  }

  // Camera view with auto-detection
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.scannerContainer}>
        {/* Quagga renders the video + canvas inside this div */}
        <div
          ref={scannerRef as any}
          className="scannerTarget"
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            overflow: 'hidden', background: '#000',
          } as any}
        />

        {/* Style the Quagga video/canvas to fill the container */}
        <style dangerouslySetInnerHTML={{ __html: `
          .scannerTarget video, .scannerTarget canvas {
            position: absolute; top: 0; left: 0;
            width: 100% !important; height: 100% !important;
            object-fit: cover !important;
          }
          .scannerTarget canvas.drawingBuffer {
            display: none;
          }
        `}} />

        {/* Feedback banner — slides down from top */}
        {scanFeedback ? (
          <Animated.View style={[styles.feedbackBanner, { opacity: feedbackAnim }]}>
            <Icon name="checkmark-circle" size={22} color="#FFFFFF" />
            <Text style={styles.feedbackText}>{scanFeedback}</Text>
          </Animated.View>
        ) : null}

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
            {initializing ? 'Starting camera...'
              : scanFeedback ? ''
              : 'Point camera at barcode'}
          </Text>
        </View>

        {/* Manual entry bar — always visible as fallback */}
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

const NativeBarcodeScanner: React.FC<BarcodeScannerProps> = ({ visible, onClose, onScan, scanFeedback }) => {
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [null, () => {}];
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanFeedback) {
      Animated.timing(feedbackAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(feedbackAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [scanFeedback, feedbackAnim]);

  const handleBarCodeScanned = useCallback(({ data }: { type: string; data: string }) => {
    if (scanFeedback) return; // Paused while feedback is showing
    onScan(data);
  }, [scanFeedback, onScan]);

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
          onBarcodeScanned={scanFeedback ? undefined : handleBarCodeScanned}
        />

        {/* Feedback banner */}
        {scanFeedback ? (
          <Animated.View style={[styles.feedbackBanner, { opacity: feedbackAnim }]}>
            <Icon name="checkmark-circle" size={22} color="#FFFFFF" />
            <Text style={styles.feedbackText}>{scanFeedback}</Text>
          </Animated.View>
        ) : null}

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
            {scanFeedback ? '' : 'Point camera at barcode'}
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
  feedbackBanner: {
    position: 'absolute',
    top: 100,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(34, 139, 34, 0.92)',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: '700',
    flex: 1,
  },
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
