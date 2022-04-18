"use strict";

const MessagePopupState = {
    stateId: 'stateId',
    title: 'title',
    text: 'text',
    contentRenderer: 'contentRenderer',
    cancelBtnText: 'cancelBtnText',
    onCancel: 'onCancel',
    okBtnText: 'okBtnText',
    okBtnColor: 'okBtnColor',
    onOk: 'onOk',
    showProgress: 'showProgress',
    additionalActionsRenderer: 'additionalActionsRenderer',

    new(init) {
        return createObj(init)
    }
}

function useMessagePopup() {

    const s = MessagePopupState
    const [states, setStates] = useState([])
    const [stateCnt, setStateCnt] = useState(0)

    function renderOkButton({st}) {
        if (hasValue(st[s.okBtnText])) {
            return RE.div({style:{position: 'relative'}},
                RE.Button(
                    {
                        variant: 'contained',
                        color: st[s.okBtnColor] ?? 'primary',
                        disabled: st[s.showProgress],
                        onClick: st[s.onOk]
                    },
                    st[s.okBtnText]
                ),
                st[s.showProgress]?RE.CircularProgress({size:24, style: inButtonCircularProgressStyle}):null
            )
        }
    }

    function renderCancelButton({st}) {
        if (hasValue(st[s.cancelBtnText])) {
            return RE.Button({onClick: st[s.onCancel]}, st[s.cancelBtnText])
        }
    }

    function renderActionButtons({st}) {
        return RE.Fragment({},
            st[s.additionalActionsRenderer]?.(),
            renderCancelButton({st}),
            renderOkButton({st})
        )
    }

    function renderMessagePopupForState({st}) {
        return RE.Dialog({open:true, key: st[s.stateId]},
            RE.If(hasValue(st[s.title]), () => RE.DialogTitle({}, st[s.title])),
            RE.If(hasValue(st[s.contentRenderer]), () => RE.DialogContent({}, st[s.contentRenderer]())),
            RE.If(hasValue(st[s.text]), () => RE.DialogContent({}, RE.Typography({}, st[s.text]))),
            RE.DialogActions({}, renderActionButtons({st}))
        )
    }

    function renderMessagePopup() {
        return states.map(st => renderMessagePopupForState({st}))
    }

    function closeDialog({stateId}) {
        setStates(prev => prev.filter(st => st[s.stateId] !== stateId))
    }

    async function confirmAction({text, cancelBtnText = 'cancel', okBtnText = 'ok', okBtnColor}) {
        return new Promise(resolve => {
            const stateId = stateCnt
            setStateCnt(prev => prev+1)
            setStates(prev => [
                ...prev,
                s.new({
                    [s.stateId]: stateId,
                    [s.title]: null,
                    [s.contentRenderer]: null,
                    [s.text]: text,
                    [s.cancelBtnText]: cancelBtnText,
                    [s.onCancel]: () => {
                        closeDialog({stateId})
                        resolve(false)
                    },
                    [s.okBtnText]: okBtnText,
                    [s.okBtnColor]: okBtnColor,
                    [s.onOk]: () => {
                        closeDialog({stateId})
                        resolve(true)
                    },
                    [s.showProgress]: false,
                    [s.additionalActionsRenderer]: null,
                })
            ])
        })
    }

    async function showMessage({title, text, okBtnText = 'ok', additionalActionsRenderer = null, hideOkBtn = false}) {
        return new Promise(resolve => {
            const stateId = stateCnt
            setStateCnt(prev => prev+1)
            setStates(prev => [
                ...prev,
                s.new({
                    [s.stateId]: stateId,
                    [s.title]: null,
                    [s.contentRenderer]: null,
                    [s.text]: text,
                    [s.cancelBtnText]: null,
                    [s.onCancel]: null,
                    [s.okBtnText]: okBtnText,
                    [s.okBtnColor]: null,
                    [s.onOk]: () => {
                        closeDialog({stateId})
                        resolve(true)
                    },
                    [s.showProgress]: false,
                    [s.additionalActionsRenderer]: additionalActionsRenderer,
                })
            ])
        })
    }

    async function showDialog({title, contentRenderer, cancelBtnText, cancelBtnResult = null, okBtnText = null, okBtnColor = null, okBtnResult = null}) {
        return new Promise(resolve => {
            const stateId = stateCnt
            setStateCnt(prev => prev+1)
            setStates(prev => [
                ...prev,
                s.new({
                    [s.stateId]: stateId,
                    [s.title]: title,
                    [s.contentRenderer]: () => {
                        return contentRenderer(dialogResult => {
                            closeDialog({stateId})
                            resolve(dialogResult)
                        })
                    },
                    [s.text]: null,
                    [s.cancelBtnText]: cancelBtnText,
                    [s.onCancel]: () => {
                        closeDialog({stateId})
                        resolve(cancelBtnResult)
                    },
                    [s.okBtnText]: okBtnText,
                    [s.okBtnColor]: okBtnColor,
                    [s.onOk]: () => {
                        closeDialog({stateId})
                        resolve(okBtnResult)
                    },
                    [s.showProgress]: false,
                    [s.additionalActionsRenderer]: null,
                })
            ])
        })
    }

    function showMessageWithProgress({text, okBtnText = 'ok'}) {
        const stateId = stateCnt
        setStateCnt(prev => prev+1)
        setStates(prev => [
            ...prev,
            s.new({
                [s.stateId]: stateId,
                [s.title]: null,
                [s.contentRenderer]: null,
                [s.text]: text,
                [s.cancelBtnText]: null,
                [s.onCancel]: null,
                [s.okBtnText]: okBtnText,
                [s.okBtnColor]: null,
                [s.onOk]: () => null,
                [s.showProgress]: true,
                [s.additionalActionsRenderer]: null,
            })
        ])
        return () => closeDialog({stateId})
    }

    function showError({code, msg}) {
        return showMessage({text: `Error [${code}] - ${msg}`})
    }

    const funcRef = useRef(null)
    funcRef.current = {renderMessagePopup, confirmAction, showMessage, showError, showMessageWithProgress, showDialog}
    function proxyThroughFuncRef(funcRef) {
        const res = {}
        for (const func in funcRef.current) {
            res[func] = args => funcRef.current[func](args)
        }
        return res
    }
    return proxyThroughFuncRef(funcRef)
}
