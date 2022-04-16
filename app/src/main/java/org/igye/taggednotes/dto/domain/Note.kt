package org.igye.taggednotes.dto.domain

import org.igye.taggednotes.database.ObjectType

data class Note(
    val id: Long,
    val createdAt: Long,
    val tagIds: List<Long>,
    val text:String,
) {
    val type = ObjectType.NOTE
}
