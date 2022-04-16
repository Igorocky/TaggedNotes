package org.igye.taggednotes.dto.common

data class HttpServerState(val isRunning: Boolean, val url: String?, val settings: HttpServerSettings)