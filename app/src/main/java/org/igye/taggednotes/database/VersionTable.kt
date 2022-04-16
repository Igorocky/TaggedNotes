package org.igye.taggednotes.database

open class VersionTable(name: String): Table(tableName = name) {
    val verId = "VER_ID"
    val timestamp = "TIMESTAMP"
}