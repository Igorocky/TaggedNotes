package org.igye.taggednotes.database.tables

import android.database.sqlite.SQLiteDatabase
import org.igye.taggednotes.common.Utils
import org.igye.taggednotes.database.Table

class ObjectToTagTable(
    private val objects: ObjectsTable,
    private val tags: TagsTable,
): Table(tableName = "OBJ_TO_TAG") {
    val objId = "OBJ_ID"
    val tagId = "TAG_ID"

    override fun create(db: SQLiteDatabase) {
        db.execSQL("""
                CREATE TABLE $this (
                    $objId integer references $objects(${objects.id}) on update restrict on delete restrict,
                    $tagId integer references $tags(${tags.id}) on update restrict on delete restrict
                )
        """)
        db.execSQL("""
                CREATE UNIQUE INDEX IDX_${this}_${tagId}_${objId} on $this ( $tagId, $objId )
        """)
        db.execSQL("""
                CREATE INDEX IDX_${this}_${objId} on $this ( $objId )
        """)
    }

    interface InsertStmt {operator fun invoke(objId: Long, tagId: Long): Long } lateinit var insert: InsertStmt
    interface DeleteStmt {operator fun invoke(objId: Long, tagId: Long? = null): Int } lateinit var delete: DeleteStmt

    override fun prepareStatements(db: SQLiteDatabase) {
        val self = this
        insert = object : InsertStmt {
            val stmt = db.compileStatement("insert into $self ($objId,$tagId) values (?,?)")
            override fun invoke(objId: Long, tagId: Long): Long {
                stmt.bindLong(1, objId)
                stmt.bindLong(2, tagId)
                return Utils.executeInsert(stmt)
            }
        }
        delete = object : DeleteStmt {
            private val stmtDeleteByObjAndTag = db.compileStatement("delete from $self where $objId = ? and $tagId = ?")
            private val stmtDeleteByObj = db.compileStatement("delete from $self where $objId = ?")
            override fun invoke(objId: Long, tagId: Long?): Int {
                if (tagId != null) {
                    stmtDeleteByObjAndTag.bindLong(1, objId)
                    stmtDeleteByObjAndTag.bindLong(2, tagId)
                    return Utils.executeUpdateDelete(stmtDeleteByObjAndTag)
                } else {
                    stmtDeleteByObj.bindLong(1, objId)
                    return Utils.executeUpdateDelete(stmtDeleteByObj)
                }
            }
        }
    }
}