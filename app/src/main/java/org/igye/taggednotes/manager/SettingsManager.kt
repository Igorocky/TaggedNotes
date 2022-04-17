package org.igye.taggednotes.manager

import android.content.Context
import org.igye.taggednotes.common.Utils
import org.igye.taggednotes.dto.common.AppSettings
import org.igye.taggednotes.dto.common.HttpServerSettings
import java.io.File
import java.io.FileOutputStream

class SettingsManager(
    private val context: Context,
) {
    private val applicationSettingsFileName = "settings.json"
    private val settingsFile = File(context.filesDir, applicationSettingsFileName)

    @Synchronized
    fun getApplicationSettings(): AppSettings {
        if (!settingsFile.exists()) {
            saveApplicationSettings(AppSettings(httpServerSettings = HttpServerSettings()))
        }
        return Utils.strToObj(settingsFile.readText(), AppSettings::class.java)
    }

    @Synchronized
    fun saveApplicationSettings(appSettings: AppSettings) {
        FileOutputStream(settingsFile).use {
            it.write(Utils.objToStr(appSettings).toByteArray())
        }
    }

    fun getKeyStorFile(): File? {
        var result: File? = null
        val keystoreDir = Utils.getKeystoreDir(context)
        for (keyStor in keystoreDir.listFiles()) {
            if (result == null) {
                result = keyStor
            } else {
                keyStor.delete()
            }
        }
        return result
    }

    fun getHttpServerSettings(): HttpServerSettings {
        var keyStorFile = getKeyStorFile()
        if (keyStorFile == null) {
            createDefaultKeyStorFile()
            keyStorFile = getKeyStorFile()
        }
        val appSettings = getApplicationSettings()
        return appSettings.httpServerSettings.copy(keyStoreName = keyStorFile?.name?:"")
    }

    fun saveHttpServerSettings(httpServerSettings: HttpServerSettings): HttpServerSettings {
        val appSettings = getApplicationSettings()
        saveApplicationSettings(appSettings.copy(httpServerSettings = httpServerSettings))
        return getHttpServerSettings()
    }

    private fun createDefaultKeyStorFile(): File {
        val keystoreDir = Utils.getKeystoreDir(context)
        val defaultCertFileName = "default-cert-ktor.bks"
        val result = File(keystoreDir, defaultCertFileName)
        context.getAssets().open("ktor-cert/$defaultCertFileName").use { defaultCert ->
            FileOutputStream(result).use { out ->
                defaultCert.copyTo(out)
            }
        }
        saveHttpServerSettings(
            getHttpServerSettings()
                .copy(
                    keyAlias = "ktor",
                    keyStorePassword = "dflt-pwd-nQV!?;4&5yZ?8}.",
                    privateKeyPassword = "dflt-pwd-nQV!?;4&5yZ?8}.",
                )
        )
        return result
    }
}