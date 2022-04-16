package org.igye.taggednotes.ui

import android.content.Context
import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import org.igye.taggednotes.common.Utils
import java.io.ByteArrayInputStream

class CustomAssetsPathHandler(
    appContext: Context,
    private val rootReactComponent: String = "ViewSelector",
    private val feBeBridge: String,
    private val isInWebview: Boolean,
) : WebViewAssetLoader.PathHandler {
    private val delegate = WebViewAssetLoader.AssetsPathHandler(appContext)
    override fun handle(path: String): WebResourceResponse? {
        val ultimatePath = Utils.extractUltimatePath(path)
        val result = delegate.handle(ultimatePath)
        if (ultimatePath.endsWith("index.html") && result != null) {
            return WebResourceResponse(
                result.mimeType,
                result.encoding,
                ByteArrayInputStream(
                    String(result.data.readBytes(), Charsets.UTF_8)
                        .replaceFirst("js/mock-fe-be-bridge.js", feBeBridge)
                        .replaceFirst(
                            "const ROOT_REACT_COMPONENT = null",
                            "const ROOT_REACT_COMPONENT = $rootReactComponent"
                        )
                        .replaceFirst(
                            "const IS_IN_WEBVIEW = true",
                            "const IS_IN_WEBVIEW = $isInWebview"
                        )
                        .toByteArray()
                )
            )
        } else {
            return result
        }
    }
}