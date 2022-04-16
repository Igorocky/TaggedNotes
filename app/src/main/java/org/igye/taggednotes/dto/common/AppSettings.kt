package org.igye.taggednotes.dto.common

import org.igye.taggednotes.dto.domain.DefaultDelayCoefs

data class AppSettings(
    val httpServerSettings: HttpServerSettings,
    val delayCoefs: List<String>? = null,
    val defaultDelayCoefs: DefaultDelayCoefs? = null,
    val maxDelay: String? = null
) {
    companion object {
        val defaultMaxDelay = "30d"
    }
}
