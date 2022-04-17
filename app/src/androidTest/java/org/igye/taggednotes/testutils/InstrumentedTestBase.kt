package org.igye.taggednotes.testutils

import android.database.Cursor
import android.database.Cursor.*
import androidx.test.platform.app.InstrumentationRegistry
import org.igye.taggednotes.ErrorCode.ERROR_IN_TEST
import org.igye.taggednotes.common.TaggedNotesException
import org.igye.taggednotes.database.ObjectType
import org.igye.taggednotes.database.Repository
import org.igye.taggednotes.database.Table
import org.igye.taggednotes.database.tables.*
import org.igye.taggednotes.dto.domain.Note
import org.igye.taggednotes.manager.DataManager
import org.igye.taggednotes.manager.RepositoryManager
import org.igye.taggednotes.manager.SettingsManager
import org.junit.Assert.*
import org.junit.Before
import java.util.*
import kotlin.random.Random
import kotlin.random.nextLong

open class InstrumentedTestBase {
    protected val appContext = InstrumentationRegistry.getInstrumentation().targetContext
    protected val testClock = TestClock(Random.nextLong(LongRange(1000, 10_000)))
    protected val N_TP = ObjectType.NOTE.intValue

    protected lateinit var dm: DataManager
    protected lateinit var sm: SettingsManager
    protected lateinit var repo: Repository
    protected lateinit var o: ObjectsTable
    protected lateinit var tg: TagsTable
    protected lateinit var otg: ObjectToTagTable
    protected lateinit var n: NotesTable

    @Before
    fun init() {
        sm = SettingsManager(appContext)
        dm = createInmemoryDataManager()
        repo = dm.getRepo()

        o = repo.objs
        tg = repo.tags
        otg = repo.objToTag
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

    protected fun createNote(note: Note): Long {
        insert(repo = repo, table = o, rows = listOf(
            listOf(o.id to note.id, o.createdAt to note.createdAt, o.type to N_TP)
        ))
        insert(repo = repo, table = n, rows = listOf(
            listOf(n.id to note.id, n.text to note.text)
        ))
        note.tagIds.forEach {
            insert(repo = repo, table = otg, rows = listOf(
                listOf(otg.objId to note.id, otg.tagId to it)
            ))
        }
        return note.id
    }

    protected fun createNote(noteId: Long, tagIds: List<Long> = emptyList(), mapper: (Note) -> Note = { it }): Note {
        val createdAt = 1000 * noteId + 1
        val modifiedNote = mapper(
            Note(
                id = noteId,
                createdAt = createdAt,
                tagIds = tagIds,
                text = "note-text-" + noteId,
            )
        )
        createNote(modifiedNote)
        return modifiedNote
    }

    protected fun assertNotesEqual(
        expected: Note,
        actual: Note,
    ) {
        assertEquals("doesn't match: id", expected.id, actual.id)
        assertEquals("doesn't match: createdAt", expected.createdAt, actual.createdAt)
        assertEquals("doesn't match: tagIds", expected.tagIds, actual.tagIds)
        assertEquals("doesn't match: text", expected.text, actual.text)
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
        val tags = TagsTable(clock = testClock)
        val cardToTag = ObjectToTagTable(objects = cards, tags = tags)
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