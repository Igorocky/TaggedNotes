package org.igye.taggednotes.common

import org.igye.taggednotes.ErrorCode

class TaggedNotesException(val msg: String, val errCode: ErrorCode): Exception(msg)