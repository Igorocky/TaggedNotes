package org.igye.taggednotes.dto.domain

data class NoteCardHistRecord(
    val cardId: Long,
    val verId: Long,
    val timestamp: Long,
    val text: String,
)