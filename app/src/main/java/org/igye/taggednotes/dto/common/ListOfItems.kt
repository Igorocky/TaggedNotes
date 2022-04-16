package org.igye.taggednotes.dto.common

data class ListOfItems<T>(val complete: Boolean, val items: List<T>)