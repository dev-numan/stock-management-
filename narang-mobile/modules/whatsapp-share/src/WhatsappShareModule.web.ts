import { registerWebModule, NativeModule } from 'expo';

// WhatsappShareModule is not available on the web platform.
class WhatsappShareModule extends NativeModule<{}> {}

export default registerWebModule(WhatsappShareModule, 'WhatsappShareModule');
