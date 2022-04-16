package org.igye.taggednotes.dto.domain

data class ReadTopOverdueTranslateCardsResp(
    val cards: List<TranslateCard> = emptyList(),
    val nextCardIn: String = "",
)
