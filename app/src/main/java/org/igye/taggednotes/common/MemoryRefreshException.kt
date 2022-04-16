package org.igye.taggednotes.common

import org.igye.taggednotes.ErrorCode

class MemoryRefreshException(val msg: String, val errCode: ErrorCode): Exception(msg)