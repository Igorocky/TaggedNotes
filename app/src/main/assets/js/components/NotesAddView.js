"use strict";

const NotesAddView = ({query,openView,setPageTitle,controlsContainer}) => {

    const {renderMessagePopup, showDialog, confirmAction, showError, showMessageWithProgress} = useMessagePopup()
    const {allTags, allTagsMap, errorLoadingTags} = useTags()
    const {renderListOfNotes, reloadNotes, noteWasCreated} = UseListOfNotes({
        titleFn: () => `Latest notes:`, allTags, allTagsMap,
        showDialog, confirmAction, showError, showMessageWithProgress
    })

    const numberOfLatestNotesToLoad = 50
    useEffect(() => {
        if (hasValue(allTagsMap)) {
            reloadNotes({filter:{rowsLimit: numberOfLatestNotesToLoad, sortBy: 'TIME_CREATED', sortDir: 'DESC'}})
        }
    }, [allTagsMap])

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
                    onNoteCreated: newNoteId => noteWasCreated({noteId:newNoteId}),
                    showError, showMessageWithProgress
                }),
                renderListOfNotes(),
            )
        }
    }

    return RE.Fragment({},
        renderPageContent(),
        renderMessagePopup()
    )
}
