package org.igye.taggednotes.dto.domain

data class TranslateCardHistResp(
    val isHistoryFull: Boolean,
    val dataHistory: List<TranslateCardHistRecord>,
)
