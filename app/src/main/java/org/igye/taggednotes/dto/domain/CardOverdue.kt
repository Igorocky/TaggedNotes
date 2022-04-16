package org.igye.taggednotes.dto.domain

import org.igye.taggednotes.database.CardType

data class CardOverdue(
    val cardId: Long,
    val cardType: CardType,
    val overdue: Double
)
