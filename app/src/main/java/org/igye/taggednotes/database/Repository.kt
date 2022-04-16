package org.igye.taggednotes.database

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import androidx.core.database.sqlite.transaction
import org.igye.taggednotes.ErrorCode
import org.igye.taggednotes.common.TaggedNotesException
import org.igye.taggednotes.database.tables.*

class Repository(
    context: Context,
    val dbName: String?,
    val objs: ObjectsTable,
    val tags: TagsTable,
    val objToTag: ObjectToTagTable,
    val notes: NotesTable
) : SQLiteOpenHelper(context, dbName, null, DATABASE_VERSION) {
    private val allTables = listOf(objs, tags, objToTag, notes)

    override fun onCreate(db: SQLiteDatabase) {
        db.transaction {
            allTables.forEach { it.create(db) }
        }
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (newVersion < oldVersion) {
            throw TaggedNotesException(
                msg = "Downgrade of the database is not supported.",
                errCode = ErrorCode.DOWNGRADE_IS_NOT_SUPPORTED
            )
        }
        var version = oldVersion
        while (version < newVersion) {
            incVersion(db, version)
            version++
        }
    }

    override fun onConfigure(db: SQLiteDatabase?) {
        super.onConfigure(db)
        db!!.setForeignKeyConstraintsEnabled(true)
    }

    override fun onOpen(db: SQLiteDatabase) {
        super.onOpen(db)
        val actualDbVersion: Int = db.select("PRAGMA user_version") { it.getLong() }.rows[0].toInt()
        if (actualDbVersion != DATABASE_VERSION) {
            throw TaggedNotesException(
                msg = "Database version mismatch: expected $DATABASE_VERSION, actual $actualDbVersion.",
                errCode = ErrorCode.DATABASE_VERSION_MISMATCH
            )
        }
        allTables.forEach { it.prepareStatements(db) }
    }

    private fun incVersion(db: SQLiteDatabase, oldVersion: Int) {
        throw TaggedNotesException(
            msg = "Upgrade for a database of version $oldVersion is not implemented.",
            errCode = ErrorCode.UPGRADE_IS_NOT_IMPLEMENTED
        )
    }


    /**
     * https://www.sqlite.org/lang_altertable.html
     *     -> 6. Making Other Kinds Of Table Schema Changes
     */
    private fun recreateTable(
        db: SQLiteDatabase,
        tableName: String,
        createTableBody: String,
        oldColumnNames: List<String>,
        newColumnNames: List<String>? = null,
        reconstructIndexes: List<String>? = null,
    ) {
        try {
            //1. If foreign key constraints are enabled, disable them using PRAGMA foreign_keys=OFF.
            db.execSQL("PRAGMA foreign_keys=OFF")
            //2. Start a transaction.
            db.doInTransaction {
                //3. Remember the format of all indexes, triggers, and views associated with table X.
                // This information will be needed in step 8 below. One way to do this is to run a query like
                // the following: SELECT type, sql FROM sqlite_schema WHERE tbl_name='X'.
                // NOTE: This step is not used in this implementation because of 'reconstructIndexes' parameter.

                //4. Use CREATE TABLE to construct a new table "new_X" that is in the desired revised format of table X.
                // Make sure that the name "new_X" does not collide with any existing table name, of course.
                execSQL("CREATE TABLE new_$tableName $createTableBody")

                //5. Transfer content from X into new_X using a statement like: INSERT INTO new_X SELECT ... FROM X.
                execSQL("""
                    INSERT INTO new_$tableName (${(newColumnNames?:oldColumnNames).joinToString(separator = ",")}) SELECT ${oldColumnNames.joinToString(separator = ",")} FROM $tableName
                """.trimIndent())

                //6. Drop the old table X: DROP TABLE X.
                execSQL("DROP TABLE $tableName")

                //7. Change the name of new_X to X using: ALTER TABLE new_X RENAME TO X.
                execSQL("ALTER TABLE new_$tableName RENAME TO $tableName")

                //8. Use CREATE INDEX, CREATE TRIGGER, and CREATE VIEW to reconstruct indexes, triggers, and views
                // associated with table X. Perhaps use the old format of the triggers, indexes, and views saved from
                // step 3 above as a guide, making changes as appropriate for the alteration.
                reconstructIndexes?.forEach { execSQL(it) }

                //9. If any views refer to table X in a way that is affected by the schema change, then drop those views
                // using DROP VIEW and recreate them with whatever changes are necessary to accommodate the schema
                // change using CREATE VIEW.

                //10. If foreign key constraints were originally enabled then run PRAGMA foreign_key_check to verify
                // that the schema change did not break any foreign key constraints.
                execSQL("PRAGMA foreign_key_check")

                //11. Commit the transaction started in step 2.
            }
        } finally {
            //12. If foreign keys constraints were originally enabled, reenable them now.
            db.execSQL("PRAGMA foreign_keys=ON")
        }
    }

    companion object {
        const val DATABASE_VERSION = 1
    }
}

