"use strict";

const EditNoteCmp = ({allTags, allTagsMap, note, onCancelled, onSaved, onDeleted}) => {
    const {renderMessagePopup, showError, confirmAction, showMessageWithProgress} = useMessagePopup()

    const [text, setText] = useState(note.text)
    const [tagIds, setTagIds] = useState(note.tagIds)
    const initialTagIds = note.tagIds
    const createdAt = useMemo(() => new Date(note.createdAt), [note.id])

    const {renderHistory} = useNoteHistory({noteId:note.id})

    function isModified({initialValue, currValue}) {
        if (Array.isArray(initialValue)) {
            return !arraysAreEqualAsSets(initialValue, currValue)
        } else {
            return initialValue !== currValue
        }
    }

    const textIsModified = isModified({initialValue: note.text, currValue:text})
    const tagsIsModified = isModified({initialValue:initialTagIds, currValue:tagIds})
    const dataIsModified = textIsModified || tagsIsModified

    async function doCancel() {
        if (!dataIsModified || dataIsModified && await confirmAction({text: 'Your changes will be lost.'})) {
            onCancelled()
        }
    }

    async function doSave() {
        const closeProgressIndicator = showMessageWithProgress({text: 'Saving changes...'})
        const res = await be.updateNote({
            noteId: note.id,
            tagIds: tagsIsModified?tagIds:null,
            text: textIsModified?text:null,
        })
        closeProgressIndicator()
        if (res.err) {
            await showError(res.err)
        } else {
            onSaved()
        }
    }

    async function doDelete() {
        if (await confirmAction({text: 'Delete this note?', okBtnColor: 'secondary'})) {
            const closeProgressIndicator = showMessageWithProgress({text: 'Deleting...'})
            const res = await be.deleteNote({noteId:note.id})
            closeProgressIndicator()
            if (res.err) {
                await showError(res.err)
            } else {
                onDeleted()
            }
        }
    }

    function getBgColor(isModified) {
        if (isModified) {
            return '#ffffcc'
        }
    }

    return RE.Fragment({},
        re(EditNoteForm,{
            allTags, allTagsMap,

            text,
            textOnChange: newValue => setText(newValue),
            textBgColor: getBgColor(textIsModified),

            tagIds,
            tagIdsOnChange: newValue => setTagIds(newValue),
            tagIdsBgColor: getBgColor(tagsIsModified),

            createdAt,

            onSave: doSave,
            saveDisabled: !dataIsModified || (text.trim().length === 0),

            onCancel: doCancel,
            onDelete: doDelete
        }),
        renderHistory(),
        renderMessagePopup()
    )
}
