package org.igye.taggednotes.database

abstract class TableWithVersioning(name: String): Table(tableName = name) {
    val ver = VersionTable(name = name + "_VER")
}