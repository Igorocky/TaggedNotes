"use strict";

const AddNewNoteCmp = ({allTags, allTagsMap, onNoteCreated, renderMessagePopup, showError, showMessageWithProgress}) => {

    const [newText, setNewText] = useState('')
    const [selectedTags, setSelectedTags] = useState([])

    function createNewNoteIsAllowed() {
        return newText.trim().length > 0
    }

    async function createNewNote() {
        if (createNewNoteIsAllowed()) {
            const closeProgressIndicatorSave = showMessageWithProgress({text: 'Saving new note...'})
            const resSave = await be.createNote({text: newText, tagIds: selectedTags.map(t=>t.id)})
            closeProgressIndicatorSave()
            if (resSave.err) {
                await showError(resSave.err)
            } else {
                setNewText('')
                const newNoteId = resSave.data
                onNoteCreated(newNoteId)
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
            onTagRemoved: tag => setSelectedTags(prev => prev.filter(t => t.id !== tag.id)),
            onTagSelected: tag => setSelectedTags(prev => [...prev, tag]),
            label: 'Tags',
            color:'primary',
        })
    }


    return RE.Fragment({},
        renderAddNoteControls(),
        renderTagSelector(),
        renderMessagePopup(),
    )
}
