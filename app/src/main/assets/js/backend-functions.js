'use strict';

const be = {
    doBackup: createBeFunction('doBackup'),
    listAvailableBackups: createBeFunction('listAvailableBackups'),
    restoreFromBackup: createBeFunction('restoreFromBackup'),
    deleteBackup: createBeFunction('deleteBackup'),
    shareBackup: createBeFunction('shareBackup'),

    getHttpServerState: createBeFunction('getHttpServerState'),
    saveHttpServerSettings: createBeFunction('saveHttpServerSettings'),
    startHttpServer: createBeFunction('startHttpServer'),
    stopHttpServer: createBeFunction('stopHttpServer'),

    getSharedFileInfo: createBeFunction('getSharedFileInfo'),
    closeSharedFileReceiver: createBeFunction('closeSharedFileReceiver'),
    saveSharedFile: createBeFunction('saveSharedFile'),

    createTag: createBeFunction('createTag'),
    readAllTags: createBeFunction('readAllTags'),
    getObjToTagMapping: createBeFunction('getObjToTagMapping'),
    updateTag: createBeFunction('updateTag'),
    deleteTag: createBeFunction('deleteTag'),
    createNote: createBeFunction('createNote'),
    readNoteById: createBeFunction('readNoteById'),
    readNotesByFilter: createBeFunction('readNotesByFilter'),
    readNoteHistory: createBeFunction('readNoteHistory'),
    updateNote: createBeFunction('updateNote'),
    deleteNote: createBeFunction('deleteNote'),
}

