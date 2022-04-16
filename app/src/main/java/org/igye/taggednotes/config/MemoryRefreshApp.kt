package org.igye.taggednotes.config

import android.app.Application
import org.igye.taggednotes.LoggerImpl

class MemoryRefreshApp: Application() {
    private val log = LoggerImpl("MemoryRefreshApp")
    val appContainer by lazy { AppContainer(context = applicationContext) }

    override fun onTerminate() {
        log.debug("Terminating.")
        appContainer.repositoryManager.close()
        super.onTerminate()
    }
}