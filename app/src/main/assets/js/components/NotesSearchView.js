"use strict";

const NotesSearchView = ({query,openView,setPageTitle,controlsContainer}) => {
    const {renderMessagePopup, showMessage, confirmAction, showError, showMessageWithProgress} = useMessagePopup()

    const [filter, setFilter] = useState({})
    const [isEditFilterMode, setIsEditFilterMode] = useState(true)

    const {allTags, allTagsMap, errorLoadingTags} = useTags()

    const [foundNotes, setFoundNotes] = useState(null)
    const [errorLoadingNotes, setErrorLoadingNotes] = useState(null)

    const pageSize = 100
    const {setCurrPageIdx,renderPaginationControls,pageFirstItemIdx,pageLastItemIdx} =
        usePagination({items:foundNotes, pageSize: pageSize, onlyArrowButtons:true})

    const [focusedNoteId, setFocusedNoteId] = useState(null)
    const [noteToEdit, setNoteToEdit] = useState(null)

    const [noteUpdateCounter, setNoteUpdateCounter] = useState(0)

    useEffect(() => {
        if (hasValue(focusedNoteId) && hasNoValue(noteToEdit)) {
            document.getElementById(focusedNoteId)?.scrollIntoView()
        }
    }, [noteToEdit])

    async function reloadNotes({filter}) {
        setFoundNotes(null)
        const res = await be.readNotesByFilter(filter)
        if (res.err) {
            setErrorLoadingNotes(res.err)
            showError(res.err)
        } else {
            const foundNotesResponse = res.data.notes
            for (const note of foundNotesResponse) {
                note.tagIds = note.tagIds.map(id => allTagsMap[id]).sortBy('name').map(t=>t.id)
            }
            setFoundNotes(foundNotesResponse)
            setCurrPageIdx(0)
        }
    }

    function renderListOfNotes() {
        if (!isEditFilterMode) {
            if (hasNoValue(foundNotes)) {
                return 'Loading notes...'
            } else if (foundNotes.length == 0) {
                return 'There are no notes matching the search criteria.'
            } else {
                return RE.Container.col.top.left({},{style:{marginTop: '10px'}},
                    RE.If(foundNotes.length > pageSize, () => renderPaginationControls({})),
                    re(ListOfObjectsCmp,{
                        objects: foundNotes,
                        beginIdx: pageFirstItemIdx,
                        endIdx: pageLastItemIdx,
                        onObjectClicked: noteId => setFocusedNoteId(prev => prev !== noteId ? noteId : null),
                        renderObject: (note,idx) => RE.Paper(
                            {id:note.id,style:{backgroundColor:note.paused?'rgb(242, 242, 242)':'rgb(255, 249, 230)'}},
                            renderNote(note,idx)
                        )
                    }),
                    RE.If(foundNotes.length > pageSize, () => renderPaginationControls({onPageChange: () => window.scrollTo(0, 0)})),
                )
            }
        }
    }

    async function deleteNote({note}) {
        if (await confirmAction({text: `Delete this note? "${truncateToMaxLength(20,note.text)}"`, okBtnColor: 'secondary'})) {
            setNoteUpdateCounter(prev => prev + 1)
            const closeProgressIndicator = showMessageWithProgress({text: 'Deleting...'})
            const res = await be.deleteNote({noteId:note.id})
            closeProgressIndicator()
            if (res.err) {
                await showError(res.err)
                openFilter()
            } else {
                setFoundNotes(prev => prev.filter(n => n.id !== note.id))
            }
        }
    }

    function truncateToMaxLength(maxLength,text) {
        return text.substring(0,maxLength) + (text.length > maxLength ? '...' : '')
    }

    function renderNoteText(text) {
        if (text.indexOf('\n') >= 0) {
            return multilineTextToTable({text})
        } else {
            return text
        }
    }

    function renderNote(note, idx) {
        const noteElem = RE.Fragment({},
            RE.div(
                {style:{borderBottom:'solid 1px lightgrey', padding:'3px'}},
                RE.span({style:{fontWeight:'bold'}},`${idx+1}. `),
                renderListOfTags({
                    tags: note.tagIds.map(id => allTagsMap[id]),
                })
            ),
            RE.div(
                {style:{borderBottom:'solid 1px lightgrey', padding:'3px'}},
                RE.span({style:{}},renderNoteText(note.text))
            ),
        )
        if (focusedNoteId === note.id) {
            return RE.Container.col.top.left({}, {},
                RE.Container.row.left.center({}, {},
                    iconButton({iconName: 'delete', onClick: () => deleteNote({note})}),
                    iconButton({iconName: 'edit', onClick: () => setNoteToEdit(note)}),
                ),
                noteElem
            )
        } else {
            return noteElem
        }
    }

    function openFilter() {
        setNoteToEdit(null)
        setIsEditFilterMode(true)
        setFoundNotes(null)
        setFocusedNoteId(null)
    }

    function renderFilter() {
        return re(NoteFilterCmp, {
            allTags,
            allTagsMap,
            filter,
            onSubmit: filter => {
                setIsEditFilterMode(false)
                setFilter(filter)
                reloadNotes({filter})
            },
            minimized: !isEditFilterMode,
            noteUpdateCounter: noteUpdateCounter
        })
    }

    function renderPageContent() {
        if (errorLoadingTags) {
            return RE.Fragment({},
                `An error occurred during loading of tags: [${errorLoadingTags.code}] - ${errorLoadingTags.msg}`,
            )
        } else if (hasNoValue(allTags) || hasNoValue(allTagsMap)) {
            return 'Loading tags...'
        } else {
            let notesOrEditCmp
            if (hasValue(noteToEdit)) {
                notesOrEditCmp = re(EditNoteCmp,{
                    allTags, allTagsMap, note:noteToEdit,
                    onCancelled: () => setNoteToEdit(null),
                    onSaved: async () => {
                        setNoteUpdateCounter(prev => prev + 1)
                        const closeProgressIndicator = showMessageWithProgress({text: 'Reloading changed note...'})
                        const res = await be.readNoteById({noteId: noteToEdit.id})
                        closeProgressIndicator()
                        if (res.err) {
                            await showError(res.err)
                            openFilter()
                        } else {
                            setNoteToEdit(null)
                            setFoundNotes(prev => prev.map(note => note.id === noteToEdit.id ? res.data : note))
                        }
                    },
                    onDeleted: () => {
                        setNoteUpdateCounter(prev => prev + 1)
                        setNoteToEdit(null)
                        setFoundNotes(prev => prev.filter(note => note.id !== noteToEdit.id))
                    }
                })
            } else {
                notesOrEditCmp = renderListOfNotes()
            }
            return RE.Container.col.top.left({style: {marginTop:'5px'}},{style:{marginBottom:'10px'}},
                renderFilter(),
                notesOrEditCmp
            )
        }
    }

    return RE.Fragment({},
        RE.If(controlsContainer?.current, () => RE.Portal({container:controlsContainer.current},
            RE.If(!isEditFilterMode && hasValue(foundNotes), () => RE.span({style:{marginLeft:'15px'}}, foundNotes.length)),
            RE.IfNot(isEditFilterMode, () => RE.Fragment({},
                iconButton({iconName:'filter_alt', onClick: openFilter})
            )),
        )),
        renderPageContent(),
        renderMessagePopup()
    )
}
