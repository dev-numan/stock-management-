import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class WhatsappShareModule extends NativeModule<{}> {
  shareImageToContact(
    contentUri: string,
    jid: string,
    text: string,
    packageName: string,
    mimeType: string
  ): Promise<void>;
}

// Optional: returns null on platforms where the native module isn't built (iOS, web).
export default requireOptionalNativeModule<WhatsappShareModule>('WhatsappShare');
