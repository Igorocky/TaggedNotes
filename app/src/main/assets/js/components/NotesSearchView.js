"use strict";

const USER_INPUT_TEXT_FIELD = 'user-input'

const NotesSearchView = ({query,openView,setPageTitle,controlsContainer}) => {

    const {renderMessagePopup, showDialog, confirmAction, showError, showMessageWithProgress} = useMessagePopup()
    const {allTags, allTagsMap, errorLoadingTags} = useTags()
    const {reloadObjToTagsMap, renderFilter} = UseNoteFilter({
        allTagsMap,
        onSubmit: filter => reloadNotes({filter}),
        onEdit: openExpandedFilter,
        showError, showDialog
    })
    const {renderListOfNotes, reloadNotes, noteWasCreated} = UseListOfNotes({
        titleFn: notes => `Found ${notes.length}`, pageSize:100, allTags, allTagsMap,
        onNoteUpdated: reloadObjToTagsMap, onNoteDeleted: reloadObjToTagsMap,
        showDialog, confirmAction, showError, showMessageWithProgress
    })
    const [selectedTagIds, setSelectedTagIds] = useState([])

    const [allTagsLoaded, setAllTagsLoaded] = useState(false)
    useEffect(() => {
        if (hasValue(allTagsMap)) {
            setAllTagsLoaded(true)
            openExpandedFilter()
        }
    }, [allTagsMap])

    const renderFilterRef = useFuncRef(renderFilter)
    const reloadNotesRef = useFuncRef(reloadNotes)
    async function openExpandedFilter() {
        await showDialog({
            title: 'Search criteria:',
            fullScreen: true,
            contentRenderer: resolve => {
                return renderFilterRef({
                    minimized: false,
                    onSubmit: filter => {
                        resolve()
                        setSelectedTagIds(filter.tagIdsToInclude??[])
                        reloadNotesRef({filter})
                    }
                })
            }
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
            return RE.Container.col.top.left({style: {marginTop: '5px'}}, {style: {marginBottom: '10px'}},
                re(AddNewNoteCmp,{
                    allTags, allTagsMap,
                    selectedTagIds,
                    onNoteCreated: newNoteId => {
                        noteWasCreated({noteId:newNoteId})
                        reloadObjToTagsMap()
                    },
                    showError, showMessageWithProgress
                }),
                renderFilter({minimized: true}),
                renderListOfNotes(),
            )
        }
    }

    return RE.Fragment({},
        renderPageContent(),
        renderMessagePopup()
    )
}
