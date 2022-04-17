'use strict';

function createFeBeBridgeForUiTestMode() {
    const mockedBeFunctions = {}

    function okResponse(data) {
        return {
            data,
            mapData: mapper => okResponse(mapper(data))
        }
    }

    function errResponse(errCode, msg) {
        return {
            err: {code:errCode,msg},
            mapData() {
                return this
            }
        }
    }

    const NOTES = []
    const TAGS = []
    const OBJS_TO_TAGS = []

    mockedBeFunctions.createTag = ({name}) => {
        if (TAGS.find(t=>t.name==name)) {
            return errResponse(36,`'${name}' tag already exists.`)
        } else {
            const id = (TAGS.map(t=>t.id).max()??0)+1
            const newTag = {id,name,createdAt:new Date().getTime()}
            TAGS.push(newTag)
            return okResponse(id)
        }
    }

    mockedBeFunctions.readAllTags = () => {
        return okResponse(TAGS.map(t => ({...t})))
    }

    mockedBeFunctions.getObjToTagMapping = () => {
        const res = {}
        OBJS_TO_TAGS.forEach(({objId,tagId}) => {
            if (res[objId] === undefined) {
                res[objId] = []
            }
            res[objId].push(tagId)
        })
        return okResponse(res)
    }

    mockedBeFunctions.updateTag = ({tagId,name}) => {
        const tagsToUpdate = TAGS.filter(t=>t.id === tagId)
        let updatedTag = null
        for (const tag of tagsToUpdate) {
            if (TAGS.find(t=> t.name === name && t.id !== tagId)) {
                return errResponse(1, `'${name}' tag already exists.`)
            } else {
                tag.name = name
                updatedTag = tag
            }
        }
        if (updatedTag == null) {
            return errResponse(1, `updatedTag == null`)
        }
        return okResponse(updatedTag)
    }

    mockedBeFunctions.deleteTag = ({tagId}) => {
        // return errResponse(2,'Error while deleting a tag.')
        if (OBJS_TO_TAGS.find(otg => tagId===otg.tagId)) {
            return errResponse(222,'This tag is used by a note.')
        } else {
            removeIf(TAGS,t => t.id===tagId)
            return okResponse()
        }
    }

    mockedBeFunctions.createNote = ({text, tagIds}) => {
        text = text?.trim()??''
        if (text === '') {
            return errResponse(1, 'textToTranslate is empty')
        } else {
            const id = (NOTES.map(n=>n.id).max()??0)+1
            const newNote = {
                id,
                createdAt: new Date().getTime(),
                text
            }
            NOTES.push(newNote)
            for (let tagId of tagIds) {
                OBJS_TO_TAGS.push({objId:id,tagId})
            }
            return okResponse(id)
        }
    }

    mockedBeFunctions.readNoteById = ({noteId}) => {
        const note = NOTES.find(n=>n.id==noteId)
        if (hasNoValue(note)) {
            return errResponse(9, 'Error getting a note by id.')
        } else {
            return okResponse({
                id: note.id,
                createdAt: note.createdAt,
                tagIds: OBJS_TO_TAGS.filter(p => p.objId === noteId).map(p=>p.tagId),
                text: note.text,
            })
        }
    }

    mockedBeFunctions.readNotesByFilter = (filter) => {
        // return okResponse([])
        return okResponse({notes:NOTES.map(n => mockedBeFunctions.readNoteById({noteId: n.id}).data)})
    }

    mockedBeFunctions.readNoteHistory = ({noteId}) => {
        const history = {"dataHistory":[{"noteId":1,"text":"* could I see your passport, please?\n" +
                    "* sure, here it is.\n" +
                    "* how much baggage do you have?\n" +
                    "* just one carry-on.","timestamp":1641560590172,"verId":-1
            },{"noteId":1,"text":"B","timestamp":1641558790172,"verId":2},
                {"noteId":1,"text":"A","timestamp":1641557950172,"verId":1}],"isHistoryFull":true}
        return okResponse(history)
    }

    mockedBeFunctions.updateNote = ({noteId, text, tagIds}) => {
        const note = NOTES.find(n=>n.id===noteId)
        if (hasNoValue(note)) {
            return errResponse(7, 'Error getting note by id.')
        } else {
            note.text = text??note.text
            return okResponse(true)
        }
    }


    mockedBeFunctions.deleteNote = ({noteId}) => {
        removeIf(NOTES, n=>n.id===noteId)
        return okResponse(true)
    }

    mockedBeFunctions.doBackup = () => {
        return okResponse({name:'new-backup-' + new Date(), size:4335})
    }

    mockedBeFunctions.listAvailableBackups = () => {
        return okResponse([
            {name:'backup-1', size:1122},
            {name:'backup-2', size:456456},
            {name:'backup-3', size:998877},
        ])
    }

    mockedBeFunctions.restoreFromBackup = ({backupName}) => {
        return okResponse(`The database was restored from the backup ${backupName}`)
    }

    mockedBeFunctions.deleteBackup = async ({backupName}) => {
        return await mockedBeFunctions.listAvailableBackups()
    }

    mockedBeFunctions.shareBackup = ({backupName}) => {
        return okResponse({})
    }

    mockedBeFunctions.startHttpServer = () => {
        return okResponse({})
    }

    mockedBeFunctions.getSharedFileInfo = () => {
        return okResponse({name: 'shared-file-name-111', uri: 'file://shared-file-name-111', type: 'BACKUP'})
    }

    mockedBeFunctions.closeSharedFileReceiver = () => {
        return okResponse({})
    }

    mockedBeFunctions.saveSharedFile = () => {
        return okResponse(12)
    }

    const HTTP_SERVER_STATE = {
        isRunning: false,
        url: "URL",
        settings: {
            keyStoreName: '---keyStoreName---',
            keyStorePassword: '---keyStorePassword---',
            keyAlias: '---keyAlias---',
            privateKeyPassword: '---privateKeyPassword---',
            port: 8443,
            serverPassword: '---serverPassword---',
        }
    }
    mockedBeFunctions.getHttpServerState = () => {
        return okResponse({...HTTP_SERVER_STATE})
    }
    mockedBeFunctions.saveHttpServerSettings = (settings) => {
        HTTP_SERVER_STATE.settings = settings
        return mockedBeFunctions.getHttpServerState()
    }
    mockedBeFunctions.startHttpServer = () => {
        HTTP_SERVER_STATE.isRunning = true
        return mockedBeFunctions.getHttpServerState()
    }
    mockedBeFunctions.stopHttpServer = () => {
        HTTP_SERVER_STATE.isRunning = false
        return mockedBeFunctions.getHttpServerState()
    }

    function fillDbWithMockData() {
        const numOfTags = 50
        ints(1,numOfTags)
            .map(i=>randomAlphaNumString({minLength:3,maxLength:5}))
            .forEach(s=>mockedBeFunctions.createTag({name:s}))

        function getRandomTagIds() {
            let numOfTags = randomInt(1,5)
            let result = []
            while (result.length < numOfTags) {
                let newId = TAGS[randomInt(0,TAGS.length-1)].id
                if (!result.includes(newId)) {
                    result.push(newId)
                }
            }
            return result
        }

        const numOfNotes = 1000
        ints(1,numOfNotes)
            .map(i=>randomSentence({wordsMinCnt:1, wordsMaxCnt:10, wordMinLength:1, wordMaxLength:7}))
            .forEach(s=> {
                // if (randomInt(0,1) === 1) {
                //     s = s.replaceAll(' ', '\n')
                // }
                mockedBeFunctions.createNote({
                    text: s,
                    tagIds: getRandomTagIds(),
                })
            })
    }
    fillDbWithMockData()

    function createBeFunction(funcName, delay) {
        const beFunc = mockedBeFunctions[funcName]
        if (hasNoValue(beFunc)) {
            console.error(`mocked backend function is not defined - ${funcName}`)
        }
        return function (arg) {
            const curTime = new Date().toTimeString().substring(0,8)
            console.log(`${curTime} BE.${funcName}`, hasValue(arg) ? arg : 'no args')
            return new Promise((resolve,reject) => {
                const doResolve = () => resolve(beFunc(arg))
                if (hasValue(delay)) {
                    setTimeout(doResolve, delay)
                } else {
                    doResolve()
                }
            })
        }
    }

    return {
        createBeFunction,
        feBeBridgeState: {mockedBeFunctions},
    }
}

const mockFeBeBridge = createFeBeBridgeForUiTestMode()

const createBeFunction = mockFeBeBridge.createBeFunction