package org.igye.taggednotes.database

import org.igye.taggednotes.manager.RepositoryManager
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

class TagsStat(
    private val repositoryManager: RepositoryManager
) {
    private val changeCnt = AtomicInteger(0)
    private val tagUsageCounts = AtomicReference<Map<Long,Long>>(null)

    fun reset() {
        tagUsageCounts.set(null)
    }

    fun tagsCouldChange() {
        changeCnt.incrementAndGet()
    }

    fun getLeastUsedTagId(tagIds: List<Long>): Long {
        if (tagIds.size == 1) {
            return tagIds[0]
        } else {
            val stat = getTagUsageCounts()
            return tagIds.minByOrNull { stat[it]?:0 }!!
        }
    }

    private val objToTag = repositoryManager.getRepo().objToTag
    private val getTagUsageCountsQuery = "select ${objToTag.tagId} id, count(1) cnt from $objToTag group by ${objToTag.tagId}"
    private val getTagUsageCountsColumnNames = arrayOf("id", "cnt")
    private fun getTagUsageCounts(): Map<Long,Long> {
        if (tagUsageCounts.get() == null || changeCnt.get() > 100) {
            synchronized(this) {
                if (tagUsageCounts.get() == null || changeCnt.get() > 100) {
                    tagUsageCounts.set(
                        repositoryManager.getRepo().readableDatabase.select(
                            query = getTagUsageCountsQuery,
                            columnNames = getTagUsageCountsColumnNames
                        ) {
                            Pair(it.getLong(), it.getLong())
                        }.rows.toMap()
                    )
                    changeCnt.set(0)
                }
            }
        }
        return tagUsageCounts.get()
    }
}