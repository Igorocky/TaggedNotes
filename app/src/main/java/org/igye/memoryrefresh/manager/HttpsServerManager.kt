package org.igye.memoryrefresh.manager

import android.content.Context
import android.content.Intent
import org.igye.memoryrefresh.ErrorCode
import org.igye.memoryrefresh.common.BeMethod
import org.igye.memoryrefresh.common.Utils
import org.igye.memoryrefresh.dto.common.BeErr
import org.igye.memoryrefresh.dto.common.BeRespose
import org.igye.memoryrefresh.dto.common.HttpServerSettings
import org.igye.memoryrefresh.dto.common.HttpServerState
import java.util.concurrent.atomic.AtomicReference

class HttpsServerManager(
    private val appContext: Context,
    private val javascriptInterface: List<Any>,
    private val settingsManager: SettingsManager,
) {
    private val self = this
    private val httpsServer: AtomicReference<HttpsServer> = AtomicReference(null)

    @BeMethod(restrictAccessViaHttps = true)
    fun getHttpServerState(): BeRespose<HttpServerState> {
        val settings = settingsManager.getHttpServerSettings()
        return BeRespose(data = HttpServerState(
            isRunning = httpsServer.get() != null,
            url = "https://${Utils.getIpAddress()}:${settings.port}",
            settings = settings
        ))
    }

    @BeMethod(restrictAccessViaHttps = true)
    fun saveHttpServerSettings(httpServerSettings: HttpServerSettings): BeRespose<HttpServerState> {
        settingsManager.saveHttpServerSettings(httpServerSettings)
        return getHttpServerState()
    }

    @BeMethod(restrictAccessViaHttps = true)
    fun startHttpServer(): BeRespose<HttpServerState> {
        val keyStorFile = settingsManager.getKeyStorFile()
        return if (keyStorFile == null) {
            BeRespose(err = BeErr(code = ErrorCode.KEY_STORE_IS_NOT_DEFINED.code, msg = "Key store is not defined."))
        } else if (httpsServer.get() != null) {
            BeRespose(err = BeErr(code = ErrorCode.HTTP_SERVER_IS_ALREADY_RUNNING.code, msg = "Http server is already running."))
        } else {
            Intent(appContext, HttpsServerService::class.java).also { intent ->
                appContext.startService(intent)
            }
            val serverSettings = settingsManager.getHttpServerSettings()
            try {
                httpsServer.set(HttpsServer(
                    appContext = appContext,
                    keyStoreFile = keyStorFile,
                    keyStorePassword = serverSettings.keyStorePassword,
                    keyAlias = serverSettings.keyAlias,
                    privateKeyPassword = serverSettings.privateKeyPassword,
                    portNum = serverSettings.port,
                    serverPassword = serverSettings.serverPassword,
                    javascriptInterface = javascriptInterface + self,
                ))
            } catch (ex: Exception) {
                stopHttpServer()
                return BeRespose(err = BeErr(code = ErrorCode.ERROR_WHILE_STARTING_HTTP_SERVER.code, msg = ex.message?:ex.javaClass.name))
            }
            getHttpServerState()
        }
    }

    @BeMethod(restrictAccessViaHttps = true)
    fun stopHttpServer(): BeRespose<HttpServerState> {
        httpsServer.get()?.stop()
        httpsServer.set(null)
        Intent(appContext, HttpsServerService::class.java).also { intent ->
            appContext.stopService(intent)
        }
        return getHttpServerState()
    }
}