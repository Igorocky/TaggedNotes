"use strict";

function useNoteHistory({noteId, tabIndex}) {
    const {renderMessagePopup, showError} = useMessagePopup()

    const [history, setHistory] = useState(null)
    const [historyRequested, setHistoryRequested] = useState(false)
    const [errorLoadingHistory, setErrorLoadingHistory] = useState(null)

    async function loadHistory() {
        setHistoryRequested(true)
        const res = await be.readNoteHistory({noteId: noteId})
        if (res.err) {
            setErrorLoadingHistory(res.err)
            showError(res.err)
        } else {
            setHistory(res.data)
        }
    }

    function timestampToStr(timestamp) {
        const timeStr = new Date(timestamp).toString()
        const idx = timeStr.indexOf(' (')
        return timeStr.substring(0,idx)
    }

    function renderNoteText(text) {
        if (text.indexOf('\n') >= 0) {
            return multilineTextToTable({text})
        } else {
            return text
        }
    }

    function renderHistoryTable() {
        const rows = []
        history.dataHistory.forEach(dataRec => {
            const dataRecBackgroundColor = '#ffffff'
            rows.push(RE.tr({key:dataRec.verId+'-1', style:{backgroundColor: dataRecBackgroundColor}},
                RE.td({colSpan:3},timestampToStr(dataRec.timestamp))
            ))
            rows.push(RE.tr({key:dataRec.verId+'-2', style:{backgroundColor: dataRecBackgroundColor}},
                RE.td({colSpan:3},renderNoteText(dataRec.text))
            ))
        })

        return RE.table({className:'table-with-collapsed-borders gray'}, RE.tbody({},
            rows
        ))
    }

    function renderHistory() {
        if (hasValue(history)) {
            return RE.Container.col.top.left({},{},
                RE.span({style:{fontWeight: 'bold'}}, 'History:'),
                renderHistoryTable()
            )
        } else if (hasValue(errorLoadingHistory)) {
            return RE.Fragment({},
                `An error occurred during loading of history: [${errorLoadingHistory.code}] - ${errorLoadingHistory.msg}`,
            )
        } else {
            return buttonWithCircularProgress({
                onClick: loadHistory,
                text: 'Load history',
                showProgress: historyRequested,
                buttonAttrs: {tabIndex}
            })
        }
    }

    return {
        renderHistory: () => RE.Fragment({},
            renderHistory(),
            renderMessagePopup()
        )
    }
}