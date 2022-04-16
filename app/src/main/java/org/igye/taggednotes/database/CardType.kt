package org.igye.taggednotes.database

import org.igye.taggednotes.ErrorCode
import org.igye.taggednotes.common.MemoryRefreshException

enum class CardType(val intValue: Long) {
    TRANSLATION(intValue = 1),
    NOTE(intValue = 2);

    companion object {
        fun fromInt(intValue: Long): CardType {
            for (value in values()) {
                if (value.intValue == intValue) {
                    return value
                }
            }
            throw MemoryRefreshException(
                msg = "Unexpected CardType code of '$intValue'",
                errCode = ErrorCode.UNEXPECTED_CARD_TYPE_CODE
            )
        }
    }
}