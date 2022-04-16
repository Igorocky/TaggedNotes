package org.igye.taggednotes.database

import org.igye.taggednotes.ErrorCode
import org.igye.taggednotes.common.TaggedNotesException

enum class ObjectType(val intValue: Long) {
    NOTE(intValue = 1);

    companion object {
        fun fromInt(intValue: Long): ObjectType {
            for (value in values()) {
                if (value.intValue == intValue) {
                    return value
                }
            }
            throw TaggedNotesException(
                msg = "Unexpected CardType code of '$intValue'",
                errCode = ErrorCode.UNEXPECTED_CARD_TYPE_CODE
            )
        }
    }
}