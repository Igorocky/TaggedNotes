package org.igye.taggednotes.database.tables

import android.database.sqlite.SQLiteDatabase
import org.igye.taggednotes.common.Utils
import org.igye.taggednotes.database.Table
import java.time.Clock

class TagsTable(private val clock: Clock): Table(tableName = "TAGS") {
    val id = "ID"
    val createdAt = "CREATED_AT"
    val name = "NAME"

    override fun create(db: SQLiteDatabase) {
        db.execSQL("""
                CREATE TABLE $this (
                    $id integer primary key autoincrement,
                    $createdAt integer not null,
                    $name text not null unique
                )
        """)
    }

    interface InsertStmt {operator fun invoke(name: String): Long } lateinit var insert: InsertStmt
    interface UpdateStmt {operator fun invoke(id:Long, name: String): Int} lateinit var update: UpdateStmt
    interface DeleteStmt {operator fun invoke(id:Long): Int } lateinit var delete: DeleteStmt

    override fun prepareStatements(db: SQLiteDatabase) {
        val self = this
        insert = object : InsertStmt {
            val stmt = db.compileStatement("insert into $self ($createdAt,$name) values (?,?)")
            override fun invoke(name: String): Long {
                val currTime = clock.instant().toEpochMilli()
                stmt.bindLong(1, currTime)
                stmt.bindString(2, name)
                return Utils.executeInsert(stmt)
            }
        }
        update = object : UpdateStmt {
            private val stmt = db.compileStatement("update $self set $name = ? where $id = ?")
            override fun invoke(id: Long, name: String): Int {
                stmt.bindString(1, name)
                stmt.bindLong(2, id)
                return Utils.executeUpdateDelete(stmt, 1)
            }

        }
        delete = object : DeleteStmt {
            private val stmt = db.compileStatement("delete from $self where $id = ?")
            override fun invoke(id:Long): Int {
                stmt.bindLong(1, id)
                return Utils.executeUpdateDelete(stmt, 1)
            }
        }
    }
}