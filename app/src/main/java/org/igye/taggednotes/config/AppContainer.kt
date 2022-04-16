package org.igye.taggednotes.config

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import org.igye.taggednotes.database.Repository
import org.igye.taggednotes.database.tables.*
import org.igye.taggednotes.manager.DataManager
import org.igye.taggednotes.manager.HttpsServerManager
import org.igye.taggednotes.manager.RepositoryManager
import org.igye.taggednotes.manager.SettingsManager
import org.igye.taggednotes.ui.MainActivityViewModel
import org.igye.taggednotes.ui.SharedFileReceiverViewModel
import java.time.Clock
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class AppContainer(
    val context: Context,
    val dbName: String = "memory-refresh-db"
) {
    companion object {
        private val appVersion = "1.0"
        val appVersionUrlPrefix = "v$appVersion"
    }

    val clock = Clock.systemDefaultZone()
    val beThreadPool: ExecutorService = Executors.newFixedThreadPool(4)

    val cards = CardsTable(clock = clock)
    val cardsSchedule = CardsScheduleTable(clock = clock, cards = cards)
    val translationCards = TranslationCardsTable(clock = clock, cards = cards)
    val translationCardsLog = TranslationCardsLogTable(clock = clock)
    val tags = TagsTable(clock = clock)
    val cardToTag = CardToTagTable(clock = clock, cards = cards, tags = tags)
    val noteCards = NoteCardsTable(clock = clock, cards = cards)

    val repositoryManager = RepositoryManager(context = context, clock = clock, repositoryProvider = {createNewRepo()})
    val settingsManager = SettingsManager(context = context)
    val dataManager = DataManager(clock = clock, repositoryManager = repositoryManager, settingsManager = settingsManager)
    val httpsServerManager = HttpsServerManager(
        appContext = context,
        settingsManager = settingsManager,
        javascriptInterface = listOf(dataManager, repositoryManager, settingsManager)
    )

    fun createNewRepo(): Repository {
        return Repository(
            context = context,
            dbName = dbName,
            cards = cards,
            cardsSchedule = cardsSchedule,
            translationCards = translationCards,
            translationCardsLog = translationCardsLog,
            tags = tags,
            cardToTag = cardToTag,
            noteCards = noteCards
        )
    }

    val viewModelFactory: ViewModelProvider.Factory = object : ViewModelProvider.Factory {
        override fun <T : ViewModel?> create(modelClass: Class<T>): T {
            return if (modelClass.isAssignableFrom(MainActivityViewModel::class.java)) {
                createMainActivityViewModel() as T
            } else if (modelClass.isAssignableFrom(SharedFileReceiverViewModel::class.java)) {
                createSharedFileReceiverViewModel() as T
            } else {
                null as T
            }
        }
    }

    private fun createMainActivityViewModel(): MainActivityViewModel {
        return MainActivityViewModel(
            appContext = context,
            settingsManager = settingsManager,
            dataManager = dataManager,
            repositoryManager = repositoryManager,
            httpsServerManager = httpsServerManager,
            beThreadPool = beThreadPool
        )
    }

    private fun createSharedFileReceiverViewModel(): SharedFileReceiverViewModel {
        return SharedFileReceiverViewModel(
            appContext = context,
            beThreadPool = beThreadPool
        )
    }
}