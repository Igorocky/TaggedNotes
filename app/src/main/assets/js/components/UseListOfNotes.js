"use strict";

const UseListOfNotes = ({
                            titleFn, pageSize,
                            onNoteUpdated, onNoteDeleted,
                            allTags, allTagsMap,
                            showDialog, confirmAction, showError, showMessageWithProgress
                        }) => {

    const [foundNotes, setFoundNotes] = useState(null)
    const [errorLoadingNotes, setErrorLoadingNotes] = useState(null)
    const [focusedNoteId, setFocusedNoteId] = useState(null)

    const {setCurrPageIdx,renderPaginationControls,pageFirstItemIdx,pageLastItemIdx} =
        usePagination({items:foundNotes, pageSize, onlyArrowButtons:true})

    async function reloadNotes({filter}) {
        setFoundNotes(null)
        const res = await be.readNotesByFilter(filter)
        if (res.err) {
            setErrorLoadingNotes(res.err)
            showError(res.err)
        } else {
            const foundNotesResponse = res.data.notes
            for (const note of foundNotesResponse) {
                note.tagIds = note.tagIds.map(id => allTagsMap[id]).sortBy('name').map(tag=>tag.id)
                note.tags = note.tagIds.map(id => allTagsMap[id])
            }
            setFoundNotes(foundNotesResponse)
        }
    }

    function renderListOfNotes() {
        if (errorLoadingNotes) {
            return RE.Fragment({},
                `An error occurred during loading of notes: [${errorLoadingNotes.code}] - ${errorLoadingNotes.msg}`,
            )
        } else if (hasNoValue(foundNotes)) {
            return 'Loading notes...'
        } else if (foundNotes.length == 0) {
            return 'There are no notes.'
        } else {
            const usePagination = hasValue(pageSize)
            return RE.Container.col.top.left({},{style:{marginTop: '10px'}},
                RE.Container.row.left.center({},{},
                    titleFn(foundNotes),
                    RE.If(usePagination && foundNotes.length > pageSize, () => renderPaginationControls({})),
                ),
                re(ListOfObjectsCmp,{
                    objects: foundNotes,
                    beginIdx: usePagination?pageFirstItemIdx:0,
                    endIdx: usePagination?pageLastItemIdx:foundNotes.length,
                    onObjectClicked: noteId => setFocusedNoteId(prev => prev !== noteId ? noteId : null),
                    renderObject: (note,idx) => RE.Paper({},
                        re(NoteShortViewCmp,{
                            note,
                            idx,
                            isFocused: focusedNoteId === note.id,
                            onDelete: () => deleteNote({note}),
                            onEdit: () => openEditNoteDialog({note}),
                            allTagsMap,
                        })
                    )
                }),
            )
        }
    }

    async function loadNoteById({noteId, title}) {
        const closeProgressIndicator = showMessageWithProgress({text: title})
        const res = await be.readNoteById({noteId: noteId})
        closeProgressIndicator()
        if (res.err) {
            await showError(res.err)
        } else {
            const note = res.data
            note.tagIds = note.tagIds.map(id => allTagsMap[id]).sortBy('name').map(tag=>tag.id)
            note.tags = note.tagIds.map(id => allTagsMap[id])
            return note
        }
    }

    async function noteWasCreated({noteId}) {
        const newNote = await loadNoteById({noteId, title: 'Reloading new note...'})
        if (hasValue(newNote)) {
            setFoundNotes(prev => [newNote, ...prev])
        }
    }

    async function noteWasUpdated({noteId}) {
        const newNote = await loadNoteById({noteId, title: 'Reloading changed note...'})
        if (hasValue(newNote)) {
            setFoundNotes(prev => prev.map(note => note.id === newNote.id ? newNote : note))
        }
        onNoteUpdated?.({noteId})
    }

    async function noteWasDeleted({noteId}) {
        setFoundNotes(prev => prev.filter(n => n.id !== noteId))
        onNoteDeleted?.({noteId})
    }

    async function deleteNote({note}) {
        if (await confirmAction({text: `Delete this note? "${truncateToMaxLength(20,note.text)}"`, okBtnColor: 'secondary'})) {
            const closeProgressIndicator = showMessageWithProgress({text: 'Deleting...'})
            const res = await be.deleteNote({noteId:note.id})
            closeProgressIndicator()
            if (res.err) {
                await showError(res.err)
            } else {
                noteWasDeleted({noteId:note.id})
            }
        }
    }

    function truncateToMaxLength(maxLength,text) {
        return text.substring(0,maxLength) + (text.length > maxLength ? '...' : '')
    }

    async function openEditNoteDialog({note}) {
        await showDialog({
            title: 'Edit note:',
            fullScreen: true,
            contentRenderer: resolve => {
                return re(EditNoteCmp, {
                    allTags, allTagsMap, note,
                    onCancelled: () => resolve(),
                    onSaved: () => {
                        noteWasUpdated({noteId:note.id})
                        resolve()
                    },
                    onDeleted: () => {
                        noteWasDeleted({noteId:note.id})
                        resolve()
                    }
                })
            }
        })
    }

    return {renderListOfNotes, reloadNotes, noteWasCreated}
}
