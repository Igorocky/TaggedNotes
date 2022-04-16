package org.igye.taggednotes.dto.common

import org.igye.taggednotes.ErrorCode
import org.igye.taggednotes.common.TaggedNotesException

data class BeRespose<T>(val data: T? = null, val err: BeErr? = null) {
    fun <B> mapData(mapper:(T) -> B): BeRespose<B> = if (data != null) {
        BeRespose(data = mapper(data))
    } else {
        (this as BeRespose<B>)
    }

    companion object {
        operator fun <T> invoke(errCode: ErrorCode, errHandler: ((Exception) -> T)? = null, body: () -> T): BeRespose<T> {
            return try {
                BeRespose(data = body())
            } catch (ex: Exception) {
                try {
                    BeRespose(data = if (errHandler != null) errHandler(ex) else throw ex)
                }  catch (ex2: Exception) {
                    BeRespose(
                        err = BeErr(
                            code = (if (ex2 is TaggedNotesException) ex2.errCode.code else null)?:errCode.code,
                            msg = if (ex2 is TaggedNotesException) ex2.msg else ("${ex2.message} (${ex2.javaClass.canonicalName})")
                        )
                    )
                }
            }
        }
    }
}
