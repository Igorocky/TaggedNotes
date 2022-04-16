package org.igye.taggednotes.manager

import android.database.sqlite.SQLiteConstraintException
import org.igye.taggednotes.ErrorCode.*
import org.igye.taggednotes.common.BeMethod
import org.igye.taggednotes.common.TaggedNotesException
import org.igye.taggednotes.database.ObjectType
import org.igye.taggednotes.database.doInTransaction
import org.igye.taggednotes.database.select
import org.igye.taggednotes.dto.common.BeErr
import org.igye.taggednotes.dto.common.BeRespose
import org.igye.taggednotes.dto.domain.*
import java.time.Clock


class DataManager(
    private val clock: Clock,
    private val repositoryManager: RepositoryManager,
    private val settingsManager: SettingsManager,
) {
    fun getRepo() = repositoryManager.getRepo()

    private val o = getRepo().objs
    private val tg = getRepo().tags
    private val otg = getRepo().objToTag
    private val n = getRepo().notes

    private val tagsStat = repositoryManager.tagsStat

    data class CreateTagArgs(val name:String)
    @BeMethod
    @Synchronized
    fun createTag(args:CreateTagArgs): BeRespose<Long> {
        val name = args.name.trim()
        return if (name.isBlank()) {
            BeRespose(err = BeErr(code = SAVE_NEW_TAG_NAME_IS_EMPTY.code, msg = "Name of a new tag should not be empty."))
        } else {
            return BeRespose(
                errCode = SAVE_NEW_TAG,
                errHandler = { ex ->
                    if (ex is SQLiteConstraintException && (ex.message?:"").contains("UNIQUE constraint failed: TAGS.NAME")) {
                        throw TaggedNotesException(
                            errCode = SAVE_NEW_TAG_NAME_IS_NOT_UNIQUE,
                            msg = "A tag with name '$name' already exists."
                        )
                    } else {
                        throw ex
                    }
                }
            ) {
                val repo = getRepo()
                repo.writableDatabase.doInTransaction {
                    tagsStat.tagsCouldChange()
                    repo.tags.insert(name = name)
                }
            }
        }
    }

    private val readAllTagsQuery = "select ${tg.id}, ${tg.name} from $tg order by ${tg.name}"
    private val readAllTagsColumnNames = arrayOf(tg.id, tg.name)
    @BeMethod
    @Synchronized
    fun readAllTags(): BeRespose<List<Tag>> {
        return BeRespose(READ_ALL_TAGS) {
            getRepo().readableDatabase.select(
                query = readAllTagsQuery,
                columnNames = readAllTagsColumnNames
            ) {
                Tag(id = it.getLong(), name = it.getString())
            }.rows
        }
    }

    private val getObjToTagMappingQuery = "select ${otg.objId}, ${otg.tagId} from $otg order by ${otg.objId}"
    @BeMethod
    @Synchronized
    fun getObjToTagMapping(): BeRespose<Map<Long,List<Long>>> {
        return BeRespose(GET_CARD_TO_TAG_MAPPING) {
            var objId: Long? = null
            val tagIds = ArrayList<Long>(10)
            val result = HashMap<Long,List<Long>>()
            getRepo().readableDatabase.select(
                query = getObjToTagMappingQuery,
            ) {
                val oid = it.getLong()
                if (objId == null) {
                    objId = oid
                }
                if (objId != oid) {
                    result[objId!!] = ArrayList(tagIds)
                    objId = oid
                    tagIds.clear()
                }
                tagIds.add(it.getLong())
            }
            if (objId != null) {
                result[objId!!] = ArrayList(tagIds)
            }
            result
        }
    }

    data class UpdateTagArgs(val tagId:Long, val name:String)
    @BeMethod
    fun updateTag(args:UpdateTagArgs): BeRespose<Tag> {
        val newName = args.name.trim()
        return if (newName.isBlank()) {
            BeRespose(err = BeErr(code = UPDATE_TAG_NAME_IS_EMPTY.code, msg = "Name of a tag should not be empty."))
        } else {
            return BeRespose(
                errCode = UPDATE_TAG,
                errHandler = { ex ->
                    throw if (ex is SQLiteConstraintException && (ex.message?:"").contains("UNIQUE constraint failed: TAGS.NAME")) {
                        TaggedNotesException(
                            errCode = UPDATE_TAG_NAME_IS_NOT_UNIQUE,
                            msg = "A tag with name '$newName' already exists."
                        )
                    } else {
                        ex
                    }
                }
            ) {
                val repo = getRepo()
                repo.writableDatabase.doInTransaction {
                    repo.tags.update(id = args.tagId, name = newName)
                    Tag(
                        id = args.tagId,
                        name = newName
                    )
                }
            }
        }
    }

    data class DeleteTagArgs(val tagId:Long)
    @BeMethod
    fun deleteTag(args:DeleteTagArgs): BeRespose<Unit> {
        return BeRespose(
            errCode = DELETE_TAG,
            errHandler = { ex ->
                throw if (ex is SQLiteConstraintException && (ex.message?:"").contains("FOREIGN KEY constraint failed")) {
                    TaggedNotesException(
                        errCode = DELETE_TAG_TAG_IS_USED,
                        msg = "Cannot delete tag because it is referenced by at least one card."
                    )
                } else {
                    ex
                }
            }
        ) {
            val repo = getRepo()
            repo.writableDatabase.doInTransaction {
                repo.tags.delete(id = args.tagId)
            }
        }
    }

    data class CreateNoteArgs(
        val text:String,
        val tagIds: Set<Long> = emptySet(),
    )
    @BeMethod
    @Synchronized
    fun createNote(args: CreateNoteArgs): BeRespose<Long> {
        val text = args.text.trim()
        if (text.isBlank()) {
            return BeRespose(err = BeErr(code = SAVE_NEW_NOTE_TEXT_IS_EMPTY.code, msg = "Note text should not be empty."))
        } else {
            tagsStat.tagsCouldChange()
            val repo = getRepo()
            return BeRespose(SAVE_NEW_NOTE_EXCEPTION) {
                repo.writableDatabase.doInTransaction {
                    val objId = createObject(objectType = ObjectType.NOTE, tagIds = args.tagIds)
                    repo.notes.insert(noteId = objId, text = text)
                    objId
                }
            }
        }
    }

    data class ReadNoteByIdArgs(val noteId: Long)
    private val readNoteByIdQuery = """
        select
            o.${o.id},
            o.${o.createdAt},
            n.${n.text},
            (select group_concat(otg.${otg.tagId}) from $otg otg where otg.${otg.objId} = o.${o.id}) as tagIds 
        from
            $o o
            left join $n n on o.${o.id} = n.${n.noteId}
        where o.${o.id} = ?
    """.trimIndent()
    @BeMethod
    @Synchronized
    fun readNoteById(args: ReadNoteByIdArgs): BeRespose<Note> {
        return BeRespose(READ_NOTE_BY_ID) {
            getRepo().readableDatabase.doInTransaction {
                select(query = readNoteByIdQuery, args = arrayOf(args.noteId.toString())){
                    Note(
                        id = it.getLong(),
                        createdAt = it.getLong(),
                        text = it.getString(),
                        tagIds = (it.getStringOrNull() ?: "").splitToSequence(",").filter { it.isNotBlank() }
                            .map { it.toLong() }.toList(),
                    )
                }.rows[0]
            }
        }
    }

    @BeMethod
    @Synchronized
    fun readNotesByFilter(args: ReadNotesByFilterArgs): BeRespose<ReadNotesByFilterResp> {
        return BeRespose(READ_NOTES_BY_FILTER) {
            readNotesByFilterInner(args)
        }
    }

    data class ReadNoteHistoryArgs(val noteId:Long)
    private val getDataHistoryQuery =
        "select ${n.ver.verId}, ${n.ver.timestamp}, ${n.noteId}, ${n.text} from ${n.ver} where ${n.noteId} = ? order by ${n.ver.timestamp} desc"
    @BeMethod
    @Synchronized
    fun readNoteHistory(args: ReadNoteHistoryArgs): BeRespose<NoteHistResp> {
        return BeRespose(GET_NOTE_HISTORY) {
            getRepo().readableDatabase.doInTransaction {
                val note: Note = readNoteById(ReadNoteByIdArgs(noteId = args.noteId)).data!!
                val noteIdArgs = arrayOf(args.noteId.toString())
                val dataHistory: ArrayList<NoteHistRecord> = ArrayList(select(
                    query = getDataHistoryQuery,
                    args = noteIdArgs,
                    rowMapper = {
                        NoteHistRecord(
                            verId = it.getLong(),
                            timestamp = it.getLong(),
                            noteId = it.getLong(),
                            text = it.getString(),
                        )
                    }
                ).rows)
                prepareNoteHistResp(note, dataHistory)
            }
        }
    }

    data class UpdateNoteArgs(
        val noteId:Long,
        val tagIds: Set<Long>? = null,
        val text:String? = null,
    )
    private val updateNoteQuery = "select ${n.text} from $n where ${n.noteId} = ?"
    private val updateTranslateCardQueryColumnNames = arrayOf(n.text)
    @BeMethod
    @Synchronized
    fun updateNote(args: UpdateNoteArgs): BeRespose<Unit> {
        return BeRespose(UPDATE_NOTE_EXCEPTION) {
            val repo = getRepo()
            repo.writableDatabase.doInTransaction {
                updateObject(objId = args.noteId, tagIds = args.tagIds)
                val (existingText: String) = select(
                    query = updateNoteQuery,
                    args = arrayOf(args.noteId.toString()),
                    columnNames = updateTranslateCardQueryColumnNames,
                ) {
                    listOf(it.getString())
                }.rows[0]
                val newText = args.text?.trim()?:existingText
                if (newText.isEmpty()) {
                    throw TaggedNotesException(errCode = UPDATE_NOTE_TEXT_IS_EMPTY, msg = "Note text should not be empty.")
                }
                if (newText != existingText) {
                    repo.notes.update(noteId = args.noteId, text = newText)
                }
            }
        }
    }

    data class DeleteNoteArgs(val noteId:Long)
    @BeMethod
    @Synchronized
    fun deleteNote(args: DeleteNoteArgs): BeRespose<Unit> {
        return BeRespose(DELETE_NOTE_EXCEPTION) {
            val repo = getRepo()
            repo.writableDatabase.doInTransaction {
                repo.notes.delete(noteId = args.noteId)
                deleteObject(objId = args.noteId)
            }
        }
    }

    //------------------------------------------------------------------------------------------------------------------

    @Synchronized
    private fun deleteObject(objId: Long) {
        val repo = getRepo()
        repo.writableDatabase.doInTransaction {
            repo.objToTag.delete(objId = objId)
            tagsStat.tagsCouldChange()
            repo.objs.delete(id = objId)
        }
    }

    @Synchronized
    private fun createObject(objectType: ObjectType, tagIds: Set<Long>): Long {
        tagsStat.tagsCouldChange()
        val repo = getRepo()
        return repo.writableDatabase.doInTransaction {
            val objId = repo.objs.insert(objectType = objectType)
            tagIds.forEach { repo.objToTag.insert(objId = objId, tagId = it) }
            objId
        }
    }

    @Synchronized
    private fun updateObject(objId:Long, tagIds: Set<Long>?) {
        val repo = getRepo()
        repo.writableDatabase.doInTransaction {
            val existingObject = readObjectById(objId = objId)
            if (tagIds != null && tagIds != existingObject.tagIds.toSet()) {
                repo.objToTag.delete(objId = objId)
                tagIds.forEach { repo.objToTag.insert(objId = objId, tagId = it) }
            }
        }
    }

    private val readObjectByIdQuery = """
        select
            o.${o.id},
            o.${o.type},
            c.${o.createdAt},
            (select group_concat(ctg.${otg.tagId}) from $otg ctg where ctg.${otg.objId} = c.${o.id}) as tagIds
        from 
            $o o
        where o.${o.id} = ?
    """.trimIndent()
    @Synchronized
    private fun readObjectById(objId: Long): ObjectDto {
        return getRepo().readableDatabase.doInTransaction {
            select(
                query = readObjectByIdQuery,
                args = arrayOf(objId.toString()),
                rowMapper = {
                    ObjectDto(
                        id = it.getLong(),
                        type = ObjectType.fromInt(it.getLong()),
                        createdAt = it.getLong(),
                        tagIds = (it.getStringOrNull() ?: "").splitToSequence(",").filter { it.isNotBlank() }
                            .map { it.toLong() }.toList(),
                    )
                }
            ).rows[0]
        }
    }

    data class ReadNotesByFilterArgs(
        val tagIdsToInclude: Set<Long>? = null,
        val tagIdsToExclude: Set<Long>? = null,
        val textContains: String? = null,
        val createdFrom: Long? = null,
        val createdTill: Long? = null,
        val rowsLimit: Long? = null,
        val sortBy: NoteSortBy? = null,
        val sortDir: SortDirection? = null,
    )
    @Synchronized
    private fun readNotesByFilterInner(args: ReadNotesByFilterArgs): ReadNotesByFilterResp {
        val tagIdsToInclude: List<Long>? = args.tagIdsToInclude?.toList()
        val leastUsedTagId: Long? = if (tagIdsToInclude == null || tagIdsToInclude.isEmpty()) {
            null
        } else {
            tagsStat.getLeastUsedTagId(tagIdsToInclude)
        }
        val currTime = clock.instant().toEpochMilli()
        fun havingFilterForTag(tagId:Long, include: Boolean) =
            "max(case when otg.${otg.tagId} = $tagId then 1 else 0 end) = ${if (include) "1" else "0"}"
        fun havingFilterForTags(tagIds:Sequence<Long>, include: Boolean) =
            tagIds.map { havingFilterForTag(tagId = it, include = include) }.joinToString(" and ")
        val havingFilters = ArrayList<String>()
        if (tagIdsToInclude != null && tagIdsToInclude.size > 1) {
            havingFilters.add(havingFilterForTags(
                tagIds = tagIdsToInclude.asSequence().filter { it != leastUsedTagId },
                include = true
            ))
        }
        if (args.tagIdsToExclude != null && args.tagIdsToExclude.isNotEmpty()) {
            havingFilters.add(havingFilterForTags(
                tagIds = args.tagIdsToExclude.asSequence(),
                include = false
            ))
        }
        val whereFilters = ArrayList<String>()
        val queryArgs = ArrayList<String>()
        if (args.textContains != null) {
            whereFilters.add("lower(n.${n.text}) like ?")
            queryArgs.add("%${args.textContains.lowercase()}%")
        }
        if (args.createdFrom != null) {
            whereFilters.add("o.${o.createdAt} >= ${args.createdFrom}")
        }
        if (args.createdTill != null) {
            whereFilters.add("o.${o.createdAt} <= ${args.createdTill}")
        }
        var orderBy = ""
        if (args.sortBy != null) {
            orderBy = "order by " + when (args.sortBy) {
                NoteSortBy.TIME_CREATED -> "o.${o.createdAt}"
            } + " " + (args.sortDir?:SortDirection.ASC)
        }
        val rowNumLimit = if (args.rowsLimit == null) "" else "limit ${args.rowsLimit}"

        var query = """
            select
                o.${o.id},
                o.${o.createdAt},
                o.tagIds,
                n.${n.text}
            from
                (
                    select
                        o.${o.id},
                        o.${o.createdAt},
                        max(o.${o.createdAt}) ${o.createdAt},
                        group_concat(otg.${otg.tagId}) as tagIds
                    from $o o left join $otg otg on o.${o.id} = otg.${otg.objId}
                        ${if (leastUsedTagId == null) "" else "inner join $otg tg_incl on o.${o.id} = tg_incl.${otg.objId} and tg_incl.${otg.tagId} = $leastUsedTagId"}
                    where o.${o.type} = ${ObjectType.NOTE.intValue}
                    group by o.${o.id}
                    ${if (havingFilters.isEmpty()) "" else havingFilters.joinToString(prefix = "having ", separator = " and ")}
                ) o
                left join $n n on o.${o.id} = n.${n.noteId}
            ${if (whereFilters.isEmpty()) "" else whereFilters.joinToString(prefix = "where ", separator = " and ")}
            $orderBy
            $rowNumLimit
        """.trimIndent()

        return getRepo().readableDatabase.doInTransaction {
            val result = select(query = query, args = queryArgs.toTypedArray()) {
                val cardId = it.getLong()
                val updatedAt = it.getLong()
                val nextAccessAt = it.getLong()
                Note(
                    id = cardId,
                    createdAt = it.getLong(),
                    tagIds = (it.getStringOrNull()?:"").splitToSequence(",").filter { it.isNotBlank() }.map { it.toLong() }.toList(),
                    text = it.getString(),
                )
            }.rows
            ReadNotesByFilterResp(notes = result)
        }
    }


    private fun prepareNoteHistResp(
        note: Note,
        dataHistory: MutableList<NoteHistRecord>,
    ): NoteHistResp {
        dataHistory.add(0, NoteHistRecord(
            verId = -1,
            noteId = note.id,
            timestamp = if (dataHistory.isEmpty()) note.createdAt else dataHistory[0].timestamp,
            text = note.text,
        ))
        for (i in 1 .. dataHistory.size-2) {
            val dataHistRec = dataHistory.removeAt(i)
            dataHistory.add(i, dataHistRec.copy(timestamp = dataHistory[i].timestamp))
        }
        if (dataHistory.isNotEmpty()) {
            val lastDataHistRec = dataHistory.removeLast()
            dataHistory.add(lastDataHistRec.copy(timestamp = note.createdAt))
        }

        return NoteHistResp(
            isHistoryFull = true,
            dataHistory = dataHistory
        )
    }
}