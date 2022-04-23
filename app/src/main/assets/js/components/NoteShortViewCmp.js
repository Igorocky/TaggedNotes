"use strict";

const NoteShortViewCmp = ({note, idx, isFocused, onDelete, onEdit}) => {

    function renderNoteText(text) {
        if (text.indexOf('\n') >= 0) {
            return multilineTextToTable({text})
        } else {
            return text
        }
    }

    function renderNote() {
        const noteElem = RE.Fragment({},
            RE.div({style:{borderBottom:'solid 1px lightgrey', padding:'3px'}},
                RE.span({style:{fontWeight:'bold'}},`${idx+1}. `),
                renderListOfTags({tags: note.tags})
            ),
            RE.div({style:{borderBottom:'solid 1px lightgrey', padding:'3px'}},
                RE.span({style:{}},renderNoteText(note.text))
            ),
        )
        if (isFocused) {
            return RE.Container.col.top.left({}, {},
                RE.Container.row.left.center({}, {},
                    iconButton({iconName: 'delete', onClick: onDelete}),
                    iconButton({iconName: 'edit', onClick: onEdit}),
                ),
                noteElem
            )
        } else {
            return noteElem
        }
    }

    return renderNote()
}
