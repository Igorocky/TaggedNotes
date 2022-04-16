package org.igye.taggednotes.unit.instrumentation

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.igye.taggednotes.manager.DataManager.*
import org.igye.taggednotes.testutils.InstrumentedTestBase
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CreateNoteInstrumentedUnitTest: InstrumentedTestBase() {

    @Test
    fun createNote_saves_new_note_without_tags() {
        //given
        val expectedText = "A"
        val time1 = testClock.currentMillis()

        //when
        val noteId = dm.createNote(
            CreateNoteArgs(text = " $expectedText\t")
        ).data!!
        val note = dm.readNoteById(ReadNoteByIdArgs(noteId = noteId)).data!!

        //then
        assertEquals(expectedText, note.text)
        assertEquals(time1, note.createdAt)
        assertTrue(note.tagIds.isEmpty())

        assertTableContent(repo = repo, table = o, matchColumn = o.id, expectedRows = listOf(
            listOf(o.id to note.id, o.type to N_TP, o.createdAt to time1)
        ))
        assertTableContent(repo = repo, table = o.ver, expectedRows = listOf())

        assertTableContent(repo = repo, table = tg, expectedRows = listOf())
        assertTableContent(repo = repo, table = otg, expectedRows = listOf())

        assertTableContent(repo = repo, table = n, matchColumn = n.noteId, expectedRows = listOf(
            listOf(n.noteId to note.id, n.text to expectedText)
        ))
        assertTableContent(repo = repo, table = n.ver, expectedRows = listOf())
    }

    @Test
    fun createNote_saves_new_note_with_tags() {
        //given
        val expectedText = "A"
        val time1 = testClock.currentMillis()
        val tagId1 = dm.createTag(CreateTagArgs("t1")).data!!
        val tagId2 = dm.createTag(CreateTagArgs("t2")).data!!

        //when
        val noteId = dm.createNote(
            CreateNoteArgs(
                text = " $expectedText\t",
                tagIds = setOf(tagId1, tagId2)
            )
        ).data!!
        val note = dm.readNoteById(ReadNoteByIdArgs(noteId = noteId)).data!!

        //then
        assertEquals(expectedText, note.text)

        assertTableContent(repo = repo, table = o, matchColumn = o.id, expectedRows = listOf(
            listOf(o.id to note.id, o.type to N_TP, o.createdAt to time1)
        ))
        assertTableContent(repo = repo, table = o.ver, expectedRows = listOf())

        assertTableContent(repo = repo, table = tg, expectedRows = listOf(
            listOf(tg.id to tagId1, tg.createdAt to time1, tg.name to "t1"),
            listOf(tg.id to tagId2, tg.createdAt to time1, tg.name to "t2"),
        ))
        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId1),
            listOf(otg.objId to noteId, otg.tagId to tagId2),
        ))

        assertTableContent(repo = repo, table = n, matchColumn = n.noteId, expectedRows = listOf(
            listOf(n.noteId to note.id, n.text to expectedText)
        ))
        assertTableContent(repo = repo, table = n.ver, expectedRows = listOf())
    }
}