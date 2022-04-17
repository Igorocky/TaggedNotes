package org.igye.taggednotes.unit.instrumentation

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.igye.taggednotes.manager.DataManager.CreateNoteArgs
import org.igye.taggednotes.manager.DataManager.DeleteNoteArgs
import org.igye.taggednotes.testutils.InstrumentedTestBase
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DeleteNoteInstrumentedUnitTest: InstrumentedTestBase() {

    @Test
    fun deleteNote_deletes_note() {
        //given
        val expectedText = "A"
        val timeCreated = testClock.currentMillis()
        val noteId = dm.createNote(
            CreateNoteArgs(text = expectedText)
        ).data!!

        //when
        val timeDeleted = testClock.plus(1000)
        val deleteNoteResp = dm.deleteNote(DeleteNoteArgs(noteId = noteId))

        //then
        assertNotNull(deleteNoteResp.data)

        assertTableContent(repo = repo, table = o, matchColumn = o.id, expectedRows = listOf())
        assertTableContent(repo = repo, table = o.ver, expectedRows = listOf(
            listOf(o.ver.timestamp to timeDeleted, o.id to noteId, o.type to N_TP, o.createdAt to timeCreated)
        ))

        assertTableContent(repo = repo, table = n, matchColumn = n.id, expectedRows = listOf())
        assertTableContent(repo = repo, table = n.ver, expectedRows = listOf(
            listOf(n.ver.timestamp to timeDeleted, n.id to noteId, n.text to expectedText)
        ))
    }

    @Test
    fun deleteNote_ids_of_deleted_notes_are_not_reused() {
        //given
        val expectedText1 = "A"
        val expectedText2 = "B"
        val timeCreated1 = testClock.currentMillis()
        val noteId1 = dm.createNote(
            CreateNoteArgs(text = expectedText1)
        ).data!!
        val timeDeleted1 = testClock.plus(1000)
        dm.deleteNote(DeleteNoteArgs(noteId = noteId1))

        //when
        val timeCreated2 = testClock.plus(1000)
        val noteId2 = dm.createNote(
            CreateNoteArgs(text = expectedText2)
        ).data!!

        //then
        assertNotEquals(noteId1, noteId2)

        assertTableContent(repo = repo, table = o, matchColumn = o.id, expectedRows = listOf(
            listOf(o.id to noteId2, o.type to N_TP, o.createdAt to timeCreated2)
        ))
        assertTableContent(repo = repo, table = o.ver, expectedRows = listOf(
            listOf(o.ver.timestamp to timeDeleted1, o.id to noteId1, o.type to N_TP, o.createdAt to timeCreated1)
        ))

        assertTableContent(repo = repo, table = n, matchColumn = n.id, expectedRows = listOf(
            listOf(n.id to noteId2, n.text to expectedText2)
        ))
        assertTableContent(repo = repo, table = n.ver, expectedRows = listOf(
            listOf(n.ver.timestamp to timeDeleted1, n.id to noteId1, n.text to expectedText1)
        ))
    }

}