import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

let cachedDataUri = null;

export async function getInvoiceLogoDataUri() {
  if (cachedDataUri) return cachedDataUri;

  const asset = Asset.fromModule(require('../../assets/logo.png'));
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }

  const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  cachedDataUri = `data:image/png;base64,${base64}`;
  return cachedDataUri;
}
