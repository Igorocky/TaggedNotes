"use strict";

const TEXT_ID = 'textId'

const CreateNoteView = ({query,openView,setPageTitle}) => {
    const {renderMessagePopup, showError, showMessageWithProgress} = useMessagePopup()

    const [allTags, setAllTags] = useState(null)
    const [allTagsMap, setAllTagsMap] = useState(null)
    const [errorLoadingTags, setErrorLoadingTags] = useState(null)

    const [text, setText] = useState('')
    const [tagIds, setTagIds] = useState([])
    const [noteCounter, setNoteCounter] = useState(0)

    useEffect(async () => {
        const res = await be.readAllTags()
        if (res.err) {
            setErrorLoadingTags(res.err)
            showError(res.err)
        } else {
            const allTags = res.data
            setAllTags(allTags)
            const allTagsMap = {}
            for (const tag of allTags) {
                allTagsMap[tag.id] = tag
            }
            setAllTagsMap(allTagsMap)
        }
    }, [])

    async function createNote() {
        const closeProgressIndicator = showMessageWithProgress({text: 'Saving new note...'})
        const res = await be.createNote({text: text, tagIds})
        closeProgressIndicator()
        if (res.err) {
            await showError(res.err)
        } else {
            setText('')
            setNoteCounter(c => c + 1)
            document.getElementById(TEXT_ID)?.focus()
        }
    }
    
    function renderPageContent() {
        if (errorLoadingTags) {
            return RE.Fragment({},
                `An error occurred during loading of tags: [${errorLoadingTags.code}] - ${errorLoadingTags.msg}`,
            )
        } else if (hasNoValue(allTags) || hasNoValue(allTagsMap)) {
            return 'Loading tags...'
        } else {
            return re(EditNoteForm,{
                key: noteCounter,
                allTags, allTagsMap,
                text,textOnChange: newValue => setText(newValue),textId: TEXT_ID,
                tagIds,tagIdsOnChange:newValue => setTagIds(newValue),
                onSave: createNote, saveDisabled: !text.length
            })
        }
    }

    return RE.Fragment({},
        renderPageContent(),
        renderMessagePopup()
    )
}
