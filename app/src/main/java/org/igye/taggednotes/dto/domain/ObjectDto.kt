package org.igye.taggednotes.dto.domain

import org.igye.taggednotes.database.ObjectType

open class ObjectDto(
    val id: Long,
    val type: ObjectType,
    val createdAt: Long,
    val tagIds: List<Long>,
)
