package org.igye.taggednotes.dto.domain

data class ReadTopOverdueNoteCardsResp(
    val cards: List<NoteCard> = emptyList(),
    val nextCardIn: String = "",
)
