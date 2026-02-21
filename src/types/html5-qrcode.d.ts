
declare module 'html5-qrcode' {
    export class Html5Qrcode {
        constructor(elementId: string, verbose?: boolean);
        start(
            cameraIdOrConfig: string | { facingMode: string },
            configuration: {
                fps: number;
                qrbox?: { width: number; height: number } | number;
                aspectRatio?: number;
            },
            qrCodeSuccessCallback: (decodedText: string, decodedResult: unknown) => void,
            qrCodeErrorCallback?: (errorMessage: string, error: unknown) => void
        ): Promise<void>;
        stop(): Promise<void>;
        clear(): void;
        scanFile(imageFile: File, showImage?: boolean): Promise<string>;
        getState(): number;
        isScanning: boolean;
    }

    export class Html5QrcodeScanner {
        constructor(elementId: string, config: Record<string, unknown>, verbose: boolean);
        render(onScanSuccess: (decodedText: string, decodedResult: unknown) => void, onScanFailure?: (error: unknown) => void): void;
        clear(): Promise<void>;
    }
}
