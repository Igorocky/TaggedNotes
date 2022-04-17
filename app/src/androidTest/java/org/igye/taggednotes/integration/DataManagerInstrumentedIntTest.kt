package org.igye.taggednotes.integration

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.igye.taggednotes.dto.domain.Note
import org.igye.taggednotes.manager.DataManager.*
import org.igye.taggednotes.testutils.InstrumentedTestBase
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DataManagerInstrumentedIntTest: InstrumentedTestBase() {

    @Test
    fun useAppContext() {
        // Context of the app under test.
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("org.igye.taggednotes.dev", appContext.packageName)
    }

    @Test
    fun test_scenario_1_create_note_and_edit_it_twice() {
        //given
        val expectedText1 = "A"
        val expectedText2 = "B"

        //when: create a new note
        val timeCrt = testClock.currentMillis()
        val actualCreatedNoteId = dm.createNote(
            CreateNoteArgs(text = expectedText1)
        ).data!!
        val actualCreatedNote = dm.readNoteById(ReadNoteByIdArgs(noteId = actualCreatedNoteId)).data!!

        //then: a new note is created successfully
        assertEquals(expectedText1, actualCreatedNote.text)
        assertEquals(timeCrt, actualCreatedNote.createdAt)

        assertTableContent(repo = repo, table = o, matchColumn = o.id, expectedRows = listOf(
            listOf(o.id to actualCreatedNote.id, o.type to N_TP, o.createdAt to timeCrt)
        ))
        assertTableContent(repo = repo, table = o.ver, expectedRows = listOf())

        assertTableContent(repo = repo, table = n, matchColumn = n.id, expectedRows = listOf(
            listOf(n.id to actualCreatedNote.id, n.text to expectedText1)
        ))
        assertTableContent(repo = repo, table = n.ver, expectedRows = listOf())

        //when: edit the card but provide same values
        testClock.plus(5000)
        dm.updateNote(
            UpdateNoteArgs(noteId = actualCreatedNote.id, text = "$expectedText1  ")
        )
        val responseAfterEdit1 = dm.readNoteById(ReadNoteByIdArgs(noteId = actualCreatedNote.id))

        //then: the note stays in the same state - no actual edit was done
        val noteAfterEdit1: Note = responseAfterEdit1.data!!
        assertEquals(expectedText1, noteAfterEdit1.text)

        assertTableContent(repo = repo, table = o, matchColumn = o.id, expectedRows = listOf(
            listOf(o.id to noteAfterEdit1.id, o.type to N_TP, o.createdAt to timeCrt)
        ))
        assertTableContent(repo = repo, table = o.ver, expectedRows = listOf())

        assertTableContent(repo = repo, table = n, matchColumn = n.id, expectedRows = listOf(
            listOf(n.id to noteAfterEdit1.id, n.text to expectedText1)
        ))
        assertTableContent(repo = repo, table = n.ver, expectedRows = listOf())

        //when: provide new values when editing the note
        val timeEdt2 = testClock.plus(5000)
        dm.updateNote(
            UpdateNoteArgs(noteId = actualCreatedNote.id, text = "  $expectedText2  ")
        )
        val responseAfterEdit2 = dm.readNoteById(ReadNoteByIdArgs(noteId = actualCreatedNote.id))

        //then: the values of the note are updated and the previous version of the note is saved to the corresponding VER table
        val noteAfterEdit2: Note = responseAfterEdit2.data!!
        assertEquals(expectedText2, noteAfterEdit2.text)

        assertTableContent(repo = repo, table = o, matchColumn = o.id, expectedRows = listOf(
            listOf(o.id to noteAfterEdit2.id, o.type to N_TP, o.createdAt to timeCrt)
        ))
        assertTableContent(repo = repo, table = o.ver, expectedRows = listOf())

        assertTableContent(repo = repo, table = n, matchColumn = n.id, expectedRows = listOf(
            listOf(n.id to noteAfterEdit2.id, n.text to expectedText2)
        ))
        assertTableContent(repo = repo, table = n.ver, expectedRows = listOf(
            listOf(n.id to noteAfterEdit2.id, n.text to expectedText1, n.ver.timestamp to timeEdt2)
        ))
    }
}