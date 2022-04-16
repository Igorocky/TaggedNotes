package org.igye.taggednotes.dto.domain

data class NoteHistRecord(
    val noteId: Long,
    val verId: Long,
    val timestamp: Long,
    val text: String,
)