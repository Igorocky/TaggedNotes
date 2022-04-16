package org.igye.taggednotes.dto.domain

data class ReadTopOverdueTranslateCardsResp(
    val cards: List<Note> = emptyList(),
    val nextCardIn: String = "",
)
