package org.igye.taggednotes.dto.domain

data class NoteCardHistResp(
    val isHistoryFull: Boolean,
    val dataHistory: List<NoteCardHistRecord>,
)
