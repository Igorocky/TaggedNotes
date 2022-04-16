package org.igye.taggednotes.dto.domain

data class NoteHistResp(
    val isHistoryFull: Boolean,
    val dataHistory: List<NoteHistRecord>,
)
