package org.igye.taggednotes.config

import android.app.Application
import org.igye.taggednotes.LoggerImpl

class TaggedNotesApp: Application() {
    private val log = LoggerImpl("TaggedNotesApp")
    val appContainer by lazy { AppContainer(context = applicationContext) }

    override fun onTerminate() {
        log.debug("Terminating.")
        appContainer.repositoryManager.close()
        super.onTerminate()
    }
}