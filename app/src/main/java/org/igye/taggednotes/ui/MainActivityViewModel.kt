package org.igye.taggednotes.ui

import android.content.Context
import org.igye.taggednotes.manager.DataManager
import org.igye.taggednotes.manager.HttpsServerManager
import org.igye.taggednotes.manager.RepositoryManager
import org.igye.taggednotes.manager.SettingsManager
import java.util.concurrent.ExecutorService

class MainActivityViewModel(
    appContext: Context,
    settingsManager: SettingsManager,
    dataManager: DataManager,
    repositoryManager: RepositoryManager,
    httpsServerManager: HttpsServerManager,
    beThreadPool: ExecutorService,
): WebViewViewModel(
    appContext = appContext,
    javascriptInterface = listOf(dataManager, repositoryManager, httpsServerManager, settingsManager),
    rootReactComponent = "ViewSelector",
    beThreadPool = beThreadPool
)
