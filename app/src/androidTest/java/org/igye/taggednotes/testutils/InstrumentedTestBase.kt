package org.igye.taggednotes.testutils

import android.database.Cursor
import android.database.Cursor.*
import androidx.test.platform.app.InstrumentationRegistry
import org.igye.taggednotes.ErrorCode.ERROR_IN_TEST
import org.igye.taggednotes.common.TaggedNotesException
import org.igye.taggednotes.common.Utils
import org.igye.taggednotes.database.ObjectType
import org.igye.taggednotes.database.Repository
import org.igye.taggednotes.database.Table
import org.igye.taggednotes.database.tables.*
import org.igye.taggednotes.dto.domain.CardSchedule
import org.igye.taggednotes.dto.domain.Note
import org.igye.taggednotes.manager.DataManager
import org.igye.taggednotes.manager.RepositoryManager
import org.igye.taggednotes.manager.SettingsManager
import org.junit.Assert.*
import org.junit.Before
import java.util.*
import kotlin.random.Random

open class InstrumentedTestBase {
    protected val appContext = InstrumentationRegistry.getInstrumentation().targetContext
    protected val testClock = TestClock(1000)
    protected val TR_TP = ObjectType.TRANSLATION.intValue
    protected val NC_TP = ObjectType.NOTE.intValue

    protected lateinit var dm: DataManager
    protected lateinit var sm: SettingsManager
    protected lateinit var repo: Repository
    protected lateinit var c: ObjectsTable
    protected lateinit var tg: TagsTable
    protected lateinit var ctg: ObjectToTagTable
    protected lateinit var t: TranslationCardsTable
    protected lateinit var n: NotesTable
    protected lateinit var s: CardsScheduleTable
    protected lateinit var l: TranslationCardsLogTable

    @Before
    fun init() {
        sm = SettingsManager(appContext)
        dm = createInmemoryDataManager()
        repo = dm.getRepo()

        c = repo.objs
        s = repo.cardsSchedule
        tg = repo.tags
        ctg = repo.objToTag
        t = repo.translationCards
        l = repo.translationCardsLog
        n = repo.notes

        testClock.setFixedTime(Random.nextLong(from = 1000L, until = 10_000L))
    }

    protected fun insert(repo: Repository, table: Table, rows: List<List<Pair<String,Any?>>>) {
        val query = """
            insert into $table (${rows[0].map { it.first }.joinToString(separator = ", ")}) 
            values ${rows.map {row -> row.map { "?" }.joinToString(prefix = "(", separator = ",", postfix = ")")}.joinToString(separator = ",") }
            """.trimIndent()
        val insertStmt = repo.writableDatabase.compileStatement(query)
        var idx = 0
        rows.flatMap { it }.map { it.second }.forEach {
            when (it) {
                is Long -> insertStmt.bindLong(++idx, it)
                is Int -> insertStmt.bindLong(++idx, it.toLong())
                is Double -> insertStmt.bindDouble(++idx, it)
                is String -> insertStmt.bindString(++idx, it)
            }
        }
        insertStmt.executeUpdateDelete()
    }

    protected fun assertTableContent(
        repo: Repository, table: Table, exactMatch: Boolean = true, matchColumn: String = "", expectedRows: List<List<Pair<String,Any?>>>
    ) {
        val allData = readAllDataFrom(repo, table)
        if (exactMatch) {
            assertTrue(expectedRows.size == allData.size)
        } else {
            assertTrue(expectedRows.size <= allData.size)
        }
        for (expectedRow in expectedRows) {
            if (count(expected = expectedRow, allData = allData) != 1) {
                fail("Data comparison failed for table $table\n" + formatActualAndExpected(allData = allData, expected = expectedRow, matchColumn = matchColumn))
            }
        }
    }

    protected fun createTag(tagId:Long, name:String): Long {
        insert(repo = repo, table = tg, rows = listOf(
            listOf(tg.id to tagId, tg.createdAt to 1000, tg.name to name),
        ))
        return tagId
    }

    protected fun createTranslateCard(card: Note): Long {
        insert(repo = repo, table = c, rows = listOf(
            listOf(c.id to card.id, c.createdAt to card.createdAt, c.type to TR_TP, c.paused to if (card.paused) 1 else 0, c.lastCheckedAt to card.timeSinceLastCheck.toLong())
        ))
        insert(repo = repo, table = s, rows = listOf(
            listOf(
                s.cardId to card.id,
                s.updatedAt to card.schedule.updatedAt,
                s.origDelay to card.schedule.origDelay,
                s.delay to card.schedule.delay,
                s.randomFactor to 1.0,
                s.nextAccessInMillis to card.schedule.nextAccessInMillis,
                s.nextAccessAt to card.schedule.nextAccessAt
            )
        ))
        insert(repo = repo, table = t, rows = listOf(
            listOf(t.cardId to card.id, t.textToTranslate to card.textToTranslate, t.translation to card.translation)
        ))
        card.tagIds.forEach {
            insert(repo = repo, table = ctg, rows = listOf(
                listOf(ctg.objId to card.id, ctg.tagId to it)
            ))
        }
        return card.id
    }

    protected fun createCard(cardId: Long, tagIds: List<Long> = emptyList(), mapper: (Note) -> Note = {it}): Note {
        val createdAt = 1000 * cardId + 1
        val updatedAt = 10000 * cardId + 1
        val currTime = testClock.currentMillis()
        val lastCheckedAt = currTime - Utils.MILLIS_IN_HOUR*cardId - Utils.MILLIS_IN_MINUTE*cardId
        val nextAccessInMillis = Utils.MILLIS_IN_HOUR * cardId + 2
        val modifiedCard = mapper(
            Note(
                id = cardId,
                createdAt = createdAt,
                paused = false,
                tagIds = tagIds,
                schedule = CardSchedule(
                    cardId = cardId,
                    updatedAt = updatedAt,
                    origDelay = "delay-" + cardId,
                    delay = "delay-" + cardId,
                    nextAccessInMillis = nextAccessInMillis,
                    nextAccessAt = updatedAt + nextAccessInMillis,
                ),
                timeSinceLastCheck = lastCheckedAt.toString(),
                activatesIn = "",
                overdue = 0.0,
                textToTranslate = "textToTranslate-" + cardId,
                translation = "translation-" + cardId,
            )
        )
        val finalNextAccessAt = (currTime - modifiedCard.overdue * modifiedCard.schedule.nextAccessInMillis).toLong()
        val finalCard = modifiedCard.copy(
            schedule = modifiedCard.schedule.copy(
                nextAccessAt = finalNextAccessAt,
            ),
            activatesIn = Utils.millisToDurationStr(finalNextAccessAt - currTime)
        )
        createTranslateCard(finalCard)
        return finalCard.copy(
            timeSinceLastCheck = Utils.millisToDurationStr(currTime - lastCheckedAt)
        )
    }

    protected fun assertTranslateCardsEqual(
        expected: Note,
        actual: Note,
        skipTimeSinceLastCheck: Boolean = false,
        skipOverdue: Boolean = false,
    ) {
        assertEquals("doesn't match: id", expected.id, actual.id)
        assertEquals("doesn't match: createdAt", expected.createdAt, actual.createdAt)
        assertEquals("doesn't match: paused", expected.paused, actual.paused)

        assertEquals("doesn't match: tagIds", expected.tagIds, actual.tagIds)

        assertEquals("doesn't match: schedule.cardId", expected.schedule.cardId, actual.schedule.cardId)
        assertEquals("doesn't match: schedule.updatedAt", expected.schedule.updatedAt, actual.schedule.updatedAt)
        assertEquals("doesn't match: schedule.delay", expected.schedule.delay, actual.schedule.delay)
        assertEquals("doesn't match: schedule.nextAccessInMillis", expected.schedule.nextAccessInMillis, actual.schedule.nextAccessInMillis)
        assertEquals("doesn't match: schedule.nextAccessAt", expected.schedule.nextAccessAt, actual.schedule.nextAccessAt)

        if (!skipTimeSinceLastCheck) {
            assertEquals("doesn't match: timeSinceLastCheck", expected.timeSinceLastCheck, actual.timeSinceLastCheck)
        }
        if (!skipOverdue) {
            assertEquals("doesn't match: overdue", expected.overdue, actual.overdue, 0.0001)
        }
        assertEquals("doesn't match: textToTranslate", expected.textToTranslate, actual.textToTranslate)
        assertEquals("doesn't match: translation", expected.translation, actual.translation)
    }

    private fun formatActualAndExpected(allData: List<Map<String, Any?>>, expected: List<Pair<String, Any?>>, matchColumn: String): String {
        val filteredData = if (matchColumn.length > 0) {
            filter(allData = allData, columnName = matchColumn, expectedValue = expected.toMap()[matchColumn])
        } else {
            allData
        }
        val sortOrder: Map<String, Int> = expected.asSequence().mapIndexed{ i, (name,_) -> name to i}.toMap()
        return "Expected:\n" +
                format(expected) + "\n" +
                "Actual:\n" +
                filteredData.asSequence().map { format(sort(it.toList(), sortOrder)) }.joinToString(separator = "\n")

    }

    private fun sort(values: List<Pair<String, Any?>>, sortOrder: Map<String, Int>): List<Pair<String, Any?>> {
        return values.sortedBy { sortOrder[it.first]?:Int.MAX_VALUE }
    }

    private fun format(values: List<Pair<String, Any?>>): String {
        return values.asSequence().map { "${it.first}=${it.second}" }.joinToString(separator = ", ")
    }

    private fun filter(allData: List<Map<String, Any?>>, columnName: String, expectedValue: Any?): List<Map<String, Any?>> {
        return allData.asSequence()
            .filter { it.containsKey(columnName) && Objects.equals(it[columnName], expectedValue) }
            .toList()
    }

    private fun count(expected: List<Pair<String,Any?>>, allData: List<Map<String, Any?>>): Int {
        var result = 0
        for (actualRow in allData) {
            if (compare(expected = expected, actual = actualRow)) {
                result++
            }
        }
        return result
    }

    private fun compare(expected: List<Pair<String,Any?>>, actual: Map<String,Any?>): Boolean {
        for (expectedColumn in expected) {
            val columnName = expectedColumn.first
            if (!actual.containsKey(columnName)) {
                return false
            }
            if (!equals(expectedColumn.second, actual[columnName])) {
                return false
            }
        }
        return true
    }

    private fun equals(expected: Any?, actual: Any?): Boolean {
        if (expected is Integer && actual is Long) {
            return expected.toLong() == actual
        } else {
            return Objects.equals(expected, actual)
        }
    }

    protected fun readAllDataFrom(repo: Repository, table: Table): List<Map<String,Any?>> {
        val result = ArrayList<Map<String,Any?>>()
        repo.readableDatabase.rawQuery("select * from $table", null).use { cursor ->
            if (cursor.moveToFirst()) {
                while (!cursor.isAfterLast) {
                    result.add(readRow(cursor))
                    cursor.moveToNext()
                }
            }
        }
        return result
    }

    private fun readRow(cursor: Cursor): Map<String,Any?> {
        val res = HashMap<String,Any?>()
        for (i in 0 until cursor.columnCount) {
            res[cursor.getColumnName(i)] = readColumnValue(cursor, i)
        }
        return res
    }

    private fun readColumnValue(cursor: Cursor, columnIndex: Int): Any? {
        val type = cursor.getType(columnIndex)
        return when(type) {
            FIELD_TYPE_NULL -> null
            FIELD_TYPE_INTEGER -> cursor.getLong(columnIndex)
            FIELD_TYPE_STRING -> cursor.getString(columnIndex)
            FIELD_TYPE_FLOAT -> cursor.getDouble(columnIndex)
            else -> throw TaggedNotesException(msg = "Unexpected type '$type'", errCode = ERROR_IN_TEST)
        }
    }

    protected fun createInmemoryDataManager(): DataManager {
        val cards = ObjectsTable(clock = testClock)
        val cardsSchedule = CardsScheduleTable(clock = testClock, cards = cards)
        val translationCards = TranslationCardsTable(clock = testClock, cards = cards)
        val translationCardsLog = TranslationCardsLogTable(clock = testClock)
        val tags = TagsTable(clock = testClock)
        val cardToTag = ObjectToTagTable(clock = testClock, objects = cards, tags = tags)
        val noteCards = NotesTable(clock = testClock, objs = cards)

        return DataManager(
            clock = testClock,
            repositoryManager = RepositoryManager(
                context = appContext,
                clock = testClock,
                repositoryProvider = {
                    Repository(
                        context = appContext,
                        dbName = null,
                        objs = cards,
                        cardsSchedule = cardsSchedule,
                        translationCards = translationCards,
                        translationCardsLog = translationCardsLog,
                        tags = tags,
                        objToTag = cardToTag,
                        notes = noteCards
                    )
                }
            ),
            settingsManager = sm
        )
    }

    private fun inc(counts: MutableMap<Int, Int>, key: Int) {
        var cnt = counts[key]
        if (cnt == null) {
            cnt = 0
        }
        counts[key] = cnt + 1
    }
}