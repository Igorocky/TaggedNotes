package org.igye.taggednotes.unit.instrumentation

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.igye.taggednotes.manager.DataManager.*
import org.igye.taggednotes.testutils.InstrumentedTestBase
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class UpdateNoteInstrumentedUnitTest: InstrumentedTestBase() {

    @Test
    fun updateNote_adds_new_tags_to_note_without_tags() {
        //given
        val tagId1 = dm.createTag(CreateTagArgs(name = "A")).data!!
        val tagId2 = dm.createTag(CreateTagArgs(name = "B")).data!!
        val tagId3 = dm.createTag(CreateTagArgs(name = "C")).data!!
        val noteId = dm.createNote(CreateNoteArgs(text = "X")).data!!

        assertTableContent(repo = repo, table = otg, expectedRows = listOf())

        //when
        dm.updateNote(UpdateNoteArgs(noteId = noteId, tagIds = setOf(tagId1,tagId2,tagId3)))

        //then
        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId1),
            listOf(otg.objId to noteId, otg.tagId to tagId2),
            listOf(otg.objId to noteId, otg.tagId to tagId3),
        ))
    }

    @Test
    fun updateNote_adds_new_tags_to_note_with_tags() {
        //given
        val tagId1 = dm.createTag(CreateTagArgs(name = "A")).data!!
        val tagId2 = dm.createTag(CreateTagArgs(name = "B")).data!!
        val tagId3 = dm.createTag(CreateTagArgs(name = "C")).data!!
        val tagId4 = dm.createTag(CreateTagArgs(name = "D")).data!!
        val noteId = dm.createNote(CreateNoteArgs(
            text = "X", tagIds = setOf(tagId1, tagId2)
        )).data!!

        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId1),
            listOf(otg.objId to noteId, otg.tagId to tagId2),
        ))

        //when
        dm.updateNote(UpdateNoteArgs(noteId = noteId, tagIds = setOf(tagId1,tagId2,tagId3,tagId4)))

        //then
        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId1),
            listOf(otg.objId to noteId, otg.tagId to tagId2),
            listOf(otg.objId to noteId, otg.tagId to tagId3),
            listOf(otg.objId to noteId, otg.tagId to tagId4),
        ))
    }

    @Test
    fun updateNote_removes_all_tags_from_note_with_tags() {
        //given
        val tagId1 = dm.createTag(CreateTagArgs(name = "A")).data!!
        val tagId2 = dm.createTag(CreateTagArgs(name = "B")).data!!
        val noteId = dm.createNote(CreateNoteArgs(
            text = "X", tagIds = setOf(tagId1, tagId2)
        )).data!!

        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId1),
            listOf(otg.objId to noteId, otg.tagId to tagId2),
        ))

        //when
        dm.updateNote(UpdateNoteArgs(noteId = noteId, tagIds = emptySet()))

        //then
        assertTableContent(repo = repo, table = otg, expectedRows = listOf())
    }

    @Test
    fun updateNote_doesnt_modify_tags_if_tagIds_is_null_in_the_request() {
        //given
        val tagId1 = dm.createTag(CreateTagArgs(name = "A")).data!!
        val tagId2 = dm.createTag(CreateTagArgs(name = "B")).data!!
        val noteId = dm.createNote(CreateNoteArgs(
            text = "X", tagIds = setOf(tagId1, tagId2)
        )).data!!

        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId1),
            listOf(otg.objId to noteId, otg.tagId to tagId2),
        ))

        //when
        dm.updateNote(UpdateNoteArgs(noteId = noteId, tagIds = null))

        //then
        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId1),
            listOf(otg.objId to noteId, otg.tagId to tagId2),
        ))
    }

    @Test
    fun updateNote_doesnt_fail_when_requested_to_remove_all_tags_from_card_without_tags() {
        //given
        val noteId = dm.createNote(CreateNoteArgs(
            text = "X"
        )).data!!

        assertTableContent(repo = repo, table = otg, expectedRows = listOf())

        //when
        dm.updateNote(UpdateNoteArgs(noteId = noteId, tagIds = emptySet()))

        //then
        assertTableContent(repo = repo, table = otg, expectedRows = listOf())
    }

    @Test
    fun updateNote_adds_few_new_and_removes_few_existing_and_doesnt_touch_few_existing_tags_for_note_with_tags() {
        //given
        val tagId1 = dm.createTag(CreateTagArgs(name = "A")).data!!
        val tagId2 = dm.createTag(CreateTagArgs(name = "B")).data!!
        val tagId3 = dm.createTag(CreateTagArgs(name = "C")).data!!
        val tagId4 = dm.createTag(CreateTagArgs(name = "D")).data!!
        val tagId5 = dm.createTag(CreateTagArgs(name = "E")).data!!
        val tagId6 = dm.createTag(CreateTagArgs(name = "F")).data!!
        val noteId = dm.createNote(CreateNoteArgs(
            text = "X", tagIds = setOf(tagId1, tagId2, tagId3, tagId4)
        )).data!!

        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId1),
            listOf(otg.objId to noteId, otg.tagId to tagId2),
            listOf(otg.objId to noteId, otg.tagId to tagId3),
            listOf(otg.objId to noteId, otg.tagId to tagId4),
        ))

        //when
        dm.updateNote(UpdateNoteArgs(noteId = noteId, tagIds = setOf(tagId5,tagId6,tagId3,tagId4)))

        //then
        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId5),
            listOf(otg.objId to noteId, otg.tagId to tagId6),
            listOf(otg.objId to noteId, otg.tagId to tagId3),
            listOf(otg.objId to noteId, otg.tagId to tagId4),
        ))
    }

    @Test
    fun updateNote_updates_all_parameters_simultaneously() {
        //given
        val tagId1 = dm.createTag(CreateTagArgs(name = "A")).data!!
        val tagId2 = dm.createTag(CreateTagArgs(name = "B")).data!!
        val tagId3 = dm.createTag(CreateTagArgs(name = "C")).data!!
        val tagId4 = dm.createTag(CreateTagArgs(name = "D")).data!!
        val tagId5 = dm.createTag(CreateTagArgs(name = "E")).data!!
        val tagId6 = dm.createTag(CreateTagArgs(name = "F")).data!!
        val textBeforeUpdate = "X"
        val textAfterUpdate = "Y"
        val createTime = testClock.currentMillis()
        val noteId = dm.createNote(CreateNoteArgs(
            text = textBeforeUpdate, tagIds = setOf(tagId1, tagId2, tagId3, tagId4)
        )).data!!

        assertTableContent(repo = repo, table = o, expectedRows = listOf(
            listOf(o.id to noteId, o.createdAt to createTime, o.type to N_TP),
        ))
        assertTableContent(repo = repo, table = o.ver, expectedRows = listOf())

        assertTableContent(repo = repo, table = n, expectedRows = listOf(
            listOf(n.id to noteId, n.text to textBeforeUpdate),
        ))
        assertTableContent(repo = repo, table = n.ver, expectedRows = listOf())

        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId1),
            listOf(otg.objId to noteId, otg.tagId to tagId2),
            listOf(otg.objId to noteId, otg.tagId to tagId3),
            listOf(otg.objId to noteId, otg.tagId to tagId4),
        ))

        //when
        val updateTime = testClock.plus(4000)
        dm.updateNote(UpdateNoteArgs(
            noteId = noteId,
            text = textAfterUpdate,
            tagIds = setOf(tagId5,tagId6,tagId3,tagId4),
        ))

        //then
        assertTableContent(repo = repo, table = o, expectedRows = listOf(
            listOf(o.id to noteId, o.createdAt to createTime, o.type to N_TP),
        ))
        assertTableContent(repo = repo, table = o.ver, expectedRows = listOf())

        assertTableContent(repo = repo, table = n, expectedRows = listOf(
            listOf(n.id to noteId, n.text to textAfterUpdate),
        ))
        assertTableContent(repo = repo, table = n.ver, expectedRows = listOf(
            listOf(n.id to noteId, n.ver.timestamp to updateTime, n.text to textBeforeUpdate),
        ))

        assertTableContent(repo = repo, table = otg, expectedRows = listOf(
            listOf(otg.objId to noteId, otg.tagId to tagId5),
            listOf(otg.objId to noteId, otg.tagId to tagId6),
            listOf(otg.objId to noteId, otg.tagId to tagId3),
            listOf(otg.objId to noteId, otg.tagId to tagId4),
        ))
    }
}