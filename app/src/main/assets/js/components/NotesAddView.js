"use strict";

const USER_INPUT_TEXT_FIELD = 'user-input'
const NOTES_SEARCH_VIEW_MODE_ADD = 'NOTES_SEARCH_VIEW_MODE_ADD'
const NOTES_SEARCH_VIEW_MODE_SEARCH = 'NOTES_SEARCH_VIEW_MODE_SEARCH'

const NotesAddView = ({query,openView,setPageTitle,controlsContainer,mode = NOTES_SEARCH_VIEW_MODE_SEARCH}) => {
    const {renderMessagePopup, showMessage, confirmAction, showError, showMessageWithProgress} = useMessagePopup()

    const [filter, setFilter] = useState({})
    const [isEditFilterMode, setIsEditFilterMode] = useState(mode === NOTES_SEARCH_VIEW_MODE_SEARCH)
    const [selectedTags, setSelectedTags] = useState([])

    const {allTags, allTagsMap, errorLoadingTags} = useTags()

    const [foundNotes, setFoundNotes] = useState(null)
    const [errorLoadingNotes, setErrorLoadingNotes] = useState(null)

    const [newText, setNewText] = useState('')

    const pageSize = 100
    const {setCurrPageIdx,renderPaginationControls,pageFirstItemIdx,pageLastItemIdx} =
        usePagination({items:foundNotes, pageSize: pageSize, onlyArrowButtons:true})

    const [focusedNoteId, setFocusedNoteId] = useState(null)
    const [noteToEdit, setNoteToEdit] = useState(null)

    const [noteUpdateCounter, setNoteUpdateCounter] = useState(0)

    useEffect(() => {
        if (hasValue(allTagsMap)) {
            reloadNotes({filter})
        }
    }, [allTagsMap])

    useEffect(() => {
        if (hasValue(focusedNoteId) && hasNoValue(noteToEdit)) {
            document.getElementById(focusedNoteId)?.scrollIntoView()
        }
    }, [noteToEdit])

    async function reloadNotes({filter}) {
        setFoundNotes(null)
        if (isFilterEmpty(filter)) {
            filter = {rowsLimit: pageSize, sortBy: 'TIME_CREATED', sortDir: 'DESC'}
        }
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

    function isFilterEmpty(filter) {
        return (hasNoValue(filter.tagIdsToInclude) || filter.tagIdsToInclude.length === 0)
               && (hasNoValue(filter.tagIdsToExclude) || filter.tagIdsToExclude.length === 0)
               && (hasNoValue(filter.textContains) || filter.textContains.trim().length === 0)
               && hasNoValue(filter.createdFrom)
               && hasNoValue(filter.createdTill)
               && filter.hasNoTags !== true
    }

    function renderListOfNotes() {
        if (!isEditFilterMode) {
            if (hasNoValue(foundNotes)) {
                return 'Loading notes...'
            } else if (foundNotes.length == 0) {
                return 'There are no notes matching the search criteria.'
            } else {
                return RE.Container.col.top.left({},{style:{marginTop: '10px'}},
                    RE.Container.row.left.center({},{},
                        `Found ${foundNotes.length}`,
                        RE.If(foundNotes.length > pageSize, () => renderPaginationControls({})),
                    ),
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

    function doSearch(filter) {
        setIsEditFilterMode(false)
        setFilter(filter)
        reloadNotes({filter})
    }

    function renderFilter() {
        return re(NoteFilterCmp, {
            allTags,
            allTagsMap,
            filter,
            onSubmit: doSearch,
            onEdit: openFilter,
            onClear: null,
            minimized: !isEditFilterMode,
            noteUpdateCounter: noteUpdateCounter
        })
    }

    function createNewNoteIsAllowed() {
        return newText.trim().length > 0
    }

    async function createNewNote() {
        if (createNewNoteIsAllowed()) {
            const closeProgressIndicatorSave = showMessageWithProgress({text: 'Saving new note...'})
            const resSave = await be.createNote({text: newText, tagIds: filter.tagIdsToInclude??[]})
            closeProgressIndicatorSave()
            if (resSave.err) {
                await showError(resSave.err)
            } else {
                const newNoteId = resSave.data
                setNewText('')
                setNoteUpdateCounter(c => c + 1)
                const closeProgressIndicatorReload = showMessageWithProgress({text: 'Reloading new note...'})
                const res = await be.readNoteById({noteId: newNoteId})
                closeProgressIndicatorReload()
                if (res.err) {
                    await showError(res.err)
                } else {
                    setFoundNotes(prev => [res.data, ...prev])
                }
            }
            document.getElementById(USER_INPUT_TEXT_FIELD)?.focus()
        }
    }

    function renderAddNoteControls() {
        const disabled = !createNewNoteIsAllowed()
        return RE.Container.row.left.center({},{},
            textField({
                id: USER_INPUT_TEXT_FIELD,
                autoFocus: false,
                value: newText,
                label: 'New note',
                variant: 'outlined',
                multiline: true,
                maxRows: 10,
                size: 'small',
                inputProps: {cols:24, tabIndex:1},
                style: {},
                onChange: event => {
                    setNewText(event.nativeEvent.target.value)
                },
                onKeyUp: event => {
                    if (event.ctrlKey && event.keyCode === ENTER_KEY_CODE) {
                        createNewNote()
                    }
                },
            }),
            iconButton({
                iconName:'send',
                onClick: createNewNote,
                disabled,
                iconStyle:{color:disabled?'lightgrey':'blue'}
            })
        )
    }

    function renderTagSelector() {
        return re(TagSelector,{
            allTags,
            selectedTags,
            onTagRemoved:tag=>{
                setSelectedTags(prev=>prev.filter(t=>t.id!==tag.id))
            },
            onTagSelected:tag=>{
                setSelectedTags(prev=>[...prev, tag])
            },
            label: 'Tags',
            color:'primary',
        })
    }

    function renderPageContent() {
        if (errorLoadingTags) {
            return RE.Fragment({},
                `An error occurred during loading of tags: [${errorLoadingTags.code}] - ${errorLoadingTags.msg}`,
            )
        } else if (hasNoValue(allTags) || hasNoValue(allTagsMap)) {
            return 'Loading tags...'
        } else if (errorLoadingNotes) {
            return RE.Fragment({},
                `An error occurred during loading of notes: [${errorLoadingNotes.code}] - ${errorLoadingNotes.msg}`,
            )
        } else if (hasValue(noteToEdit)) {
            return re(EditNoteCmp, {
                allTags, allTagsMap, note: noteToEdit,
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
        } else if (isEditFilterMode) {
            return renderFilter()
        } else if (mode === NOTES_SEARCH_VIEW_MODE_SEARCH) {
            return RE.Container.col.top.left({style: {marginTop: '5px'}}, {style: {marginBottom: '10px'}},
                renderAddNoteControls(),
                renderFilter(),
                renderListOfNotes()
            )
        } else {
            return RE.Container.col.top.left({style: {marginTop: '5px'}}, {style: {marginBottom: '10px'}},
                renderAddNoteControls(),
                renderTagSelector(),
                renderListOfNotes()
            )
        }
    }

    return RE.Fragment({},
        renderPageContent(),
        renderMessagePopup()
    )
}
