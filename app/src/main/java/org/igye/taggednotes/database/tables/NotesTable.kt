package org.igye.taggednotes.database.tables

import android.database.sqlite.SQLiteDatabase
import org.igye.taggednotes.common.Utils
import org.igye.taggednotes.database.TableWithVersioning
import java.time.Clock

class NotesTable(
    private val clock: Clock,
    private val objs: ObjectsTable,
): TableWithVersioning(name = "NOTES") {
    val noteId = "NOTE_ID"
    val text = "TEXT"

    override fun create(db: SQLiteDatabase) {
        db.execSQL("""
                CREATE TABLE $this (
                    $noteId integer unique references $objs(${objs.id}) on update restrict on delete restrict,
                    $text text not null
                )
        """)
        db.execSQL("""
                CREATE TABLE $ver (
                    ${ver.verId} integer primary key autoincrement,
                    ${ver.timestamp} integer not null,
                    
                    $noteId integer not null,
                    $text text not null
                )
        """)
    }

    interface InsertStmt {operator fun invoke(noteId: Long, text: String): Long } lateinit var insert: InsertStmt
    interface UpdateStmt {operator fun invoke(noteId: Long, text: String): Int} lateinit var update: UpdateStmt
    interface DeleteStmt {operator fun invoke(noteId: Long): Int } lateinit var delete: DeleteStmt

    override fun prepareStatements(db: SQLiteDatabase) {
        val self = this
        val stmtVer = db.compileStatement("insert into $ver (${ver.timestamp},$noteId,$text) " +
                "select ?, $noteId, $text from $self where $noteId = ?")
        fun saveCurrentVersion(noteId: Long) {
            stmtVer.bindLong(1, clock.instant().toEpochMilli())
            stmtVer.bindLong(2, noteId)
            Utils.executeInsert(stmtVer)
        }
        insert = object : InsertStmt {
            val stmt = db.compileStatement("insert into $self ($noteId,$text) values (?,?)")
            override fun invoke(noteId: Long, text: String): Long {
                stmt.bindLong(1, noteId)
                stmt.bindString(2, text)
                return Utils.executeInsert(stmt)
            }
        }
        update = object : UpdateStmt {
            private val stmt = db.compileStatement("update $self set $text = ? where $noteId = ?")
            override fun invoke(noteId: Long, text: String): Int {
                saveCurrentVersion(noteId = noteId)
                stmt.bindString(1, text)
                stmt.bindLong(2, noteId)
                return Utils.executeUpdateDelete(stmt, 1)
            }

        }
        delete = object : DeleteStmt {
            private val stmt = db.compileStatement("delete from $self where $noteId = ?")
            override fun invoke(noteId: Long): Int {
                saveCurrentVersion(noteId = noteId)
                stmt.bindLong(1, noteId)
                return Utils.executeUpdateDelete(stmt, 1)
            }
        }
    }
}