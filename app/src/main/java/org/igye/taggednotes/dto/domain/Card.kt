package org.igye.taggednotes.dto.domain

import org.igye.taggednotes.database.CardType

open class Card(
    val id: Long,
    val type: CardType,
    val paused: Boolean,
    val lastCheckedAt: Long,
    val tagIds: List<Long>,
    val schedule: CardSchedule,
)
