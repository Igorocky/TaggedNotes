package org.igye.taggednotes.dto.domain

import org.igye.taggednotes.database.ObjectType

data class CardOverdue(
    val cardId: Long,
    val objectType: ObjectType,
    val overdue: Double
)
