package org.igye.taggednotes.database.tables

import android.database.sqlite.SQLiteDatabase
import org.igye.taggednotes.common.Utils
import org.igye.taggednotes.database.ObjectType
import org.igye.taggednotes.database.TableWithVersioning
import java.time.Clock

class ObjectsTable(private val clock: Clock): TableWithVersioning(name = "OBJECTS") {
    val id = "ID"
    val type = "TYPE"
    val createdAt = "CREATED_AT"

    override fun create(db: SQLiteDatabase) {
        db.execSQL("""
                CREATE TABLE $this (
                    $id integer primary key autoincrement,
                    $type integer not null,
                    $createdAt integer not null
                )
        """)
        db.execSQL("""
                CREATE TABLE $ver (
                    ${ver.verId} integer primary key autoincrement,
                    ${ver.timestamp} integer not null,
                    
                    $id integer not null,
                    $type integer not null,
                    $createdAt integer not null
                )
        """)
    }

    interface InsertStmt {operator fun invoke(objectType: ObjectType): Long } lateinit var insert: InsertStmt
    interface DeleteStmt {operator fun invoke(id:Long): Int } lateinit var delete: DeleteStmt

    override fun prepareStatements(db: SQLiteDatabase) {
        val self = this
        val stmtVer = db.compileStatement("insert into $ver (${ver.timestamp},$id,$type,$createdAt) " +
                "select ?, $id, $type, $createdAt from $self where $id = ?")
        fun saveCurrentVersion(id: Long) {
            stmtVer.bindLong(1, clock.instant().toEpochMilli())
            stmtVer.bindLong(2, id)
            Utils.executeInsert(stmtVer)
        }
        insert = object : InsertStmt {
            val stmt = db.compileStatement("insert into $self ($type,$createdAt) values (?,?)")
            override fun invoke(objectType: ObjectType): Long {
                stmt.bindLong(1, objectType.intValue)
                stmt.bindLong(2, clock.instant().toEpochMilli())
                return Utils.executeInsert(stmt)
            }
        }
        delete = object : DeleteStmt {
            private val stmt = db.compileStatement("delete from $self where $id = ?")
            override fun invoke(id:Long): Int {
                saveCurrentVersion(id = id)
                stmt.bindLong(1, id)
                return Utils.executeUpdateDelete(stmt, 1)
            }
        }
    }
}