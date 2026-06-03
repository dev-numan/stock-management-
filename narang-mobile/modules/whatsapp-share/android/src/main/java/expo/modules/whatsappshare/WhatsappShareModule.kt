package expo.modules.whatsappshare

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WhatsappNotInstalledException :
  CodedException("ERR_WHATSAPP_NOT_INSTALLED", "Target WhatsApp package is not installed", null)

class WhatsappShareModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WhatsappShare")

    // Open a specific contact's WhatsApp chat with an image attached.
    // contentUri must be a content:// URI (e.g. from FileSystem.getContentUriAsync).
    // jid is "<countrycode><number>@s.whatsapp.net". packageName is com.whatsapp or com.whatsapp.w4b.
    AsyncFunction("shareImageToContact") {
        contentUri: String, jid: String, text: String, packageName: String, mimeType: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val uri = Uri.parse(contentUri)

      // Best-effort explicit grant so the target app can read our FileProvider URI.
      try {
        context.grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
      } catch (_: Exception) {
        // The intent flag below is the primary mechanism; ignore grant failures.
      }

      val intent = Intent(Intent.ACTION_SEND).apply {
        type = mimeType
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra("jid", jid)
        if (text.isNotEmpty()) putExtra(Intent.EXTRA_TEXT, text)
        setPackage(packageName)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      try {
        val activity = appContext.currentActivity
        if (activity != null) {
          activity.startActivity(intent)
        } else {
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          context.startActivity(intent)
        }
      } catch (e: ActivityNotFoundException) {
        throw WhatsappNotInstalledException()
      }
    }
  }
}
