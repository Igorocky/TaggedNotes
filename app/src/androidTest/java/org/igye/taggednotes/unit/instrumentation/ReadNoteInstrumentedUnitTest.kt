package org.igye.taggednotes.unit.instrumentation

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.igye.taggednotes.dto.common.BeRespose
import org.igye.taggednotes.dto.domain.*
import org.igye.taggednotes.manager.DataManager.*
import org.igye.taggednotes.testutils.InstrumentedTestBase
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.time.temporal.ChronoUnit

@RunWith(AndroidJUnit4::class)
class ReadNoteInstrumentedUnitTest: InstrumentedTestBase() {

    @Test
    fun readNoteById_returns_all_tags_of_the_note() {
        //given
        val tagId1 = dm.createTag(CreateTagArgs("t1")).data!!
        val tagId2 = dm.createTag(CreateTagArgs("t2")).data!!
        val tagId3 = dm.createTag(CreateTagArgs("t3")).data!!
        val cardId = dm.createNote(CreateNoteArgs(
            text = "a", tagIds = setOf(tagId1, tagId3)
        )).data!!

        //when
        val actualNote = dm.readNoteById(ReadNoteByIdArgs(noteId = cardId)).data!!

        //then
        assertEquals(2, actualNote.tagIds.size)
        assertTrue(actualNote.tagIds.contains(tagId1))
        assertTrue(actualNote.tagIds.contains(tagId3))
    }

    @Test
    fun readNoteById_returns_correct_values_for_each_parameter() {
        //given
        val tagId1 = createTag(tagId = 1, name = "t1")
        val tagId2 = createTag(tagId = 2, name = "t2")
        val tagId3 = createTag(tagId = 3, name = "t3")

        val expectedNoteId1 = 1L
        val createTime1 = testClock.currentMillis()
        val lastCheckedAt1 = createTime1 + 12664
        val updatedAt1 = createTime1 + 55332
        val text1 = "snsndfhg73456"

        val expectedNoteId2 = 2L
        val createTime2 = testClock.plus(2, ChronoUnit.HOURS)
        val updatedAt2 = createTime2 + 88565
        val text2 = "dfjksd7253df"

        insert(repo = repo, table = o, rows = listOf(
            listOf(o.id to expectedNoteId1, o.type to N_TP, o.createdAt to createTime1),
            listOf(o.id to expectedNoteId2, o.type to N_TP, o.createdAt to createTime2),
        ))
        insert(repo = repo, table = n, rows = listOf(
            listOf(n.id to expectedNoteId1, n.text to text1),
            listOf(n.id to expectedNoteId2, n.text to text2),
        ))
        insert(repo = repo, table = otg, rows = listOf(
            listOf(otg.objId to expectedNoteId1, otg.tagId to tagId1),
            listOf(otg.objId to expectedNoteId1, otg.tagId to tagId2),
            listOf(otg.objId to expectedNoteId2, otg.tagId to tagId2),
            listOf(otg.objId to expectedNoteId2, otg.tagId to tagId3),
        ))

        //when
        val readTime = testClock.plus(2, ChronoUnit.MINUTES)
        val note1 = dm.readNoteById(ReadNoteByIdArgs(noteId = expectedNoteId1)).data!!
        val note2 = dm.readNoteById(ReadNoteByIdArgs(noteId = expectedNoteId2)).data!!

        //then
        assertEquals(expectedNoteId1, note1.id)
        assertEquals(createTime1, note1.createdAt)
        assertEquals(setOf(tagId1, tagId2), note1.tagIds.toSet())
        assertEquals(text1, note1.text)

        assertEquals(expectedNoteId2, note2.id)
        assertEquals(createTime2, note2.createdAt)
        assertEquals(setOf(tagId3, tagId2), note2.tagIds.toSet())
        assertEquals(text2, note2.text)
    }

    @Test
    fun readNoteById_returns_empty_collection_of_tag_ids_if_note_doesnt_have_tags() {
        //given
        val tagId1 = dm.createTag(CreateTagArgs("t1")).data!!
        val tagId2 = dm.createTag(CreateTagArgs("t2")).data!!
        val tagId3 = dm.createTag(CreateTagArgs("t3")).data!!
        val noteId = dm.createNote(CreateNoteArgs(
            text = "a", tagIds = setOf()
        )).data!!

        //when
        val actualNote = dm.readNoteById(ReadNoteByIdArgs(noteId = noteId)).data!!

        //then
        assertEquals(0, actualNote.tagIds.size)
    }

    @Test
    fun readNoteHistory_when_there_are_few_data_history_records() {
        //given
        val createTime1 = testClock.currentMillis()
        val noteId = dm.createNote(CreateNoteArgs(text = "A")).data!!

        val updateTime5 = testClock.plus(5, ChronoUnit.MINUTES)
        dm.updateNote(UpdateNoteArgs(noteId = noteId, text = "B"))

        val updateTime9 = testClock.plus(9, ChronoUnit.MINUTES)
        dm.updateNote(UpdateNoteArgs(noteId = noteId, text = "C"))

        //when
        val actualHistory = dm.readNoteHistory(ReadNoteHistoryArgs(noteId = noteId)).data!!

        //then
        assertEquals(3, actualHistory.dataHistory.size)

        assertEquals(updateTime9, actualHistory.dataHistory[0].timestamp)
        assertEquals("C", actualHistory.dataHistory[0].text)

        assertEquals(updateTime5, actualHistory.dataHistory[1].timestamp)
        assertEquals("B", actualHistory.dataHistory[1].text)

        assertEquals(createTime1, actualHistory.dataHistory[2].timestamp)
        assertEquals("A", actualHistory.dataHistory[2].text)
    }

    @Test
    fun readNoteHistory_when_there_are_no_data_changes() {
        //given
        val createTime1 = testClock.currentMillis()
        val noteId = dm.createNote(CreateNoteArgs(text = "A")).data!!

        //when
        val actualHistory = dm.readNoteHistory(ReadNoteHistoryArgs(noteId = noteId)).data!!

        //then
        assertEquals(1, actualHistory.dataHistory.size)

        assertEquals(createTime1, actualHistory.dataHistory[0].timestamp)
        assertEquals("A", actualHistory.dataHistory[0].text)
    }

    @Test
    fun readNoteHistory_when_there_is_one_data_change() {
        //given
        val createTime1 = testClock.currentMillis()
        val noteId = dm.createNote(CreateNoteArgs(text = "A")).data!!

        val updateTime5 = testClock.plus(5, ChronoUnit.MINUTES)
        dm.updateNote(UpdateNoteArgs(noteId = noteId, text = "B"))

        //when
        val actualHistory = dm.readNoteHistory(ReadNoteHistoryArgs(noteId = noteId)).data!!

        //then
        assertEquals(2, actualHistory.dataHistory.size)

        assertEquals(updateTime5, actualHistory.dataHistory[0].timestamp)
        assertEquals("B", actualHistory.dataHistory[0].text)

        assertEquals(createTime1, actualHistory.dataHistory[1].timestamp)
        assertEquals("A", actualHistory.dataHistory[1].text)
    }

    @Test
    fun readNoteHistory_when_there_are_two_data_changes() {
        //given
        val createTime1 = testClock.currentMillis()
        val noteId = dm.createNote(CreateNoteArgs(text = "A")).data!!

        val updateTime5 = testClock.plus(5, ChronoUnit.MINUTES)
        dm.updateNote(UpdateNoteArgs(noteId = noteId, text = "B"))

        val updateTime9 = testClock.plus(9, ChronoUnit.MINUTES)
        dm.updateNote(UpdateNoteArgs(noteId = noteId, text = "C"))

        //when
        val actualHistory = dm.readNoteHistory(ReadNoteHistoryArgs(noteId = noteId)).data!!

        //then
        assertEquals(3, actualHistory.dataHistory.size)

        assertEquals(updateTime9, actualHistory.dataHistory[0].timestamp)
        assertEquals("C", actualHistory.dataHistory[0].text)

        assertEquals(updateTime5, actualHistory.dataHistory[1].timestamp)
        assertEquals("B", actualHistory.dataHistory[1].text)

        assertEquals(createTime1, actualHistory.dataHistory[2].timestamp)
        assertEquals("A", actualHistory.dataHistory[2].text)
    }

    @Test
    fun readNotesByFilter_returns_all_notes_if_no_filters_were_specified() {
        //given
        val tagId1 = createTag(tagId = 1, name = "t1")
        val tagId2 = createTag(tagId = 2, name = "t2")
        val tagId3 = createTag(tagId = 3, name = "t3")
        val note1 = createNote(noteId = 1L, tagIds = listOf(tagId1, tagId2))
        val note2 = createNote(noteId = 2L, tagIds = listOf())
        val note3 = createNote(noteId = 3L, tagIds = listOf(tagId2, tagId3))

        //when
        val foundNotes = dm.readNotesByFilter(ReadNotesByFilterArgs())

        //then
        assertSearchResult(listOf(note1, note2, note3), foundNotes)
    }

    @Test
    fun readNotesByFilter_filters_by_tags_to_include() {
        val tagId1 = createTag(tagId = 1, name = "t1")
        val tagId2 = createTag(tagId = 2, name = "t2")
        val tagId3 = createTag(tagId = 3, name = "t3")
        val tagId4 = createTag(tagId = 4, name = "t4")
        val tagId5 = createTag(tagId = 5, name = "t5")
        val tagId6 = createTag(tagId = 6, name = "t6")
        val note1 = createNote(noteId = 1L, tagIds = listOf(tagId1, tagId2))
        val note2 = createNote(noteId = 2L, tagIds = listOf())
        val note3 = createNote(noteId = 3L, tagIds = listOf(tagId2, tagId3))
        val note4 = createNote(noteId = 4L, tagIds = listOf(tagId4, tagId5, tagId6))

        //search by 0 tags - all notes are returned
        assertSearchResult(
            listOf(note1, note2, note3, note4),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                tagIdsToInclude = setOf()
            ))
        )

        //search by one tag
        assertSearchResult(
            listOf(note1, note3),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                tagIdsToInclude = setOf(tagId2)
            ))
        )

        //search by two tags
        assertSearchResult(
            listOf(note3),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                tagIdsToInclude = setOf(tagId3, tagId2)
            ))
        )

        //search by three tags - empty result
        assertSearchResult(
            listOf(),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                tagIdsToInclude = setOf(tagId1, tagId2, tagId3)
            ))
        )

        //search by three tags - non-empty result
        assertSearchResult(
            listOf(note4),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                tagIdsToInclude = setOf(tagId4, tagId5, tagId6)
            ))
        )
    }

    @Test
    fun readNotesByFilter_filters_by_tags_to_exclude() {
        val tagId1 = createTag(tagId = 1, name = "t1")
        val tagId2 = createTag(tagId = 2, name = "t2")
        val tagId3 = createTag(tagId = 3, name = "t3")
        val tagId4 = createTag(tagId = 4, name = "t4")
        val tagId5 = createTag(tagId = 5, name = "t5")
        val tagId6 = createTag(tagId = 6, name = "t6")
        val note1 = createNote(noteId = 1L, tagIds = listOf(tagId1, tagId2))
        val note2 = createNote(noteId = 2L, tagIds = listOf())
        val note3 = createNote(noteId = 3L, tagIds = listOf(tagId2, tagId3))
        val note4 = createNote(noteId = 4L, tagIds = listOf(tagId4, tagId5, tagId6))

        //search by 0 tags - all notes are returned
        assertSearchResult(
            listOf(note1, note2, note3, note4),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                tagIdsToExclude = setOf()
            ))
        )

        //search by one tag
        assertSearchResult(
            listOf(note1, note2, note4),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                tagIdsToExclude = setOf(tagId3)
            ))
        )

        //search by two tags
        assertSearchResult(
            listOf(note2, note4),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                tagIdsToExclude = setOf(tagId3, tagId2)
            ))
        )

        //search by three tags - non-empty result
        assertSearchResult(
            listOf(note2),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                tagIdsToExclude = setOf(tagId1, tagId2, tagId4)
            ))
        )
    }

    @Test
    fun readNotesByFilter_filters_by_few_tags_to_include_and_few_tags_to_exclude() {
        val tagId1 = createTag(tagId = 1, name = "t1")
        val tagId2 = createTag(tagId = 2, name = "t2")
        val tagId3 = createTag(tagId = 3, name = "t3")
        val tagId4 = createTag(tagId = 4, name = "t4")
        val tagId5 = createTag(tagId = 5, name = "t5")
        val tagId6 = createTag(tagId = 6, name = "t6")
        val note1 = createNote(noteId = 1L, tagIds = listOf(tagId4, tagId2))
        val note2 = createNote(noteId = 2L, tagIds = listOf(tagId2, tagId3))
        val note3 = createNote(noteId = 3L, tagIds = listOf(tagId2, tagId3, tagId6))
        val note4 = createNote(noteId = 4L, tagIds = listOf(tagId5, tagId6))

        assertSearchResult(
            listOf(note2, note3),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                tagIdsToInclude = setOf(tagId2, tagId3),
                tagIdsToExclude = setOf(tagId4, tagId5),
            ))
        )
    }

    @Test
    fun readNotesByFilter_filters_by_textContains() {
        val note1 = createNote(noteId = 1L, mapper = {it.copy(text = "ubcu")})
        val note2 = createNote(noteId = 2L, mapper = {it.copy(text = "dddd")})
        val note3 = createNote(noteId = 3L, mapper = {it.copy(text = "ffff")})
        val note4 = createNote(noteId = 4L, mapper = {it.copy(text = "aBCd")})

        assertSearchResult(
            listOf(note1, note4),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                textContains = "Bc"
            ))
        )
    }

    @Test
    fun readNotesByFilter_filters_by_tags_and_textContains() {
        val tagId1 = createTag(tagId = 1, name = "t1")
        val tagId2 = createTag(tagId = 2, name = "t2")
        val tagId3 = createTag(tagId = 3, name = "t3")
        val tagId4 = createTag(tagId = 4, name = "t4")
        val tagId5 = createTag(tagId = 5, name = "t5")
        val tagId6 = createTag(tagId = 6, name = "t6")
        val note1 = createNote(noteId = 1L, mapper = {it.copy(text = "ubcu")})
        val note2 = createNote(noteId = 2L, mapper = {it.copy(text = "dddd")})
        val note3 = createNote(noteId = 3L, mapper = {it.copy(text = "ffff")})
        val note4 = createNote(noteId = 4L, mapper = {it.copy(text = "aBCd")}, tagIds = listOf(tagId1))
        val note5 = createNote(noteId = 5L, mapper = {it.copy(text = "aBCd")}, tagIds = listOf(tagId1,tagId2,tagId3))
        val note6 = createNote(noteId = 6L, mapper = {it.copy(text = "aBCd")}, tagIds = listOf(tagId1,tagId2))

        assertSearchResult(
            listOf(note6),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                textContains = "Bc",
                tagIdsToInclude = setOf(tagId1,tagId2),
                tagIdsToExclude = setOf(tagId3)
            ))
        )
    }

    @Test
    fun readNotesByFilter_filters_by_createdFrom() {
        val note1 = createNote(noteId = 1L, mapper = {it.copy(createdAt = 1L)})
        val note2 = createNote(noteId = 2L, mapper = {it.copy(createdAt = 2L)})
        val note3 = createNote(noteId = 3L, mapper = {it.copy(createdAt = 3L)})
        val note4 = createNote(noteId = 4L, mapper = {it.copy(createdAt = 4L)})
        val note5 = createNote(noteId = 5L, mapper = {it.copy(createdAt = 5L)})

        assertSearchResult(
            listOf(note3, note4, note5),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                createdFrom = 3
            ))
        )
    }

    @Test
    fun readNotesByFilter_filters_by_createdTill() {
        val note1 = createNote(noteId = 1L, mapper = {it.copy(createdAt = 1L)})
        val note2 = createNote(noteId = 2L, mapper = {it.copy(createdAt = 2L)})
        val note3 = createNote(noteId = 3L, mapper = {it.copy(createdAt = 3L)})
        val note4 = createNote(noteId = 4L, mapper = {it.copy(createdAt = 4L)})
        val note5 = createNote(noteId = 5L, mapper = {it.copy(createdAt = 5L)})

        assertSearchResult(
            listOf(note1, note2, note3),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                createdTill = 3
            ))
        )
    }

    @Test
    fun readNotesByFilter_filters_by_createdFrom_and_createdTill() {
        val note1 = createNote(noteId = 1L, mapper = {it.copy(createdAt = 1L)})
        val note2 = createNote(noteId = 2L, mapper = {it.copy(createdAt = 2L)})
        val note3 = createNote(noteId = 3L, mapper = {it.copy(createdAt = 3L)})
        val note4 = createNote(noteId = 4L, mapper = {it.copy(createdAt = 4L)})
        val note5 = createNote(noteId = 5L, mapper = {it.copy(createdAt = 5L)})

        assertSearchResult(
            listOf(note2, note3, note4),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                createdFrom = 2,
                createdTill = 4
            ))
        )
    }

    @Test
    fun readNotesByFilter_sorts_according_to_sortBy() {
        val note1 = createNote(noteId = 1L, mapper = {it.copy(createdAt = 4)})
        val note2 = createNote(noteId = 2L, mapper = {it.copy(createdAt = 1)})
        val note3 = createNote(noteId = 3L, mapper = {it.copy(createdAt = 5)})
        val note4 = createNote(noteId = 4L, mapper = {it.copy(createdAt = 3)})
        val note5 = createNote(noteId = 5L, mapper = {it.copy(createdAt = 2)})

        assertSearchResult(
            listOf(note2,note5,note4,note1,note3),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                sortBy = NoteSortBy.TIME_CREATED
            )),
            matchOrder = true
        )

        assertSearchResult(
            listOf(note2,note5,note4,note1,note3),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                sortBy = NoteSortBy.TIME_CREATED,
                sortDir = SortDirection.ASC
            )),
            matchOrder = true
        )

        assertSearchResult(
            listOf(note3,note1,note4,note5,note2),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                sortBy = NoteSortBy.TIME_CREATED,
                sortDir = SortDirection.DESC
            )),
            matchOrder = true
        )
    }

    @Test
    fun readNotesByFilter_limits_number_of_rows_according_to_rowsLimit() {
        val card1 = createNote(noteId = 1L, mapper = {it.copy(createdAt = 4)})
        val card2 = createNote(noteId = 2L, mapper = {it.copy(createdAt = 1)})
        val card3 = createNote(noteId = 3L, mapper = {it.copy(createdAt = 5)})
        val card4 = createNote(noteId = 4L, mapper = {it.copy(createdAt = 3)})
        val card5 = createNote(noteId = 5L, mapper = {it.copy(createdAt = 2)})

        assertSearchResult(
            listOf(card2,card5,card4,card1,card3),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                sortBy = NoteSortBy.TIME_CREATED
            )),
            matchOrder = true
        )

        assertSearchResult(
            listOf(card2,card5,card4,card1,card3),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                sortBy = NoteSortBy.TIME_CREATED,
                rowsLimit = 100
            )),
            matchOrder = true
        )

        assertSearchResult(
            listOf(card2,card5,card4,card1,card3),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                sortBy = NoteSortBy.TIME_CREATED,
                rowsLimit = 5
            )),
            matchOrder = true
        )

        assertSearchResult(
            listOf(card2,card5,card4,card1),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                sortBy = NoteSortBy.TIME_CREATED,
                rowsLimit = 4
            )),
            matchOrder = true
        )

        assertSearchResult(
            listOf(card2,card5),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                sortBy = NoteSortBy.TIME_CREATED,
                rowsLimit = 2
            )),
            matchOrder = true
        )

        assertSearchResult(
            listOf(card2),
            dm.readNotesByFilter(ReadNotesByFilterArgs(
                sortBy = NoteSortBy.TIME_CREATED,
                rowsLimit = 1
            )),
            matchOrder = true
        )
    }

    private fun assertSearchResult(
        expected: List<Note>,
        actual: BeRespose<ReadNotesByFilterResp>,
        matchOrder:Boolean = false
    ) {
        val actualCardsList = actual.data!!.notes
        assertEquals(expected.size, actualCardsList.size)
        var cnt = 0
        if (matchOrder) {
            for (i in expected.indices) {
                assertNotesEqual(expected[i], actualCardsList[i])
                cnt++
            }
        } else {
            val cardsMap = actualCardsList.map { it.id to it }.toMap()
            for (i in expected.indices) {
                val id = expected[i].id
                val actualCard = cardsMap[id]
                if (actualCard == null) {
                    fail("Missing cardId=$id in actual result.")
                } else {
                    assertNotesEqual(expected[i], actualCard)
                }
                cnt++
            }
        }
        assertEquals(expected.size, cnt)
    }
}