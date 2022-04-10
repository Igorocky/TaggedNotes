"use strict";

const SharedFileReceiver = ({}) => {
    const {renderMessagePopup, showError, showMessage, showMessageWithProgress} = useMessagePopup()

    const BACKUP = 'BACKUP'
    const KEYSTORE = 'KEYSTORE'

    const [fileName, setFileName] = useState(null)
    const [fileUri, setFileUri] = useState(null)
    const [fileType, setFileType] = useState(BACKUP)

    useEffect(async () => {
        const res = await be.getSharedFileInfo()
        if (res.err) {
            await showError(res.err)
            closeActivity()
        } else {
            setFileName(res.data.name)
            setFileUri(res.data.uri)
            setFileType(res.data.type)
        }
    }, [])

    function closeActivity() {
        be.closeSharedFileReceiver()
    }

    async function saveFile() {
        const closeProgressWindow = showMessageWithProgress({text: `Saving ${fileType.toLowerCase()} '${fileName}'....`})
        const res = await be.saveSharedFile({fileUri, fileType, fileName})
        closeProgressWindow()
        if (res.err) {
            await showError(res.err)
        } else {
            await showMessage({text:`${fileType.toLowerCase()} '${fileName}' was saved.`})
        }
        closeActivity()
    }

    if (hasValue(fileName)) {
        return RE.Container.col.top.left({},{style:{margin:'10px'}},
            `Saving the file '${fileName}'`,
            RE.FormControl({},
                RE.FormLabel({},'File type:'),
                RE.RadioGroup(
                    {
                        value: fileType,
                        onChange: event => {
                            const newValue = event.nativeEvent.target.value
                            setFileType(newValue)
                        }
                    },
                    RE.FormControlLabel({label: BACKUP, value: BACKUP, disabled:fileType!=BACKUP, control:RE.Radio({})}),
                    RE.FormControlLabel({label: KEYSTORE, value: KEYSTORE, disabled:fileType!=KEYSTORE, control:RE.Radio({})}),
                )
            ),
            RE.Container.row.left.center({},{style:{marginRight:'50px'}},
                RE.Button({variant:'contained', color:'primary', onClick: saveFile}, 'Save'),
                RE.Button({variant:'text', color:'default', onClick: closeActivity}, 'Cancel'),
            ),
            renderMessagePopup()
        )
    } else {
        return "Waiting for the file..."
    }
}