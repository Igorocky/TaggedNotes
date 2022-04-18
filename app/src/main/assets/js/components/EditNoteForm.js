"use strict";

const EditNoteForm = ({
                                    allTags, allTagsMap,
                                    text,textOnChange,textBgColor,textId,
                                    tagIds,tagIdsOnChange,tagIdsBgColor,
                                    createdAt,
                                    onSave, saveDisabled,
                                    onCancel, cancelDisabled,
                                    onDelete,
                                }) => {

    function renderSaveButton() {
        return iconButton({
            iconName: 'save',
            disabled: saveDisabled,
            iconStyle:{color:saveDisabled?'lightgrey':'blue'},
            onClick: onSave
        })
    }

    function renderCancelButton() {
        if (onCancel) {
            return iconButton({
                iconName: 'close',
                disabled: cancelDisabled,
                iconStyle:{color:'black'},
                onClick: onCancel
            })
        }
    }

    function renderDeleteButton() {
        if (onDelete) {
            return iconButton({
                iconName: 'delete',
                iconStyle:{color:'red'},
                onClick: onDelete
            })
        }
    }

    function renderButtons() {
        return RE.Container.row.left.center({}, {},
            renderDeleteButton(),
            renderCancelButton(),
            renderSaveButton()
        )
    }

    const margin = '30px'

    return RE.Container.col.top.left({}, {},
        renderButtons(),
        RE.If(hasValue(text), () => RE.Container.row.left.center({style: {marginTop:margin}},{},
            textField({
                id: text,
                value: text,
                label: 'Note',
                variant: 'outlined',
                autoFocus: true,
                multiline: true,
                maxRows: 10,
                size: 'small',
                style: {backgroundColor:textBgColor},
                inputProps: {cols:27},
                onChange: event => {
                    const newText = event.nativeEvent.target.value
                    if (newText != text) {
                        textOnChange(newText)
                    }
                },
                onKeyUp: event => {
                    if (event.ctrlKey && !event.shiftKey && event.keyCode === ENTER_KEY_CODE) {
                        if (!saveDisabled) {
                            onSave?.()
                        }
                    } else if (event.nativeEvent.keyCode == ESCAPE_KEY_CODE) {
                        onCancel?.()
                    }
                },
            }),
        )),
        RE.If(hasValue(tagIds), () => RE.Paper({style: {marginTop:margin}},re(TagSelector,{
            allTags,
            selectedTags: tagIds.map(tid => allTagsMap[tid]),
            onTagRemoved:tag=>{
                tagIdsOnChange(tagIds.filter(tid=>tid!==tag.id))
            },
            onTagSelected:tag=>{
                tagIdsOnChange([...tagIds,tag.id])
            },
            label: 'Tags',
            color:'primary',
            selectedTagsBgColor:tagIdsBgColor
        }))),
        RE.If(hasValue(createdAt), () => RE.div({style: {marginTop:margin}}, `Created: ${createdAt}`)),
        renderButtons(),
    )
}
